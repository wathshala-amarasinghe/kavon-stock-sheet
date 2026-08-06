import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { StockSheet, StockSheetQuantity } from "@/types";
import { PlusCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const instant = false;

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch stock sheets with their quantities
  const { data: sheetsData, error: sheetsError } = await supabase
    .from("stock_sheets")
    .select(`
      *,
      stock_sheet_quantities (
        size,
        quantity
      )
    `)
    .order("created_at", { ascending: false });

  if (sheetsError) {
    return (
      <div className="flex h-screen w-full bg-[#0A0A0A]">
        <Sidebar userEmail={user.email || ""} />
        <main className="flex-1 lg:pl-64 flex items-center justify-center p-8">
          <div className="bg-[#111111] border border-red-900/50 p-8 rounded-xl text-center max-w-md">
            <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Error Loading Data</h2>
            <p className="text-gray-400 mb-6 text-sm">{sheetsError.message}</p>
            <form action="">
              <Button type="submit" className="bg-[#E60000] hover:bg-[#CC0000] text-white">
                Retry
              </Button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  // Process data: calculate totals, map quantities, fetch signed URLs
  const processedSheets: StockSheet[] = await Promise.all(
    (sheetsData || []).map(async (sheet: StockSheet) => {
      
      const quantities = sheet.stock_sheet_quantities as StockSheetQuantity[];
      
      // Calculate total securely on server
      const totalQuantity = quantities.reduce((acc, curr) => acc + curr.quantity, 0);
      
      // Create easy-to-read map for the UI
      const quantitiesMap = quantities.reduce((acc, curr) => {
        acc[curr.size] = curr.quantity;
        return acc;
      }, {} as Record<string, number>);

      let signedUrl = null;
      if (sheet.design_image_path) {
        const { data: urlData } = await supabase.storage
          .from("kavon-designs")
          .createSignedUrl(sheet.design_image_path, 3600); // 1 hour expiry
        
        signedUrl = urlData?.signedUrl || null;
      }

      return {
        ...sheet,
        total_quantity: totalQuantity,
        quantities_map: quantitiesMap,
        signed_image_url: signedUrl,
      };
    })
  );

  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <Sidebar userEmail={user.email || ""} />
      
      <main className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <div className="p-4 md:p-8 flex-1">
          {/* Header Area */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-black uppercase tracking-widest text-white mb-1">
                KAVON Stock Sheets
              </h1>
              <p className="text-gray-400 text-sm">
                Manage and track your design inventory securely.
              </p>
            </div>
            
            <Button className="bg-[#E60000] hover:bg-[#CC0000] text-white font-bold tracking-wider uppercase" disabled>
              <PlusCircle size={18} className="mr-2" />
              Create New Stock Sheet
            </Button>
          </div>

          <DashboardClient initialSheets={processedSheets} />
        </div>
      </main>
    </div>
  );
}
