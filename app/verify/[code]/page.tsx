import { Suspense } from "react";
import { certificateByCode } from "@/lib/server/certificates";
import { Card, SiteShell, Skeleton, ghostButtonClass } from "@/components/site/SiteShell";
import { IconCheck, IconX } from "@/components/ui/icons";

export const metadata = { title: "Verify a certificate · Setpoint Labs", robots: { index: false } };

async function Result({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const cert = await certificateByCode(decodeURIComponent(code));
  if (!cert || cert.revokedAt)
    return (
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fdf0f0] text-[#b33]"><IconX size={16} /></span>
        <p className="text-[14.5px] leading-[1.6] text-[#3d434a]">
          No valid certificate has the code <span className="font-mono">{decodeURIComponent(code)}</span>. Check the code, or ask the holder for the link from their certificate.
        </p>
      </div>
    );
  return (
    <div>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8f5ef] text-run"><IconCheck size={16} /></span>
        <div>
          <p className="text-[14.5px] leading-[1.6] text-[#3d434a]">This certificate is genuine.</p>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[14px]">
            <dt className="text-muted-ink">Name</dt>
            <dd className="font-semibold text-ink">{cert.nameOnCertificate}</dd>
            <dt className="text-muted-ink">Track</dt>
            <dd className="text-ink">{cert.track}</dd>
            {cert.issuer && (
              <>
                <dt className="text-muted-ink">Through</dt>
                <dd className="text-ink">{cert.issuer}</dd>
              </>
            )}
            <dt className="text-muted-ink">Issued</dt>
            <dd className="text-ink">{cert.issuedAt.toISOString().slice(0, 10)}</dd>
            <dt className="text-muted-ink">Code</dt>
            <dd className="font-mono text-ink">{cert.code}</dd>
          </dl>
        </div>
      </div>
      <a href={`/api/certificates/${cert.code}`} className={`${ghostButtonClass} mt-6`}>Download PDF</a>
    </div>
  );
}

export default function VerifyPage({ params }: PageProps<"/verify/[code]">) {
  return (
    <SiteShell>
      <Card kicker="Certificate check" title="Verify a certificate">
        <Suspense fallback={<Skeleton lines={3} />}>
          <Result params={params} />
        </Suspense>
      </Card>
    </SiteShell>
  );
}
