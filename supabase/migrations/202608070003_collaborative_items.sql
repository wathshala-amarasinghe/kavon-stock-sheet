DROP POLICY IF EXISTS "Users can view their own stock sheets" ON stock_sheets;
DROP POLICY IF EXISTS "Users can insert their own stock sheets" ON stock_sheets;
DROP POLICY IF EXISTS "Users can update their own stock sheets" ON stock_sheets;

CREATE POLICY "All authenticated users can view stock sheets"
ON stock_sheets FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "All authenticated users can insert stock sheets"
ON stock_sheets FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "All authenticated users can update stock sheets"
ON stock_sheets FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own stock sheet quantities" ON stock_sheet_quantities;
DROP POLICY IF EXISTS "Users can insert their own stock sheet quantities" ON stock_sheet_quantities;
DROP POLICY IF EXISTS "Users can update their own stock sheet quantities" ON stock_sheet_quantities;
DROP POLICY IF EXISTS "Users can delete their own stock sheet quantities" ON stock_sheet_quantities;

CREATE POLICY "All authenticated users can view stock sheet quantities"
ON stock_sheet_quantities FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "All authenticated users can insert stock sheet quantities"
ON stock_sheet_quantities FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "All authenticated users can update stock sheet quantities"
ON stock_sheet_quantities FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "All authenticated users can delete stock sheet quantities"
ON stock_sheet_quantities FOR DELETE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can view their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

CREATE POLICY "All authenticated users can view images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'kavon-designs');

CREATE POLICY "All authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'kavon-designs');

CREATE POLICY "All authenticated users can update images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'kavon-designs')
WITH CHECK (bucket_id = 'kavon-designs');

CREATE POLICY "All authenticated users can delete images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'kavon-designs');

CREATE OR REPLACE FUNCTION update_stock_sheet_transaction(
  p_sheet_id UUID,
  p_d_name TEXT,
  p_garment_c_name TEXT,
  p_garment_c_hex TEXT,
  p_img_paths TEXT[],
  p_new_uploaded_paths TEXT[],
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
  v_action_type TEXT;
  v_summary TEXT;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT stock_sheets.status, stock_sheets.reference_number
  INTO v_status, v_reference
  FROM stock_sheets
  WHERE stock_sheets.id = p_sheet_id;

  IF v_reference IS NULL THEN
    RAISE EXCEPTION 'Stock sheet not found';
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
    design_image_paths = COALESCE(p_img_paths, design_image_paths)
  WHERE stock_sheets.id = p_sheet_id;

  UPDATE stock_sheet_quantities SET quantity = p_q_s WHERE stock_sheet_id = p_sheet_id AND size = 'S';
  UPDATE stock_sheet_quantities SET quantity = p_q_m WHERE stock_sheet_id = p_sheet_id AND size = 'M';
  UPDATE stock_sheet_quantities SET quantity = p_q_l WHERE stock_sheet_id = p_sheet_id AND size = 'L';
  UPDATE stock_sheet_quantities SET quantity = p_q_xl WHERE stock_sheet_id = p_sheet_id AND size = 'XL';
  UPDATE stock_sheet_quantities SET quantity = p_q_xxl WHERE stock_sheet_id = p_sheet_id AND size = 'XXL';

  -- Log activity
  IF array_length(p_new_uploaded_paths, 1) > 0 THEN
      v_action_type := 'design_image_replaced';
      v_summary := 'Replaced/Added design image(s) for ' || v_reference;
  ELSE
      v_action_type := 'stock_sheet_updated';
      v_summary := 'Updated stock sheet ' || v_reference;
  END IF;

  PERFORM log_user_activity(
      v_action_type,
      v_summary,
      'stock_sheets',
      p_sheet_id,
      jsonb_build_object('reference_number', v_reference, 'design_name', p_d_name)
  );

  RETURN QUERY SELECT p_sheet_id, v_reference;
END;
$$;


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
  v_current_status TEXT;
  v_new_status TEXT;
  v_new_archived_at TIMESTAMPTZ;
  v_reference TEXT;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT stock_sheets.status, stock_sheets.reference_number
  INTO v_current_status, v_reference
  FROM stock_sheets
  WHERE stock_sheets.id = p_stock_sheet_id;

  IF v_reference IS NULL THEN
    RAISE EXCEPTION 'Stock sheet not found';
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
