-- Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
CREATE POLICY "Users can read their own profile"
ON profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION on_auth_user_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle conflict if the row already exists
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', 'New User'))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION on_auth_user_created();


-- Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN (
        'account_created', 'login', 'logout', 
        'stock_sheet_created', 'stock_sheet_updated', 'design_image_replaced', 
        'stock_sheet_archived', 'stock_sheet_restored', 
        'pdf_previewed', 'pdf_downloaded'
    )),
    entity_type TEXT,
    entity_id UUID,
    summary TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Drop indexes if they exist to prevent errors, or use IF NOT EXISTS
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id_created_at ON activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own activity logs" ON activity_logs;
CREATE POLICY "Users can read their own activity logs"
ON activity_logs FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Activity Logs are append-only. Only system/RPC can insert. Direct insertions from clients are blocked.
-- So we DO NOT create an INSERT policy for authenticated users on activity_logs.
-- (Or we could, but RPCs running with SECURITY INVOKER bypass RLS? No, SECURITY INVOKER respects RLS. 
-- Wait, if RPC is SECURITY INVOKER, it runs as the user. If the user doesn't have INSERT permissions, the RPC will fail unless we grant it.
-- Let's create a narrow INSERT policy that only allows inserting for their own user_id, but the prompt says:
-- "Users must not be able to: directly insert arbitrary logs through normal table access".
-- To solve this, we can revoke INSERT on activity_logs from authenticated, and make the RPCs SECURITY DEFINER for the logging part?
-- The prompt says: "Revoke direct update and delete access... Use database triggers, existing transactional RPCs or narrow database functions for important activity creation."
-- Let's grant INSERT to authenticated but strictly enforce policies, OR use SECURITY DEFINER for logging functions.
-- Let's use a SECURITY DEFINER function to insert logs safely.

CREATE OR REPLACE FUNCTION log_user_activity(
    p_action_type TEXT,
    p_summary TEXT,
    p_entity_type TEXT DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_log_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    INSERT INTO activity_logs (user_id, action_type, summary, entity_type, entity_id, metadata)
    VALUES (v_user_id, p_action_type, p_summary, p_entity_type, p_entity_id, p_metadata)
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;

-- Revoke all permissions on this RPC and grant only to authenticated
REVOKE ALL ON FUNCTION log_user_activity FROM PUBLIC;
REVOKE ALL ON FUNCTION log_user_activity FROM anon;
GRANT EXECUTE ON FUNCTION log_user_activity TO authenticated;


-- Modify create_stock_sheet_transaction to log activity
CREATE OR REPLACE FUNCTION create_stock_sheet_transaction(
  sheet_id UUID,
  d_name TEXT,
  garment_c_name TEXT,
  garment_c_hex TEXT,
  img_path TEXT,
  q_s INTEGER,
  q_m INTEGER,
  q_l INTEGER,
  q_xl INTEGER,
  q_xxl INTEGER
)
RETURNS TABLE (id UUID, reference_number TEXT)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id UUID;
  v_total INTEGER;
  v_reference TEXT;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF q_s < 0 OR q_m < 0 OR q_l < 0 OR q_xl < 0 OR q_xxl < 0 THEN
    RAISE EXCEPTION 'Quantities cannot be negative';
  END IF;

  v_total := q_s + q_m + q_l + q_xl + q_xxl;
  IF v_total <= 0 THEN
    RAISE EXCEPTION 'Total quantity must be greater than 0';
  END IF;

  INSERT INTO stock_sheets (
    id,
    user_id,
    design_name,
    garment_colour_name,
    garment_colour_hex,
    design_image_path,
    status
  ) VALUES (
    sheet_id,
    v_user_id,
    d_name,
    garment_c_name,
    garment_c_hex,
    img_path,
    'ACTIVE'
  ) RETURNING stock_sheets.reference_number INTO v_reference;

  INSERT INTO stock_sheet_quantities (stock_sheet_id, size, quantity) VALUES
    (sheet_id, 'S', q_s),
    (sheet_id, 'M', q_m),
    (sheet_id, 'L', q_l),
    (sheet_id, 'XL', q_xl),
    (sheet_id, 'XXL', q_xxl);

  -- Log activity
  PERFORM log_user_activity(
      'stock_sheet_created',
      'Created stock sheet ' || v_reference,
      'stock_sheets',
      sheet_id,
      jsonb_build_object('reference_number', v_reference, 'design_name', d_name)
  );

  RETURN QUERY SELECT sheet_id, v_reference;
END;
$$;


-- Modify update_stock_sheet_transaction to log activity
CREATE OR REPLACE FUNCTION update_stock_sheet_transaction(
  p_sheet_id UUID,
  p_d_name TEXT,
  p_garment_c_name TEXT,
  p_garment_c_hex TEXT,
  p_img_path TEXT,
  p_q_s INTEGER,
  p_q_m INTEGER,
  p_q_l INTEGER,
  p_q_xl INTEGER,
  p_q_xxl INTEGER
)
RETURNS TABLE (id UUID, reference_number TEXT)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id UUID;
  v_total INTEGER;
  v_reference TEXT;
  v_status TEXT;
  v_sheet_owner UUID;
  v_old_img_path TEXT;
  v_action_type TEXT;
  v_summary TEXT;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT stock_sheets.user_id, stock_sheets.status, stock_sheets.reference_number, stock_sheets.design_image_path
  INTO v_sheet_owner, v_status, v_reference, v_old_img_path
  FROM stock_sheets
  WHERE stock_sheets.id = p_sheet_id;

  IF v_sheet_owner IS NULL THEN
    RAISE EXCEPTION 'Stock sheet not found';
  END IF;

  IF v_sheet_owner != v_user_id THEN
    RAISE EXCEPTION 'Not authorized to edit this stock sheet';
  END IF;

  IF v_status = 'ARCHIVED' THEN
    RAISE EXCEPTION 'Archived stock sheets cannot be edited';
  END IF;

  IF p_q_s < 0 OR p_q_m < 0 OR p_q_l < 0 OR p_q_xl < 0 OR p_q_xxl < 0 THEN
    RAISE EXCEPTION 'Quantities cannot be negative';
  END IF;

  v_total := p_q_s + p_q_m + p_q_l + p_q_xl + p_q_xxl;
  IF v_total <= 0 THEN
    RAISE EXCEPTION 'Total quantity must be greater than 0';
  END IF;

  UPDATE stock_sheets SET
    design_name = p_d_name,
    garment_colour_name = p_garment_c_name,
    garment_colour_hex = p_garment_c_hex,
    design_image_path = COALESCE(p_img_path, design_image_path)
  WHERE stock_sheets.id = p_sheet_id;

  UPDATE stock_sheet_quantities SET quantity = p_q_s WHERE stock_sheet_id = p_sheet_id AND size = 'S';
  UPDATE stock_sheet_quantities SET quantity = p_q_m WHERE stock_sheet_id = p_sheet_id AND size = 'M';
  UPDATE stock_sheet_quantities SET quantity = p_q_l WHERE stock_sheet_id = p_sheet_id AND size = 'L';
  UPDATE stock_sheet_quantities SET quantity = p_q_xl WHERE stock_sheet_id = p_sheet_id AND size = 'XL';
  UPDATE stock_sheet_quantities SET quantity = p_q_xxl WHERE stock_sheet_id = p_sheet_id AND size = 'XXL';

  -- Log activity
  IF p_img_path IS NOT NULL AND p_img_path != v_old_img_path THEN
      v_action_type := 'design_image_replaced';
      v_summary := 'Replaced design image for ' || v_reference;
  ELSE
      v_action_type := 'stock_sheet_updated';
      v_summary := 'Updated stock sheet ' || v_reference;
  END IF;

  PERFORM log_user_activity(
      v_action_type,
      v_summary,
      'stock_sheets',
      p_sheet_id,
      jsonb_build_object('reference_number', v_reference, 'design_name', p_d_name, 'image_replaced', (p_img_path IS NOT NULL AND p_img_path != v_old_img_path))
  );

  RETURN QUERY SELECT p_sheet_id, v_reference;
END;
$$;


-- Modify set_stock_sheet_archive_state to log activity
CREATE OR REPLACE FUNCTION set_stock_sheet_archive_state(
  p_stock_sheet_id UUID,
  p_archive BOOLEAN
)
RETURNS TABLE (id UUID, reference_number TEXT, status TEXT, archived_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id UUID;
  v_sheet_owner UUID;
  v_current_status TEXT;
  v_new_status TEXT;
  v_new_archived_at TIMESTAMPTZ;
  v_reference TEXT;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT stock_sheets.user_id, stock_sheets.status, stock_sheets.reference_number
  INTO v_sheet_owner, v_current_status, v_reference
  FROM stock_sheets
  WHERE stock_sheets.id = p_stock_sheet_id;

  IF v_sheet_owner IS NULL THEN
    RAISE EXCEPTION 'Stock sheet not found';
  END IF;

  IF v_sheet_owner != v_user_id THEN
    RAISE EXCEPTION 'Not authorized to modify this stock sheet';
  END IF;

  IF p_archive THEN
    v_new_status := 'ARCHIVED';
    v_new_archived_at := NOW();
  ELSE
    v_new_status := 'ACTIVE';
    v_new_archived_at := NULL;
  END IF;

  -- Only perform update if the state is actually changing to avoid unnecessary row locks and triggers
  IF v_current_status != v_new_status THEN
    UPDATE stock_sheets SET
      status = v_new_status,
      archived_at = v_new_archived_at
    WHERE stock_sheets.id = p_stock_sheet_id;

    -- Log activity
    PERFORM log_user_activity(
        CASE WHEN p_archive THEN 'stock_sheet_archived' ELSE 'stock_sheet_restored' END,
        CASE WHEN p_archive THEN 'Archived stock sheet ' ELSE 'Restored stock sheet ' END || v_reference,
        'stock_sheets',
        p_stock_sheet_id,
        jsonb_build_object('reference_number', v_reference)
    );
  END IF;

  RETURN QUERY SELECT 
    stock_sheets.id, 
    stock_sheets.reference_number, 
    stock_sheets.status, 
    stock_sheets.archived_at 
  FROM stock_sheets 
  WHERE stock_sheets.id = p_stock_sheet_id;
END;
$$;

NOTIFY pgrst, 'reload schema';
