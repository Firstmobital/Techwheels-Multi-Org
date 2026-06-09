import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib";

type LineItem = {
  label: string;
  amount: number;
  is_deduction?: boolean;
};

type Payload = {
  quoteId: string;
  orgId: string;
  orgName?: string;
  logoUrl?: string | null;
  lineItems?: LineItem[];
  total?: number;
  customerName?: string;
  variantName?: string;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function buildPdf(payload: Payload) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({ x: 40, y: 770, width: 515, height: 40, color: rgb(0.15, 0.39, 0.92) });
  page.drawText(payload.orgName || "TechWheels", { x: 52, y: 785, size: 14, font: bold, color: rgb(1, 1, 1) });

  page.drawText(`Customer: ${payload.customerName || "-"}`, { x: 40, y: 740, size: 11, font });
  page.drawText(`Vehicle: ${payload.variantName || "-"}`, { x: 40, y: 722, size: 11, font });

  let y = 685;
  page.drawText("Quote breakdown", { x: 40, y, size: 12, font: bold });
  y -= 24;

  const lines = payload.lineItems || [];
  for (const item of lines) {
    const amount = Number(item.amount || 0).toLocaleString("en-IN");
    const amountText = `${item.is_deduction ? "- " : ""}INR ${amount}`;
    page.drawText(item.label || "Line item", { x: 40, y, size: 10, font });
    page.drawText(amountText, { x: 420, y, size: 10, font });
    y -= 16;
  }

  y -= 8;
  page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 1, color: rgb(0.85, 0.88, 0.92) });
  y -= 20;
  page.drawText("Total", { x: 40, y, size: 12, font: bold });
  page.drawText(`INR ${Number(payload.total || 0).toLocaleString("en-IN")}`, { x: 420, y, size: 12, font: bold });

  return pdfDoc.save();
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const payload = (await req.json()) as Payload;
    if (!payload?.quoteId || !payload?.orgId) {
      return new Response(JSON.stringify({ error: "quoteId and orgId are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const pdfBytes = await buildPdf(payload);
    const path = `${payload.orgId}/quotes/${payload.quoteId}.pdf`;

    const { error: uploadError } = await admin.storage
      .from("org-docs")
      .upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });

    if (uploadError) {
      return new Response(JSON.stringify({ error: uploadError.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data } = admin.storage.from("org-docs").getPublicUrl(path);

    return new Response(JSON.stringify({ ok: true, url: data.publicUrl }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to generate quote PDF", detail: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
