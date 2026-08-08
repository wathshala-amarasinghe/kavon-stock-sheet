import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, AlertCircle, Calendar } from "lucide-react";
import { z } from "zod";
import { StockSheetQuantity } from "@/types";
import { ArchiveRestoreActions } from "@/components/dashboard/ArchiveRestoreActions";

export default async function StockSheetDetailsPage({
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

  const { data, error } = await supabase
    .from("stock_sheets")
    .select(`
      *,
      stock_sheet_quantities(size, quantity)
    `)
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  // Calculate totals and format quantities
  const quantities = data.stock_sheet_quantities as StockSheetQuantity[];
  const quantitiesMap = quantities.reduce((acc, q) => {
    acc[q.size] = q.quantity;
    return acc;
  }, {} as Record<string, number>);

  const total = quantities.reduce((acc, q) => acc + q.quantity, 0);

  // Fetch signed URLs for all images
  let signedUrls: string[] = [];
  if (data.design_image_paths && data.design_image_paths.length > 0) {
    const { data: urlsData } = await supabase.storage
      .from("kavon-designs")
      .createSignedUrls(data.design_image_paths, 3600);
      
    if (urlsData) {
      signedUrls = urlsData
        .filter(d => !d.error && d.signedUrl)
        .map(d => d.signedUrl as string);
    }
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#0A0A0A]">
      <Sidebar userEmail={user.email || ""} />
      
      <main className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <div className="p-4 md:p-8 flex-1 max-w-6xl w-full mx-auto">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <Link href="/" className="inline-flex items-center text-gray-400 hover:text-white mb-4 text-sm font-medium transition-colors">
                <ArrowLeft size={16} className="mr-2" />
                Back to Stock Sheets
              </Link>
              <h1 className="text-3xl font-black uppercase tracking-widest text-white mb-2 flex items-center flex-wrap gap-3">
                {data.design_name}
                <span className={`text-xs px-2 py-1 rounded border font-bold tracking-widest uppercase ${
                  data.status === 'ACTIVE' 
                    ? 'bg-[#E60000]/10 text-[#E60000] border-[#E60000]/20' 
                    : 'bg-gray-800 text-gray-400 border-gray-700'
                }`}>
                  {data.status}
                </span>
              </h1>
              <p className="text-gray-400 font-mono tracking-widest">{data.reference_number}</p>
            </div>
            
            <div className="flex flex-wrap gap-3 w-full sm:w-auto">
              <Link href={`/stock-sheets/${id}/pdf`} className="flex-1 sm:flex-none">
                <Button variant="outline" className="w-full bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white">
                  Preview PDF
                </Button>
              </Link>
              <a href={`/api/stock-sheets/${id}/pdf?download=1`} className="flex-1 sm:flex-none">
                <Button variant="outline" className="w-full bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white">
                  Download PDF
                </Button>
              </a>
              
              {data.status === 'ACTIVE' && (
                <Link href={`/stock-sheets/${id}/edit`} className="flex-1 sm:flex-none">
                  <Button className="w-full bg-[#E60000] hover:bg-[#CC0000] text-white tracking-widest uppercase font-bold px-6">
                    <Edit size={16} className="mr-2" />
                    Edit
                  </Button>
                </Link>
              )}

              <ArchiveRestoreActions 
                id={id} 
                status={data.status} 
                referenceNumber={data.reference_number} 
                designName={data.design_name} 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left side details */}
            <div className="lg:col-span-2 space-y-8">
              
              <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
                <h2 className="text-gray-500 uppercase tracking-widest text-xs font-bold mb-4 border-b border-gray-800 pb-2">Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-gray-500 text-sm mb-1">Design Name</p>
                    <p className="text-white font-medium">{data.design_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm mb-1">Garment Colours</p>
                    <div className="flex flex-wrap gap-2">
                      {data.garment_colours?.map((c: { name: string, hex: string | null }, i: number) => (
                        <div key={i} className="flex items-center gap-2 bg-[#1A1A1A] px-2.5 py-1.5 rounded-md border border-gray-800">
                          {c.hex && (
                            <div 
                              className="w-4 h-4 rounded border border-gray-700 shadow-inner shrink-0" 
                              style={{ backgroundColor: c.hex }} 
                              title={c.hex}
                            />
                          )}
                          <p className="text-white font-medium text-sm">{c.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm mb-1 flex items-center gap-2"><Calendar size={14}/> Created</p>
                    <p className="text-white font-medium">{new Date(data.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm mb-1 flex items-center gap-2"><Calendar size={14}/> Last Updated</p>
                    <p className="text-white font-medium">{new Date(data.updated_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
                <h2 className="text-gray-500 uppercase tracking-widest text-xs font-bold mb-4 border-b border-gray-800 pb-2">Quantities</h2>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-6">
                  {(['S', 'M', 'L', 'XL', 'XXL']).map((size) => (
                    <div key={size} className="bg-black border border-gray-800 rounded p-3 text-center">
                      <p className="text-gray-500 text-xs mb-1 font-bold">{size}</p>
                      <p className="text-white font-black text-xl">{quantitiesMap[size] || 0}</p>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between items-center bg-[#E60000]/10 border border-[#E60000]/20 p-4 rounded-lg">
                  <span className="text-white uppercase tracking-widest text-sm font-bold">Total Quantity</span>
                  <span className="text-3xl font-black text-[#E60000]">{total}</span>
                </div>
              </div>

            </div>

            {/* Right side image */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-[#111111] border border-gray-800 rounded-lg p-6 h-full min-h-[400px] flex flex-col">
                <h2 className="text-gray-500 uppercase tracking-widest text-xs font-bold mb-4 border-b border-gray-800 pb-2">Design Preview</h2>
                
                <div className="flex-1 flex flex-col gap-4 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                  {signedUrls.length > 0 ? (
                    signedUrls.map((url, index) => (
                      <div key={index} className="bg-black border border-gray-800 rounded-lg overflow-hidden flex items-center justify-center relative min-h-[300px]">
                        <img 
                          src={url} 
                          alt={`${data.design_name} ${index + 1}`}
                          className="w-full h-full object-contain absolute inset-0" 
                        />
                      </div>
                    ))
                  ) : (
                    <div className="flex-1 bg-black border border-gray-800 rounded-lg flex flex-col items-center justify-center text-gray-600 p-8 text-center min-h-[300px]">
                      <AlertCircle size={48} className="mb-4 text-gray-700" />
                      <p className="font-medium mb-1 text-gray-400">Image Unavailable</p>
                      <p className="text-sm">No design images found.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
