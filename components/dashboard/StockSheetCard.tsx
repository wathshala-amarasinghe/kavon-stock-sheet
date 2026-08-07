// next/image removed — Supabase signed URLs bypass its proxy via plain img
import Link from "next/link";
import { Eye, Edit2, ImageIcon, FileText, Archive, RefreshCcw } from "lucide-react";
import { StockSheet } from "@/types";
import { Button } from "@/components/ui/button";

interface StockSheetCardProps {
  sheet: StockSheet;
}

export function StockSheetCard({ sheet }: StockSheetCardProps) {
  const SIZES = ["S", "M", "L", "XL", "XXL"];

  return (
    <div className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden flex flex-col hover:border-gray-700 transition-colors">
      {/* Top Banner / Image Area */}
      <div className="relative h-48 bg-[#1A1A1A] border-b border-gray-800 flex items-center justify-center overflow-hidden">
        {sheet.signed_image_urls && sheet.signed_image_urls.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sheet.signed_image_urls[0]}
            alt={sheet.design_name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-600">
            <ImageIcon size={48} className="mb-2 opacity-50" />
            <span className="text-xs uppercase tracking-widest font-medium">No Image</span>
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <span className={`text-[10px] font-bold px-2 py-1 uppercase tracking-wider rounded ${
            sheet.status === 'ACTIVE' 
              ? 'bg-green-900/50 text-green-400 border border-green-800' 
              : 'bg-gray-800 text-gray-400 border border-gray-700'
          }`}>
            {sheet.status}
          </span>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        {/* Header */}
        <div className="mb-4">
          <div className="text-xs font-mono text-[#E60000] mb-1">{sheet.reference_number}</div>
          <h3 className="text-lg font-bold text-white uppercase truncate" title={sheet.design_name}>
            {sheet.design_name}
          </h3>
          
          <div className="flex items-center mt-2 text-sm text-gray-400">
            {sheet.garment_colour_hex && (
              <div 
                className="w-4 h-4 rounded-full mr-2 border border-gray-700"
                style={{ backgroundColor: sheet.garment_colour_hex }}
                title={sheet.garment_colour_hex}
              />
            )}
            <span className="truncate">{sheet.garment_colour_name}</span>
          </div>
        </div>

        {/* Quantities Table */}
        <div className="bg-[#0A0A0A] rounded-md p-3 mb-4 border border-gray-800">
          <div className="grid grid-cols-5 gap-1 mb-2">
            {SIZES.map(size => (
              <div key={size} className="text-center text-[10px] font-bold text-gray-500 uppercase">
                {size}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-1">
            {SIZES.map(size => (
              <div key={size} className="text-center text-sm font-medium text-white">
                {sheet.quantities_map?.[size] || 0}
              </div>
            ))}
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-800 flex justify-between items-center">
            <span className="text-xs uppercase tracking-wider text-gray-500 font-bold">Total</span>
            <span className="text-lg font-black text-[#E60000]">{sheet.total_quantity || 0}</span>
          </div>
        </div>

        <div className="mt-auto">
          {/* Dates */}
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-4 flex justify-between">
            <span>Created {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(sheet.created_at))}</span>
          </div>

          {/* Actions */}
          <div className={`grid ${sheet.status === 'ACTIVE' ? 'grid-cols-4' : 'grid-cols-3'} gap-2`}>
            <Link href={`/stock-sheets/${sheet.id}`} className="flex-1">
              <Button variant="outline" className="w-full bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white px-0" title="View Details">
                <Eye size={16} />
              </Button>
            </Link>
            <Link href={`/stock-sheets/${sheet.id}/pdf`} className="flex-1">
              <Button variant="outline" className="w-full bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white px-0" title="PDF Preview">
                <FileText size={16} />
              </Button>
            </Link>
            {sheet.status === 'ACTIVE' && (
              <Link href={`/stock-sheets/${sheet.id}/edit`} className="flex-1">
                <Button variant="outline" className="w-full bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white px-0" title="Edit Sheet">
                  <Edit2 size={16} />
                </Button>
              </Link>
            )}
            
            <Link href={`/stock-sheets/${sheet.id}`} className="flex-1">
              <Button variant="outline" className={`w-full bg-transparent border-gray-700 px-0 ${sheet.status === 'ACTIVE' ? 'text-gray-300 hover:text-[#E60000] hover:bg-red-950' : 'text-green-500 hover:bg-green-950'}`} title={sheet.status === 'ACTIVE' ? "Archive" : "Restore"}>
                {sheet.status === 'ACTIVE' ? <Archive size={16} /> : <RefreshCcw size={16} />}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
