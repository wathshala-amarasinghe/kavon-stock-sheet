"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { UploadCloud, X, Loader2, Image as ImageIcon } from "lucide-react";
import { stockSheetSchema, StockSheetFormValues } from "@/lib/validations/stock-sheet";
import { prepareUpdateUploadAction, updateStockSheetAction } from "@/app/stock-sheets/[id]/edit/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StockSheet } from "@/types";

interface EditStockSheetFormProps {
  stockSheetId: string;
  initialData: StockSheet;
  quantitiesMap: Record<string, number>;
  currentImageUrl: string | null;
}

export function EditStockSheetForm({ stockSheetId, initialData, quantitiesMap, currentImageUrl }: EditStockSheetFormProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<StockSheetFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(stockSheetSchema) as any,
    defaultValues: {
      design_name: initialData.design_name,
      garment_colour_name: initialData.garment_colour_name,
      garment_colour_hex: initialData.garment_colour_hex || "",
      q_s: quantitiesMap["S"] || 0,
      q_m: quantitiesMap["M"] || 0,
      q_l: quantitiesMap["L"] || 0,
      q_xl: quantitiesMap["XL"] || 0,
      q_xxl: quantitiesMap["XXL"] || 0,
    },
  });

  const quantities = watch(["q_s", "q_m", "q_l", "q_xl", "q_xxl"]);
  const totalQuantity = quantities.reduce((acc, curr) => acc + (Number(curr) || 0), 0);
  const hexColor = watch("garment_colour_hex");

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const validateFile = (selectedFile: File) => {
    setFileError(null);
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(selectedFile.type)) {
      setFileError("Invalid file type. Only JPG, PNG, and WebP are allowed.");
      return false;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setFileError("File exceeds 10MB limit.");
      return false;
    }
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && validateFile(selected)) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && validateFile(dropped)) {
      setFile(dropped);
      setPreviewUrl(URL.createObjectURL(dropped));
    }
  };

  const clearFile = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (data: StockSheetFormValues) => {
    setGlobalError(null);
    setIsSubmitting(true);

    try {
      let newImagePath = null;

      // 1. If replacement file selected, upload it
      if (file) {
        const ext = file.name.split('.').pop() || "jpg";
        const prepRes = await prepareUpdateUploadAction(stockSheetId, ext);
        
        if (prepRes.error || !prepRes.signedUrl || !prepRes.path) {
          throw new Error(prepRes.error || "Failed to prepare upload");
        }

        const uploadRes = await fetch(prepRes.signedUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload image securely");
        }
        newImagePath = prepRes.path;
      }

      // 2. Finalize DB transaction
      const submitFormData = new FormData();
      submitFormData.append("design_name", data.design_name);
      submitFormData.append("garment_colour_name", data.garment_colour_name);
      if (data.garment_colour_hex) submitFormData.append("garment_colour_hex", data.garment_colour_hex);
      submitFormData.append("q_s", data.q_s.toString());
      submitFormData.append("q_m", data.q_m.toString());
      submitFormData.append("q_l", data.q_l.toString());
      submitFormData.append("q_xl", data.q_xl.toString());
      submitFormData.append("q_xxl", data.q_xxl.toString());

      const finalRes = await updateStockSheetAction(stockSheetId, newImagePath, submitFormData);

      if (finalRes.error) {
        throw new Error(finalRes.error);
      }

      // Success
      alert(`Stock sheet updated successfully!`);
      router.push(`/stock-sheets/${stockSheetId}`);
      router.refresh();

    } catch (err) {
      if (err instanceof Error) {
        setGlobalError(err.message || "An unexpected error occurred");
      } else {
        setGlobalError("An unexpected error occurred");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-8 pb-10">
      {globalError && (
        <div className="bg-[#E60000]/10 border border-[#E60000]/20 text-[#E60000] p-4 rounded text-sm font-medium">
          {globalError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-gray-400 uppercase tracking-widest text-xs">Reference Number</Label>
            <Input disabled value={initialData.reference_number} className="bg-black border-gray-800 text-gray-500 italic" />
          </div>
          
          <div className="space-y-2">
            <Label className="text-gray-400 uppercase tracking-widest text-xs">Current Status</Label>
            <Input disabled value={initialData.status} className="bg-black border-gray-800 text-gray-500 italic" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="design_name" className="text-gray-300">Design Name *</Label>
            <Input
              id="design_name"
              {...register("design_name")}
              className="bg-black border-gray-700 text-white focus-visible:ring-[#E60000]"
              disabled={isSubmitting}
            />
            {errors.design_name && <p className="text-[#E60000] text-sm">{errors.design_name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="garment_colour_name" className="text-gray-300">Garment Colour Name *</Label>
            <Input
              id="garment_colour_name"
              {...register("garment_colour_name")}
              className="bg-black border-gray-700 text-white focus-visible:ring-[#E60000]"
              disabled={isSubmitting}
            />
            {errors.garment_colour_name && <p className="text-[#E60000] text-sm">{errors.garment_colour_name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="garment_colour_hex" className="text-gray-300">Garment Colour HEX (Optional)</Label>
            <div className="flex gap-2 items-center">
              <Input
                id="garment_colour_hex"
                {...register("garment_colour_hex")}
                className="bg-black border-gray-700 text-white focus-visible:ring-[#E60000] flex-1"
                disabled={isSubmitting}
              />
              <div 
                className="w-10 h-10 rounded border border-gray-700 shrink-0" 
                style={{ backgroundColor: hexColor?.match(/^#[0-9A-Fa-f]{6}$/) ? hexColor : 'transparent' }}
              />
            </div>
            {errors.garment_colour_hex && <p className="text-[#E60000] text-sm">{errors.garment_colour_hex.message}</p>}
          </div>

          <div className="bg-[#111111] border border-gray-800 p-4 rounded-lg space-y-4">
            <Label className="text-gray-300 block mb-2">Size Quantities</Label>
            <div className="grid grid-cols-5 gap-2">
              {(['S', 'M', 'L', 'XL', 'XXL'] as const).map((size) => {
                const key = `q_${size.toLowerCase()}` as keyof StockSheetFormValues;
                return (
                  <div key={size} className="space-y-1">
                    <Label className="text-gray-500 text-xs uppercase text-center block">{size}</Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      {...register(key)}
                      className="bg-black border-gray-700 text-white text-center focus-visible:ring-[#E60000]"
                      disabled={isSubmitting}
                    />
                  </div>
                );
              })}
            </div>
            {errors.q_s && <p className="text-[#E60000] text-sm text-center mt-2">{errors.q_s.message}</p>}
            
            <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between items-center bg-black p-3 rounded">
              <span className="text-gray-400 uppercase tracking-widest text-sm font-bold">Total Quantity</span>
              <span className="text-2xl font-black text-[#E60000]">{totalQuantity}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-gray-300 block">Replacement Design Image (Optional)</Label>
          <div 
            className={`border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-6 text-center transition-colors relative
              ${fileError ? 'border-[#E60000] bg-[#E60000]/5' : 'border-gray-700 hover:border-gray-500 bg-[#111111]'}
              ${(previewUrl || currentImageUrl) ? 'min-h-[300px]' : 'h-64'}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            {previewUrl ? (
              <div className="relative w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="New Preview" className="w-full h-auto max-h-[400px] object-contain rounded-md mb-4 border border-[#E60000]" />
                <div className="flex justify-between items-center bg-black/80 p-2 rounded absolute bottom-2 left-2 right-2">
                  <div className="text-left text-xs overflow-hidden">
                    <p className="text-white truncate font-medium">{file?.name}</p>
                    <p className="text-[#E60000] font-bold">New Image</p>
                  </div>
                  <Button type="button" size="sm" variant="destructive" onClick={clearFile} disabled={isSubmitting}>
                    <X size={16} />
                  </Button>
                </div>
              </div>
            ) : currentImageUrl ? (
              <div className="relative w-full flex flex-col items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={currentImageUrl} alt="Current Design" className="w-full h-auto max-h-[400px] object-contain rounded-md mb-4 opacity-50" />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => fileInputRef.current?.click()}
                    className="pointer-events-auto bg-white text-black hover:bg-gray-200"
                    disabled={isSubmitting}
                  >
                    <ImageIcon size={16} className="mr-2" />
                    Replace Image
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <UploadCloud size={48} className="text-gray-500 mb-4" />
                <p className="text-gray-300 font-medium mb-1">Drag and drop replacement here</p>
                <p className="text-gray-500 text-sm mb-4">Supports JPG, PNG, WebP up to 10MB</p>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-transparent border-gray-600 hover:bg-gray-800 text-white"
                  disabled={isSubmitting}
                >
                  Select File
                </Button>
              </>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/jpeg, image/png, image/webp" 
              onChange={handleFileChange}
            />
          </div>
          {fileError && <p className="text-[#E60000] text-sm mt-2">{fileError}</p>}
        </div>
      </div>

      <div className="flex justify-end gap-4 border-t border-gray-800 pt-6">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => router.push(`/stock-sheets/${stockSheetId}`)}
          className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          className="bg-[#E60000] hover:bg-[#CC0000] text-white uppercase tracking-wider font-bold px-8"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </form>
  );
}
