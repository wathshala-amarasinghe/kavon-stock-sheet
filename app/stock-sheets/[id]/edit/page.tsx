import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { EditStockSheetForm } from "@/components/dashboard/EditStockSheetForm"; // TS refresh
import { z } from "zod";
import { StockSheetQuantity } from "@/types";

export const instant = false;

export default async function EditStockSheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  // Validate UUID
  const uuidResult = z.string().uuid().safeParse(id);
  if (!uuidResult.success) {
    notFound();
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the current record
  const { data, error } = await supabase
    .from("stock_sheets")
    .select(`
      *,
      stock_sheet_quantities(size, quantity)
    `)
    .eq("id", id)
    .single();

  if (error || !data || data.status === 'ARCHIVED') {
    notFound();
  }

  const quantities = data.stock_sheet_quantities as StockSheetQuantity[];
  const quantitiesMap = quantities.reduce((acc, q) => {
    acc[q.size] = q.quantity;
    return acc;
  }, {} as Record<string, number>);

  // Fetch signed URL for the current image
  let signedUrl = null;
  if (data.design_image_path) {
    const { data: urlData } = await supabase.storage
      .from("kavon-designs")
      .createSignedUrl(data.design_image_path, 3600);
    signedUrl = urlData?.signedUrl || null;
  }

  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <Sidebar userEmail={user.email || ""} />
      
      <main className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <div className="p-4 md:p-8 flex-1 max-w-5xl w-full mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-black uppercase tracking-widest text-white mb-1">
              Edit Stock Sheet
            </h1>
            <p className="text-gray-400 text-sm">
              Update design details, quantities, or replace the image.
            </p>
          </div>

          <EditStockSheetForm 
            stockSheetId={id}
            initialData={data}
            quantitiesMap={quantitiesMap}
            currentImageUrl={signedUrl}
          />
        </div>
      </main>
    </div>
  );
}
