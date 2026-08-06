"use client";

import { useState } from "react";
import { Search, PackageX } from "lucide-react";
import { StockSheet } from "@/types";
import { StockSheetCard } from "./StockSheetCard";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

interface DashboardClientProps {
  initialSheets: StockSheet[];
  currentStatus: string;
}

export function DashboardClient({ initialSheets, currentStatus }: DashboardClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  // If the database is completely empty (no sheets created ever)
  if (initialSheets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-[#111111] border border-gray-800 rounded-lg">
        <PackageX size={48} className="text-gray-600 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">No Stock Sheets Found</h3>
        <p className="text-gray-400 text-sm">Create your first stock sheet to get started.</p>
      </div>
    );
  }

  // Filter sheets based on search query (status is already filtered by server if not ALL)
  // Wait, if server returns 'all', they are all here. The server already filtered them! 
  // We only need to filter by search text locally.
  const filteredSheets = initialSheets.filter((sheet) => {
    
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      sheet.reference_number.toLowerCase().includes(searchLower) ||
      sheet.design_name.toLowerCase().includes(searchLower) ||
      sheet.garment_colour_name.toLowerCase().includes(searchLower);
      
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-[#111111] p-4 rounded-lg border border-gray-800">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <Input
            type="text"
            placeholder="Search by ref, design, or colour..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-black border-gray-700 text-white focus-visible:ring-[#E60000]"
          />
        </div>
        
        <div className="flex w-full sm:w-auto bg-black p-1 rounded-md border border-gray-800">
          {(["ACTIVE", "ARCHIVED", "ALL"] as const).map((status) => (
            <button
              key={status}
              onClick={() => router.push(`/?status=${status.toLowerCase()}`)}
              className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold uppercase tracking-wider rounded transition-colors ${
                currentStatus.toLowerCase() === status.toLowerCase()
                  ? "bg-[#E60000] text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>
      
      {/* Counts Header */}
      <div className="text-gray-400 text-sm font-medium tracking-widest uppercase mb-4">
        Showing {filteredSheets.length} {currentStatus === "all" ? "Total" : currentStatus} sheet{filteredSheets.length !== 1 ? 's' : ''}
      </div>

      {/* Results or Empty State */}
      {filteredSheets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredSheets.map((sheet) => (
            <StockSheetCard key={sheet.id} sheet={sheet} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 bg-[#111111] border border-gray-800 rounded-lg">
          <Search size={48} className="text-gray-600 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Results Found</h3>
          <p className="text-gray-400 text-sm">Try adjusting your search or filters.</p>
        </div>
      )}
    </div>
  );
}
