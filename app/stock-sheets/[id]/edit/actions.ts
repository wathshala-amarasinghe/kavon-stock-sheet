"use server";

import { createClient } from "@/lib/supabase/server";
import { stockSheetSchema } from "@/lib/validations/stock-sheet";
import { z } from "zod";
import { revalidatePath } from "next/cache";

export async function prepareUpdateUploadsAction(stockSheetId: string, fileExtensions: string[]) {
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

  const uploads = [];
  
  for (const ext of fileExtensions) {
    const imageUuid = crypto.randomUUID();
    const imagePath = `${user.id}/${stockSheetId}/${imageUuid}.${ext}`;

    const { data, error } = await supabase.storage
      .from("kavon-designs")
      .createSignedUploadUrl(imagePath);

    if (error || !data) {
      return { error: "Failed to create upload URL" };
    }

    uploads.push({
      signedUrl: data.signedUrl,
      token: data.token,
      path: imagePath,
    });
  }

  return { uploads };
}

export async function updateStockSheetAction(
  stockSheetId: string, 
  finalImagePaths: string[], 
  newlyUploadedPaths: string[], 
  formData: FormData
) {
  const uuidResult = z.string().uuid().safeParse(stockSheetId);
  if (!uuidResult.success) return { error: "Invalid ID" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const rawData = {
    design_name: formData.get("design_name"),
    garment_colours: JSON.parse(formData.get("garment_colours") as string || "[]"),
    q_s: formData.get("q_s"),
    q_m: formData.get("q_m"),
    q_l: formData.get("q_l"),
    q_xl: formData.get("q_xl"),
    q_xxl: formData.get("q_xxl"),
  };

  const parsed = stockSheetSchema.safeParse(rawData);

  if (!parsed.success) {
    if (newlyUploadedPaths.length > 0) {
      await supabase.storage.from("kavon-designs").remove(newlyUploadedPaths);
    }
    return { error: "Invalid form data" };
  }

  const data = parsed.data;

  // Format hex to uppercase if provided
  const formattedColours = data.garment_colours.map(c => ({
    name: c.name,
    hex: c.hex ? c.hex.toUpperCase() : null
  }));

  // Retrieve the old image paths BEFORE updating, so we can delete removed ones later
  const { data: existing } = await supabase
    .from("stock_sheets")
    .select("design_image_paths")
    .eq("id", stockSheetId)
    .single();
    
  const oldPaths = existing?.design_image_paths || [];
  const pathsToDelete = oldPaths.filter((p: string) => !finalImagePaths.includes(p));

  // Perform transaction
  const { data: rpcData, error: rpcError } = await supabase.rpc("update_stock_sheet_transaction", {
    p_sheet_id: stockSheetId,
    p_d_name: data.design_name,
    p_garment_colours: formattedColours,
    p_img_paths: finalImagePaths,
    p_q_s: data.q_s,
    p_q_m: data.q_m,
    p_q_l: data.q_l,
    p_q_xl: data.q_xl,
    p_q_xxl: data.q_xxl
  });

  if (rpcError) {
    if (newlyUploadedPaths.length > 0) {
      // Transaction failed, cleanup newly uploaded images
      await supabase.storage.from("kavon-designs").remove(newlyUploadedPaths);
    }
    return { error: "Failed to update stock sheet: " + rpcError.message };
  }

  // Update succeeded. Delete the removed old images.
  if (pathsToDelete.length > 0) {
    const { error: delError } = await supabase.storage.from("kavon-designs").remove(pathsToDelete);
    if (delError) {
      console.warn("Cleanup warning: Failed to delete old images", pathsToDelete);
    }
  }

  revalidatePath("/");
  revalidatePath(`/stock-sheets/${stockSheetId}`);
  
  return { success: true, reference_number: rpcData?.[0]?.reference_number };
}
