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
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT stock_sheets.user_id, stock_sheets.status, stock_sheets.reference_number
  INTO v_sheet_owner, v_status, v_reference
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

  RETURN QUERY SELECT p_sheet_id, v_reference;
END;
$$;
