"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { UploadCloud, X, Loader2 } from "lucide-react";
import { stockSheetSchema, StockSheetFormValues } from "@/lib/validations/stock-sheet";
import { prepareUploadAction, finalizeStockSheetAction } from "@/app/stock-sheets/new/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function StockSheetForm() {
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
    resolver: zodResolver(stockSheetSchema) as any,
    defaultValues: {
      design_name: "",
      garment_colour_name: "",
      garment_colour_hex: "",
      q_s: 0,
      q_m: 0,
      q_l: 0,
      q_xl: 0,
      q_xxl: 0,
    },
  });

  const quantities = watch(["q_s", "q_m", "q_l", "q_xl", "q_xxl"]);
  const totalQuantity = quantities.reduce((acc, curr) => acc + (Number(curr) || 0), 0);
  const hexColor = watch("garment_colour_hex");

  useEffect(() => {
    // Release Object URL on unmount or when file changes
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
    if (!file) {
      setFileError("Design image is required");
      return;
    }

    setGlobalError(null);
    setIsSubmitting(true);

    try {
      // 1. Get signed upload URL
      const ext = file.name.split('.').pop() || "jpg";
      const formData = new FormData(); // Dummy for now
      const prepRes = await prepareUploadAction(formData, ext);
      
      if (prepRes.error || !prepRes.signedUrl || !prepRes.path || !prepRes.stockSheetId) {
        throw new Error(prepRes.error || "Failed to prepare upload");
      }

      // 2. Upload file directly to Supabase via signed URL
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

      // 3. Finalize DB transaction
      const submitFormData = new FormData();
      submitFormData.append("design_name", data.design_name);
      submitFormData.append("garment_colour_name", data.garment_colour_name);
      if (data.garment_colour_hex) submitFormData.append("garment_colour_hex", data.garment_colour_hex);
      submitFormData.append("q_s", data.q_s.toString());
      submitFormData.append("q_m", data.q_m.toString());
      submitFormData.append("q_l", data.q_l.toString());
      submitFormData.append("q_xl", data.q_xl.toString());
      submitFormData.append("q_xxl", data.q_xxl.toString());

      const finalRes = await finalizeStockSheetAction(prepRes.stockSheetId, prepRes.path, submitFormData);

      if (finalRes.error) {
        throw new Error(finalRes.error);
      }

      // Success!
      alert(`Stock sheet saved successfully! Reference: ${finalRes.reference_number}`);
      router.push("/");
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
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-8 pb-10">
      {globalError && (
        <div className="bg-[#E60000]/10 border border-[#E60000]/20 text-[#E60000] p-4 rounded text-sm font-medium">
          {globalError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Form Fields */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-gray-400 uppercase tracking-widest text-xs">Reference Number</Label>
            <Input disabled value="Generated automatically" className="bg-black border-gray-800 text-gray-500 italic" />
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
              placeholder="e.g. Black, White, Burgundy"
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
                placeholder="#A6111A"
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

          {/* Size Quantities */}
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

        {/* Right Column: Image Upload */}
        <div className="space-y-2">
          <Label className="text-gray-300 block mb-1">Design Image *</Label>
          <div 
            className={`border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-6 text-center transition-colors relative
              ${fileError ? 'border-[#E60000] bg-[#E60000]/5' : 'border-gray-700 hover:border-gray-500 bg-[#111111]'}
              ${previewUrl ? 'h-auto' : 'h-64'}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            {previewUrl ? (
              <div className="relative w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Preview" className="w-full h-auto rounded-md mb-4" />
                <div className="flex justify-between items-center bg-black/80 p-2 rounded absolute bottom-2 left-2 right-2">
                  <div className="text-left text-xs overflow-hidden">
                    <p className="text-white truncate font-medium">{file?.name}</p>
                    <p className="text-gray-400">{(file!.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <Button type="button" size="sm" variant="destructive" onClick={clearFile} disabled={isSubmitting}>
                    <X size={16} />
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <UploadCloud size={48} className="text-gray-500 mb-4" />
                <p className="text-gray-300 font-medium mb-1">Drag and drop your image here</p>
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
          onClick={() => router.push("/")}
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
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
          ) : (
            "Save Stock Sheet"
          )}
        </Button>
      </div>
    </form>
  );
}
