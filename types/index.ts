export interface StockSheetQuantity {
  size: "S" | "M" | "L" | "XL" | "XXL";
  quantity: number;
}

export interface StockSheet {
  id: string;
  reference_number: string;
  design_name: string;
  garment_colour_name: string;
  garment_colour_hex: string | null;
  design_image_paths: string[];
  status: "ACTIVE" | "ARCHIVED";
  created_at: string;
  updated_at: string;
  
  // Computed fields added by server
  total_quantity?: number;
  signed_image_urls?: string[];
  quantities_map?: Record<string, number>;
  stock_sheet_quantities?: StockSheetQuantity[];
}
