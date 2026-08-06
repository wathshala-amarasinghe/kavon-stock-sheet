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

  RETURN QUERY SELECT sheet_id, v_reference;
END;
$$;
