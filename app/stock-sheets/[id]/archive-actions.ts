"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function setArchiveStateAction(id: string, archive: boolean) {
  try {
    const uuidResult = z.string().uuid().safeParse(id);
    if (!uuidResult.success) {
      return { error: "Invalid stock sheet ID format" };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Authentication required" };
    }

    const { data, error } = await supabase.rpc("set_stock_sheet_archive_state", {
      p_stock_sheet_id: id,
      p_archive: archive
    });

    if (error) {
      console.error("Archive state update failed:", error);
      return { error: "Failed to update stock sheet state" };
    }

    revalidatePath("/");
    revalidatePath(`/stock-sheets/${id}`);
    revalidatePath(`/stock-sheets/${id}/edit`);
    revalidatePath(`/stock-sheets/${id}/pdf`);
    
    return { success: true, data };
  } catch (err) {
    console.error("Unexpected archive error:", err);
    return { error: "An unexpected error occurred" };
  }
}
