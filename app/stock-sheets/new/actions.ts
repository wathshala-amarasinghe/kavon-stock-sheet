"use server";

import { createClient } from "@/lib/supabase/server";
import { stockSheetSchema } from "@/lib/validations/stock-sheet";

export async function prepareUploadsAction(fileExtensions: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Generate UUIDs
  const stockSheetId = crypto.randomUUID();
  const uploads = [];

  for (const ext of fileExtensions) {
    const imageUuid = crypto.randomUUID();
    const imagePath = `${user.id}/${stockSheetId}/${imageUuid}.${ext}`;

    // Create signed upload URL
    const { data, error } = await supabase.storage
      .from("kavon-designs")
      .createSignedUploadUrl(imagePath);

    if (error || !data) {
      return { error: "Failed to create upload URL: " + (error?.message || "Unknown error") };
    }

    uploads.push({
      signedUrl: data.signedUrl,
      token: data.token,
      path: imagePath,
    });
  }

  return {
    uploads,
    stockSheetId,
  };
}

export async function finalizeStockSheetAction(stockSheetId: string, imagePaths: string[], formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const rawData = {
    design_name: formData.get("design_name"),
    garment_colour_name: formData.get("garment_colour_name"),
    garment_colour_hex: formData.get("garment_colour_hex"),
    q_s: formData.get("q_s"),
    q_m: formData.get("q_m"),
    q_l: formData.get("q_l"),
    q_xl: formData.get("q_xl"),
    q_xxl: formData.get("q_xxl"),
  };

  const parsed = stockSheetSchema.safeParse(rawData);

  if (!parsed.success) {
    // If validation fails, cleanup images
    if (imagePaths.length > 0) {
      await supabase.storage.from("kavon-designs").remove(imagePaths);
    }
    return { error: "Invalid form data" };
  }

  const data = parsed.data;
  const hexValue = data.garment_colour_hex ? data.garment_colour_hex.toUpperCase() : null;

  // Call the transactional RPC
  const { data: rpcData, error: rpcError } = await supabase.rpc("create_stock_sheet_transaction", {
    sheet_id: stockSheetId,
    d_name: data.design_name,
    garment_c_name: data.garment_colour_name,
    garment_c_hex: hexValue,
    img_paths: imagePaths,
    q_s: data.q_s,
    q_m: data.q_m,
    q_l: data.q_l,
    q_xl: data.q_xl,
    q_xxl: data.q_xxl
  });

  if (rpcError) {
    // If DB save fails, clean up the uploaded images
    if (imagePaths.length > 0) {
      await supabase.storage.from("kavon-designs").remove(imagePaths);
    }
    return { error: "Failed to save stock sheet: " + rpcError.message };
  }

  return { success: true, reference_number: rpcData?.[0]?.reference_number };
}
