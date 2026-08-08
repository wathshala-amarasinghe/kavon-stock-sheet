export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import { z } from "zod";

export default async function PDFPreviewPage({
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

  // Verify ownership to safely render the preview wrapper
  const { data, error } = await supabase
    .from("stock_sheets")
    .select("id, reference_number, user_id")
    .eq("id", id)
    .single();

  if (error || !data || data.user_id !== user.id) {
    notFound();
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#0A0A0A]">
      <Sidebar userEmail={user.email || ""} />
      
      <main className="flex-1 lg:pl-64 flex flex-col min-w-0 h-screen overflow-hidden">
        <div className="p-4 md:p-8 flex flex-col h-full max-w-6xl w-full mx-auto">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 shrink-0">
            <div>
              <Link href={`/stock-sheets/${id}`} className="inline-flex items-center text-gray-400 hover:text-white mb-4 text-sm font-medium transition-colors">
                <ArrowLeft size={16} className="mr-2" />
                Back to Stock Sheet
              </Link>
              <h1 className="text-2xl font-black uppercase tracking-widest text-white flex items-center gap-3">
                PDF Preview
                <span className="text-gray-500 font-mono text-sm border border-gray-700 px-2 py-1 rounded">
                  {data.reference_number}
                </span>
              </h1>
            </div>
            
            <div className="flex gap-3 w-full sm:w-auto">
              <a href={`/api/stock-sheets/${id}/pdf`} target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-none">
                <Button variant="outline" className="w-full bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white">
                  <ExternalLink size={16} className="mr-2" />
                  Open in New Tab
                </Button>
              </a>
              <a href={`/api/stock-sheets/${id}/pdf?download=1`} className="flex-1 sm:flex-none">
                <Button className="w-full bg-[#E60000] hover:bg-[#CC0000] text-white tracking-widest uppercase font-bold">
                  <Download size={16} className="mr-2" />
                  Download PDF
                </Button>
              </a>
            </div>
          </div>

          <div className="flex-1 bg-black border border-gray-800 rounded-lg overflow-hidden relative shadow-2xl">
            <iframe 
              src={`/api/stock-sheets/${id}/pdf`} 
              className="w-full h-full border-0 absolute inset-0"
              title={`PDF Preview for ${data.reference_number}`}
            />
          </div>

        </div>
      </main>
    </div>
  );
}
