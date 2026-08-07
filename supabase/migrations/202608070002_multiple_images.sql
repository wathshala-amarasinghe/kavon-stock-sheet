-- Migration to support multiple images per stock sheet

-- 1. Add the new column
ALTER TABLE stock_sheets ADD COLUMN IF NOT EXISTS design_image_paths TEXT[] DEFAULT '{}';

-- 2. Migrate existing data
UPDATE stock_sheets 
SET design_image_paths = ARRAY[design_image_path] 
WHERE design_image_path IS NOT NULL;

-- 3. Drop the old column
ALTER TABLE stock_sheets DROP COLUMN IF EXISTS design_image_path;

-- 4. Update create_stock_sheet_transaction
CREATE OR REPLACE FUNCTION create_stock_sheet_transaction(
  sheet_id UUID,
  d_name TEXT,
  garment_c_name TEXT,
  garment_c_hex TEXT,
  img_paths TEXT[],
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
    design_image_paths,
    status
  ) VALUES (
    sheet_id,
    v_user_id,
    d_name,
    garment_c_name,
    garment_c_hex,
    COALESCE(img_paths, '{}'),
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

-- 5. Update update_stock_sheet_transaction
CREATE OR REPLACE FUNCTION update_stock_sheet_transaction(
  p_sheet_id UUID,
  p_d_name TEXT,
  p_garment_c_name TEXT,
  p_garment_c_hex TEXT,
  p_img_paths TEXT[],
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
  v_old_img_paths TEXT[];
  v_action_type TEXT;
  v_summary TEXT;
  v_images_changed BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT stock_sheets.user_id, stock_sheets.status, stock_sheets.reference_number, stock_sheets.design_image_paths
  INTO v_sheet_owner, v_status, v_reference, v_old_img_paths
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
  
  v_images_changed := (p_img_paths IS NOT NULL AND p_img_paths != v_old_img_paths);

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
  IF v_images_changed THEN
      v_action_type := 'design_image_replaced';
      v_summary := 'Updated design images for ' || v_reference;
  ELSE
      v_action_type := 'stock_sheet_updated';
      v_summary := 'Updated stock sheet ' || v_reference;
  END IF;

  PERFORM log_user_activity(
      v_action_type,
      v_summary,
      'stock_sheets',
      p_sheet_id,
      jsonb_build_object('reference_number', v_reference, 'design_name', p_d_name, 'images_changed', v_images_changed)
  );

  RETURN QUERY SELECT p_sheet_id, v_reference;
END;
$$;

NOTIFY pgrst, 'reload schema';
