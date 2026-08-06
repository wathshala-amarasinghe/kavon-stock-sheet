"use server";

import { createClient } from "@/lib/supabase/server";
import { stockSheetSchema } from "@/lib/validations/stock-sheet";
import { z } from "zod";
import { revalidatePath } from "next/cache";

export async function prepareUpdateUploadAction(stockSheetId: string, fileExtension: string) {
  const uuidResult = z.string().uuid().safeParse(stockSheetId);
  if (!uuidResult.success) return { error: "Invalid ID" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Confirm ownership
  const { data: existing, error: fetchErr } = await supabase
    .from("stock_sheets")
    .select("user_id, status")
    .eq("id", stockSheetId)
    .single();

  if (fetchErr || !existing || existing.user_id !== user.id) {
    return { error: "Not authorized" };
  }
  if (existing.status === 'ARCHIVED') {
    return { error: "Archived sheets cannot be edited" };
  }

  const imageUuid = crypto.randomUUID();
  const imagePath = `${user.id}/${stockSheetId}/${imageUuid}.${fileExtension}`;

  const { data, error } = await supabase.storage
    .from("kavon-designs")
    .createSignedUploadUrl(imagePath);

  if (error || !data) {
    return { error: "Failed to create upload URL" };
  }

  return {
    signedUrl: data.signedUrl,
    token: data.token,
    path: imagePath,
  };
}

export async function updateStockSheetAction(stockSheetId: string, newImagePath: string | null, formData: FormData) {
  const uuidResult = z.string().uuid().safeParse(stockSheetId);
  if (!uuidResult.success) return { error: "Invalid ID" };

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
    if (newImagePath) {
      await supabase.storage.from("kavon-designs").remove([newImagePath]);
    }
    return { error: "Invalid form data" };
  }

  const data = parsed.data;
  const hexValue = data.garment_colour_hex ? data.garment_colour_hex.toUpperCase() : null;

  // Retrieve the old image path BEFORE updating, so we can delete it later
  let oldImagePath = null;
  if (newImagePath) {
    const { data: existing } = await supabase
      .from("stock_sheets")
      .select("design_image_path")
      .eq("id", stockSheetId)
      .single();
    if (existing) oldImagePath = existing.design_image_path;
  }

  // Perform transaction
  const { data: rpcData, error: rpcError } = await supabase.rpc("update_stock_sheet_transaction", {
    p_sheet_id: stockSheetId,
    p_d_name: data.design_name,
    p_garment_c_name: data.garment_colour_name,
    p_garment_c_hex: hexValue,
    p_img_path: newImagePath, // Null means don't update
    p_q_s: data.q_s,
    p_q_m: data.q_m,
    p_q_l: data.q_l,
    p_q_xl: data.q_xl,
    p_q_xxl: data.q_xxl
  });

  if (rpcError) {
    if (newImagePath) {
      // Transaction failed, cleanup newly uploaded image
      await supabase.storage.from("kavon-designs").remove([newImagePath]);
    }
    return { error: "Failed to update stock sheet: " + rpcError.message };
  }

  // Update succeeded. If there is a new image, delete the old one.
  if (newImagePath && oldImagePath) {
    const { error: delError } = await supabase.storage.from("kavon-designs").remove([oldImagePath]);
    if (delError) {
      console.warn("Cleanup warning: Failed to delete old image", oldImagePath);
      // We do not fail the request here, because the DB is already updated successfully.
    }
  }

  revalidatePath("/");
  revalidatePath(`/stock-sheets/${stockSheetId}`);
  
  return { success: true, reference_number: rpcData?.[0]?.reference_number };
}
