import { z } from "zod";

export const stockSheetSchema = z.object({
  design_name: z.string().min(2, "Design name must be at least 2 characters").max(100, "Design name must be at most 100 characters").trim(),
  garment_colour_name: z.string().min(2, "Garment colour name must be at least 2 characters").max(50, "Garment colour name must be at most 50 characters").trim(),
  garment_colour_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid 6-digit HEX colour (e.g., #A6111A)").optional().or(z.literal("")),
  q_s: z.coerce.number().int().min(0, "Must be 0 or greater"),
  q_m: z.coerce.number().int().min(0, "Must be 0 or greater"),
  q_l: z.coerce.number().int().min(0, "Must be 0 or greater"),
  q_xl: z.coerce.number().int().min(0, "Must be 0 or greater"),
  q_xxl: z.coerce.number().int().min(0, "Must be 0 or greater"),
}).superRefine((data, ctx) => {
  const total = data.q_s + data.q_m + data.q_l + data.q_xl + data.q_xxl;
  if (total <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one size must have a quantity greater than 0",
      path: ["q_s"], // Attach error to first size field so it can be displayed
    });
  }
});

export type StockSheetFormValues = z.infer<typeof stockSheetSchema>;
