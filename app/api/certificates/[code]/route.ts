import { certificateByCode, certificatePdf } from "@/lib/server/certificates";

/** The certificate as a PDF. Anyone with the code can download it, like the verify page. */
export async function GET(_req: Request, ctx: RouteContext<"/api/certificates/[code]">) {
  const { code } = await ctx.params;
  const cert = await certificateByCode(code);
  if (!cert || cert.revokedAt) return new Response("Not found", { status: 404 });
  const bytes = await certificatePdf(cert);
  return new Response(Buffer.from(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="setpoint-labs-${cert.code}.pdf"`, "Cache-Control": "private, max-age=300" },
  });
}
