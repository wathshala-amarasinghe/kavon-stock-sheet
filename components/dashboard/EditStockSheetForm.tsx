"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { UploadCloud, X, Loader2 } from "lucide-react";
import { stockSheetSchema, StockSheetFormValues } from "@/lib/validations/stock-sheet";
import { prepareUpdateUploadsAction, updateStockSheetAction } from "@/app/stock-sheets/[id]/edit/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StockSheet } from "@/types";

interface EditStockSheetFormProps {
  stockSheetId: string;
  initialData: StockSheet;
  quantitiesMap: Record<string, number>;
  existingImages: { path: string; url: string }[];
}

const PREDEFINED_COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Navy Blue', hex: '#000080' },
  { name: 'Royal Blue', hex: '#4169e1' },
  { name: 'Red', hex: '#ff0000' },
  { name: 'Maroon', hex: '#800000' },
  { name: 'Forest Green', hex: '#228b22' },
  { name: 'Grey', hex: '#808080' },
  { name: 'Charcoal', hex: '#36454f' },
  { name: 'Yellow', hex: '#ffd700' },
];

export function EditStockSheetForm({ stockSheetId, initialData, quantitiesMap, existingImages }: EditStockSheetFormProps) {
  const router = useRouter();
  const [existingImgs, setExistingImgs] = useState(existingImages);
  const [newFiles, setNewFiles] = useState<{ file: File; previewUrl: string }[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
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
  const colourName = watch("garment_colour_name");

  useEffect(() => {
    if (colourName) {
      const matched = PREDEFINED_COLORS.find(c => c.name.toLowerCase() === colourName.toLowerCase());
      if (matched) {
        setValue("garment_colour_hex", matched.hex, { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [colourName, setValue]);

  useEffect(() => {
    return () => {
      newFiles.forEach(f => URL.revokeObjectURL(f.previewUrl));
    };
  }, [newFiles]);

  const processFiles = (files: File[]) => {
    setFileError(null);
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    
    if (existingImgs.length + newFiles.length + files.length > 5) {
      setFileError("You can have a maximum of 5 images total.");
      return;
    }

    const validFiles = files.filter(f => validTypes.includes(f.type) && f.size <= 10 * 1024 * 1024);
    if (validFiles.length < files.length) {
      setFileError("Some files were rejected. Only JPG, PNG, and WebP up to 10MB are allowed.");
    }

    const newEntries = validFiles.map(f => ({
      file: f,
      previewUrl: URL.createObjectURL(f)
    }));

    setNewFiles(prev => [...prev, ...newEntries]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    processFiles(selected);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files || []);
    processFiles(dropped);
  };

  const removeExistingImg = (index: number) => {
    setExistingImgs(prev => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };

  const removeNewFile = (index: number) => {
    setNewFiles(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  const onSubmit = async (data: StockSheetFormValues) => {
    if (existingImgs.length === 0 && newFiles.length === 0) {
      setFileError("At least one design image is required");
      return;
    }

    setGlobalError(null);
    setIsSubmitting(true);

    try {
      const newlyUploadedPaths: string[] = [];

      // 1. If there are new files, upload them
      if (newFiles.length > 0) {
        const exts = newFiles.map(f => f.file.name.split('.').pop() || "jpg");
        const prepRes = await prepareUpdateUploadsAction(stockSheetId, exts);
        
        if (prepRes.error || !prepRes.uploads) {
          throw new Error(prepRes.error || "Failed to prepare uploads");
        }

        const uploadPromises = newFiles.map((f, i) => {
          // Add to newly uploaded paths for DB
          newlyUploadedPaths.push(prepRes.uploads![i].path);
          return fetch(prepRes.uploads![i].signedUrl, {
            method: "PUT",
            body: f.file,
            headers: { "Content-Type": f.file.type },
          }).then(res => {
            if (!res.ok) throw new Error(`Failed to upload ${f.file.name}`);
          });
        });
        await Promise.all(uploadPromises);
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

      const finalImagePaths = [
        ...existingImgs.map(img => img.path),
        ...newlyUploadedPaths
      ];

      const finalRes = await updateStockSheetAction(stockSheetId, finalImagePaths, newlyUploadedPaths, submitFormData);

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
            <div className="flex flex-wrap gap-2 mb-2">
              {PREDEFINED_COLORS.map(c => (
                <button 
                  key={c.name}
                  type="button"
                  onClick={() => {
                    setValue("garment_colour_name", c.name, { shouldValidate: true });
                    setValue("garment_colour_hex", c.hex, { shouldValidate: true });
                  }}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-gray-700 bg-[#111111] hover:bg-gray-800 text-xs transition-colors"
                >
                  <div className="w-3 h-3 rounded-full border border-gray-600" style={{ backgroundColor: c.hex }} />
                  <span className="text-gray-300">{c.name}</span>
                </button>
              ))}
            </div>
            <Input
              id="garment_colour_name"
              list="color-suggestions"
              {...register("garment_colour_name")}
              placeholder="e.g. Custom Color, or pick from above"
              className="bg-black border-gray-700 text-white focus-visible:ring-[#E60000]"
              disabled={isSubmitting}
            />
            <datalist id="color-suggestions">
              {PREDEFINED_COLORS.map(c => (
                <option key={c.name} value={c.name} />
              ))}
            </datalist>
            {errors.garment_colour_name && <p className="text-[#E60000] text-sm">{errors.garment_colour_name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="garment_colour_hex" className="text-gray-300">Garment Colour HEX (Optional)</Label>
            <div className="flex gap-2 items-center">
              <Input
                id="garment_colour_hex_text"
                {...register("garment_colour_hex")}
                placeholder="#A6111A"
                className="bg-black border-gray-700 text-white focus-visible:ring-[#E60000] flex-1 font-mono uppercase"
                disabled={isSubmitting}
              />
              <div className="relative w-10 h-10 rounded border border-gray-700 overflow-hidden shrink-0">
                <input 
                  type="color" 
                  id="garment_colour_hex"
                  className="absolute -top-2 -left-2 w-14 h-14 cursor-pointer"
                  value={hexColor?.match(/^#[0-9A-Fa-f]{6}$/) ? hexColor : "#000000"}
                  onChange={(e) => setValue("garment_colour_hex", e.target.value, { shouldValidate: true, shouldDirty: true })}
                  disabled={isSubmitting}
                />
              </div>
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
          <Label className="text-gray-300 block">Design Images (Max 5)</Label>
          
          {(existingImgs.length > 0 || newFiles.length > 0) && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Existing Images */}
              {existingImgs.map((img, i) => (
                <div key={`existing-${i}`} className="relative group border border-gray-800 rounded bg-[#111111] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={`Existing ${i}`} className="w-full h-32 object-cover opacity-80" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button type="button" size="sm" variant="destructive" onClick={() => removeExistingImg(i)} disabled={isSubmitting}>
                      <X size={16} /> Remove
                    </Button>
                  </div>
                </div>
              ))}
              
              {/* New Files */}
              {newFiles.map((f, i) => (
                <div key={`new-${i}`} className="relative group border border-[#E60000] rounded bg-[#111111] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.previewUrl} alt={`New Preview ${i}`} className="w-full h-32 object-cover" />
                  <div className="absolute top-1 left-1 bg-[#E60000] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">NEW</div>
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button type="button" size="sm" variant="destructive" onClick={() => removeNewFile(i)} disabled={isSubmitting}>
                      <X size={16} /> Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {existingImgs.length + newFiles.length < 5 && (
            <div 
              className={`border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-6 text-center transition-colors relative
                ${fileError ? 'border-[#E60000] bg-[#E60000]/5' : 'border-gray-700 hover:border-gray-500 bg-[#111111]'}
                h-32`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <UploadCloud size={32} className="text-gray-500 mb-2" />
              <p className="text-gray-300 font-medium mb-1 text-sm">Add more images</p>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                className="bg-transparent border-gray-600 hover:bg-gray-800 text-white mt-2 h-8 text-xs"
                disabled={isSubmitting}
              >
                Select Files
              </Button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                multiple
                accept="image/jpeg, image/png, image/webp" 
                onChange={handleFileChange}
              />
            </div>
          )}
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
