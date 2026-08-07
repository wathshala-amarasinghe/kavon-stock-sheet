import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { renderToBuffer } from "@react-pdf/renderer";
import { StockSheetDocument } from "@/components/pdf/StockSheetDocument";
import { StockSheet, StockSheetQuantity } from "@/types";
import sharp from "sharp";
import React from "react";



export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate UUID
    const uuidResult = z.string().uuid().safeParse(id);
    if (!uuidResult.success) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const supabase = await createClient();
    
    // Authenticate
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Retrieve data
    const { data, error } = await supabase
      .from("stock_sheets")
      .select(`*, stock_sheet_quantities(size, quantity)`)
      .eq("id", id)
      .single();

    if (error || !data || data.user_id !== user.id) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Map quantities safely
    const quantities = data.stock_sheet_quantities as StockSheetQuantity[];
    const quantitiesMap = quantities.reduce((acc, q) => {
      acc[q.size] = q.quantity;
      return acc;
    }, {} as Record<string, number>);

    // Use safe non-negative normalization
    const safeQ = (val: string | number | undefined) => Math.max(0, typeof val === 'number' ? val : parseInt(val as string) || 0);
    const mapped = {
      S: safeQ(quantitiesMap["S"]),
      M: safeQ(quantitiesMap["M"]),
      L: safeQ(quantitiesMap["L"]),
      XL: safeQ(quantitiesMap["XL"]),
      XXL: safeQ(quantitiesMap["XXL"]),
    };

    const total = mapped.S + mapped.M + mapped.L + mapped.XL + mapped.XXL;

    const sheet: StockSheet = {
      ...data,
      quantities_map: mapped,
      total_quantity: total,
    };

    // Download image bytes securely on the server
    let imageBufferBase64: string | null = null;
    if (sheet.design_image_path) {
      try {
        const { data: fileData, error: fileError } = await supabase.storage
          .from("kavon-designs")
          .download(sheet.design_image_path);

        if (!fileError && fileData) {
          const arrayBuffer = await fileData.arrayBuffer();
          let buffer = Buffer.from(arrayBuffer);

          // Use sharp to normalize to PNG (handles webp automatically)
          buffer = await sharp(buffer)
            .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
            .png()
            .toBuffer();

          imageBufferBase64 = `data:image/png;base64,${buffer.toString("base64")}`;
        } else {
          console.warn("Failed to download image from storage", fileError);
        }
      } catch (err) {
        console.warn("Error processing image buffer", err);
      }
    }

    // Use local file system path for the logo instead of a URL to avoid SSR loopback timeouts
    const path = await import('path');
    const logoUrl = path.join(process.cwd(), 'public', 'brand', 'logo.png');

    // Render PDF
    const pdfBuffer = await renderToBuffer(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      React.createElement(StockSheetDocument, { sheet, imageBuffer: imageBufferBase64, logoUrl, total }) as any
    );

    const isDownload = request.nextUrl.searchParams.get("download") === "1";
    const disposition = isDownload ? "attachment" : "inline";
    // Sanitize reference number for filename
    const sanitizedRef = sheet.reference_number.replace(/[^a-zA-Z0-9-]/g, "");
    
    // Log Activity
    try {
      await supabase.rpc('log_user_activity', {
        p_action_type: isDownload ? 'pdf_downloaded' : 'pdf_previewed',
        p_summary: `${isDownload ? 'Downloaded' : 'Previewed'} PDF for ${sheet.reference_number}`,
        p_entity_type: 'stock_sheets',
        p_entity_id: sheet.id,
        p_metadata: { reference_number: sheet.reference_number, mode: isDownload ? 'download' : 'preview' }
      });
    } catch (e) {
      console.error("Failed to log PDF activity", e);
    }
    
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="KAVON-${sanitizedRef}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });

  } catch (err) {
    console.error("PDF generation failed:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
