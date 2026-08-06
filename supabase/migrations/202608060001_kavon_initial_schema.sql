CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS kavon_reference_seq;

CREATE OR REPLACE FUNCTION generate_reference_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'KVN-' || to_char(NOW(), 'YYYY') || '-' || lpad(nextval('kavon_reference_seq')::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE TABLE stock_sheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    reference_number TEXT NOT NULL UNIQUE DEFAULT generate_reference_number(),
    design_name TEXT NOT NULL,
    garment_colour_name TEXT NOT NULL,
    garment_colour_hex TEXT,
    design_image_path TEXT,
    status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ
);

CREATE TRIGGER stock_sheets_updated_at
BEFORE UPDATE ON stock_sheets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE stock_sheet_quantities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_sheet_id UUID NOT NULL REFERENCES stock_sheets(id) ON DELETE CASCADE,
    size TEXT NOT NULL CHECK (size IN ('S', 'M', 'L', 'XL', 'XXL')),
    quantity INTEGER NOT NULL CHECK (quantity >= 0),
    UNIQUE(stock_sheet_id, size)
);

CREATE INDEX idx_stock_sheets_user_id ON stock_sheets(user_id);
CREATE INDEX idx_stock_sheets_created_at ON stock_sheets(created_at);
CREATE INDEX idx_stock_sheets_status ON stock_sheets(status);
CREATE INDEX idx_stock_sheet_quantities_stock_sheet_id ON stock_sheet_quantities(stock_sheet_id);

ALTER TABLE stock_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_sheet_quantities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stock sheets"
ON stock_sheets FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own stock sheets"
ON stock_sheets FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own stock sheets"
ON stock_sheets FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own stock sheet quantities"
ON stock_sheet_quantities FOR SELECT
TO authenticated
USING (
    stock_sheet_id IN (
        SELECT id FROM stock_sheets WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert their own stock sheet quantities"
ON stock_sheet_quantities FOR INSERT
TO authenticated
WITH CHECK (
    stock_sheet_id IN (
        SELECT id FROM stock_sheets WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own stock sheet quantities"
ON stock_sheet_quantities FOR UPDATE
TO authenticated
USING (
    stock_sheet_id IN (
        SELECT id FROM stock_sheets WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    stock_sheet_id IN (
        SELECT id FROM stock_sheets WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete their own stock sheet quantities"
ON stock_sheet_quantities FOR DELETE
TO authenticated
USING (
    stock_sheet_id IN (
        SELECT id FROM stock_sheets WHERE user_id = auth.uid()
    )
);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'kavon-designs',
    'kavon-designs',
    false,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET 
    public = false, 
    file_size_limit = 10485760, 
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

CREATE POLICY "Users can view their own images"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'kavon-designs' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can upload their own images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'kavon-designs' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'kavon-designs' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'kavon-designs' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);
