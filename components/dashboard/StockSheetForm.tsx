"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { UploadCloud, X, Loader2 } from "lucide-react";
import { stockSheetSchema, StockSheetFormValues } from "@/lib/validations/stock-sheet";
import { prepareUploadsAction, finalizeStockSheetAction } from "@/app/stock-sheets/new/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

export function StockSheetForm() {
  const router = useRouter();
  const [files, setFiles] = useState<{ file: File; previewUrl: string }[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<StockSheetFormValues>({
    resolver: zodResolver(stockSheetSchema) as Resolver<StockSheetFormValues>,
    defaultValues: {
      design_name: "",
      garment_colours: [{ name: "", hex: "" }],
      q_s: 0,
      q_m: 0,
      q_l: 0,
      q_xl: 0,
      q_xxl: 0,
    },
  });

  const quantities = watch(["q_s", "q_m", "q_l", "q_xl", "q_xxl"]);
  const totalQuantity = quantities.reduce((acc, curr) => acc + (Number(curr) || 0), 0);
  const { fields, append, remove } = useFieldArray({
    control,
    name: "garment_colours"
  });

  useEffect(() => {
    return () => {
      files.forEach(f => URL.revokeObjectURL(f.previewUrl));
    };
  }, [files]);

  const processFiles = (newFiles: File[]) => {
    setFileError(null);
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    
    if (files.length + newFiles.length > 5) {
      setFileError("You can upload a maximum of 5 images.");
      return;
    }

    const validFiles = newFiles.filter(f => validTypes.includes(f.type) && f.size <= 10 * 1024 * 1024);
    if (validFiles.length < newFiles.length) {
      setFileError("Some files were rejected. Only JPG, PNG, and WebP up to 10MB are allowed.");
    }

    const newEntries = validFiles.map(f => ({
      file: f,
      previewUrl: URL.createObjectURL(f)
    }));

    setFiles(prev => [...prev, ...newEntries]);
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

  const removeFile = (index: number) => {
    setFiles(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  const onSubmit = async (data: StockSheetFormValues) => {
    if (files.length === 0) {
      setFileError("At least one design image is required");
      return;
    }

    setGlobalError(null);
    setIsSubmitting(true);

    try {
      // 1. Get signed upload URLs
      const exts = files.map(f => f.file.name.split('.').pop() || "jpg");
      const prepRes = await prepareUploadsAction(exts);
      
      if (prepRes.error || !prepRes.uploads || !prepRes.stockSheetId) {
        throw new Error(prepRes.error || "Failed to prepare uploads");
      }

      // 2. Upload files directly to Supabase via signed URLs
      const uploadPromises = files.map((f, i) => {
        return fetch(prepRes.uploads[i].signedUrl, {
          method: "PUT",
          body: f.file,
          headers: { "Content-Type": f.file.type },
        }).then(res => {
          if (!res.ok) throw new Error(`Failed to upload ${f.file.name}`);
        });
      });
      await Promise.all(uploadPromises);

      // 3. Finalize DB transaction
      const submitFormData = new FormData();
      submitFormData.append("design_name", data.design_name);
      submitFormData.append("garment_colours", JSON.stringify(data.garment_colours));
      submitFormData.append("q_s", data.q_s.toString());
      submitFormData.append("q_m", data.q_m.toString());
      submitFormData.append("q_l", data.q_l.toString());
      submitFormData.append("q_xl", data.q_xl.toString());
      submitFormData.append("q_xxl", data.q_xxl.toString());

      const imagePaths = prepRes.uploads.map(u => u.path);
      const finalRes = await finalizeStockSheetAction(prepRes.stockSheetId, imagePaths, submitFormData);

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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 pb-10">
      {globalError && (
        <div className="bg-[#E60000]/10 border border-[#E60000]/20 text-[#E60000] p-4 rounded text-sm font-medium">
          {globalError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

          <div className="bg-[#111111] border border-gray-800 p-4 rounded-lg space-y-6">
            <div className="flex justify-between items-center mb-2">
              <Label className="text-gray-300 block">Garment Colours *</Label>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => append({ name: "", hex: "" })}
                className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white h-7 text-xs"
                disabled={isSubmitting || fields.length >= 10}
              >
                + Add Colour
              </Button>
            </div>
            
            {fields.map((field, index) => (
              <div key={field.id} className="p-3 bg-black border border-gray-800 rounded-md relative group">
                {fields.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => remove(index)}
                    className="absolute -top-2 -right-2 bg-[#E60000] text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-[#CC0000]"
                    disabled={isSubmitting}
                  >
                    <X size={12} />
                  </button>
                )}
                
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-gray-500 text-xs">Name *</Label>
                    <Input
                      {...register(`garment_colours.${index}.name`)}
                      placeholder="e.g. Navy Blue"
                      className="bg-[#111111] border-gray-700 text-white focus-visible:ring-[#E60000] h-8 text-sm"
                      disabled={isSubmitting}
                    />
                    {errors.garment_colours?.[index]?.name && (
                      <p className="text-[#E60000] text-xs">{errors.garment_colours[index].name.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-gray-500 text-xs">HEX Code (Optional)</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        {...register(`garment_colours.${index}.hex`)}
                        placeholder="#000080"
                        className="bg-[#111111] border-gray-700 text-white focus-visible:ring-[#E60000] h-8 text-sm font-mono uppercase"
                        disabled={isSubmitting}
                      />
                      <div className="relative w-8 h-8 rounded border border-gray-700 overflow-hidden shrink-0">
                        <input 
                          type="color" 
                          className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                          value={(watch(`garment_colours.${index}.hex`) ?? '').match(/^#[0-9A-Fa-f]{6}$/) ? (watch(`garment_colours.${index}.hex`) as string) : "#000000"}
                          onChange={(e) => setValue(`garment_colours.${index}.hex`, e.target.value, { shouldValidate: true, shouldDirty: true })}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                    {errors.garment_colours?.[index]?.hex && (
                      <p className="text-[#E60000] text-xs">{errors.garment_colours[index].hex.message}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {errors.garment_colours?.root && (
              <p className="text-[#E60000] text-sm">{errors.garment_colours.root.message}</p>
            )}
          </div>

          {/* Size Quantities */}
          <div className="bg-[#111111] border border-gray-800 p-4 rounded-lg space-y-4">
            <Label className="text-gray-300 block mb-2">Size Quantities</Label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
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

        <div className="space-y-2">
          <Label className="text-gray-300 block mb-1">Design Images (Max 5) *</Label>
          
          {files.length > 0 && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              {files.map((f, i) => (
                <div key={i} className="relative group border border-gray-800 rounded bg-[#111111] overflow-hidden">
                <img src={f.previewUrl} alt="Preview" className="w-full h-32 object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button type="button" size="sm" variant="destructive" onClick={() => removeFile(i)} disabled={isSubmitting}>
                      <X size={16} /> Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {files.length < 5 && (
            <div 
              className={`border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-6 text-center transition-colors relative
                ${fileError ? 'border-[#E60000] bg-[#E60000]/5' : 'border-gray-700 hover:border-gray-500 bg-[#111111]'}
                h-32`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <UploadCloud size={32} className="text-gray-500 mb-2" />
              <p className="text-gray-300 font-medium mb-1 text-sm">Drag and drop images here</p>
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
