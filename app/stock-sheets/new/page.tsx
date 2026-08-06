import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { StockSheetForm } from "@/components/dashboard/StockSheetForm";

export const instant = false;

export default async function NewStockSheetPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <Sidebar userEmail={user.email || ""} />
      
      <main className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <div className="p-4 md:p-8 flex-1 max-w-5xl w-full mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-black uppercase tracking-widest text-white mb-1">
              Create Stock Sheet
            </h1>
            <p className="text-gray-400 text-sm">
              Add a new design to your inventory.
            </p>
          </div>

          <StockSheetForm />
        </div>
      </main>
    </div>
  );
}
