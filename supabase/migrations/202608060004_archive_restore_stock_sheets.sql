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
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT stock_sheets.user_id, stock_sheets.status
  INTO v_sheet_owner, v_current_status
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

-- Explicitly secure the function
REVOKE ALL ON FUNCTION set_stock_sheet_archive_state FROM PUBLIC;
REVOKE ALL ON FUNCTION set_stock_sheet_archive_state FROM anon;
GRANT EXECUTE ON FUNCTION set_stock_sheet_archive_state TO authenticated;

-- Notify PostgREST to reload schema cache so the new RPC is available
NOTIFY pgrst, 'reload schema';
