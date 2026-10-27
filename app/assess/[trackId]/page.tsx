import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ASSESSMENTS, assessmentFor } from "@/data/assessments";
import { CURRICULUM } from "@/data/curriculum";
import { RIGS } from "@/rigs";
import { requireUser } from "@/lib/server/auth";
import { AssessForm } from "@/components/site/AssessForm";
import { SiteShell, Skeleton } from "@/components/site/SiteShell";

export function generateStaticParams() {
  return ASSESSMENTS.map((a) => ({ trackId: a.trackId }));
}

async function Gate({ trackId, starter }: { trackId: string; starter: string }) {
  await requireUser(`/assess/${trackId}`);
  return <AssessForm trackId={trackId} starter={starter} />;
}

export default async function AssessPage({ params }: PageProps<"/assess/[trackId]">) {
  const { trackId } = await params;
  const a = assessmentFor(trackId);
  if (!a) notFound();
  const track = CURRICULUM.find((t) => t.id === trackId)!;
  return (
    <SiteShell wide>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <section className="rounded-2xl border border-[#e4e6e9] bg-white p-6">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-[#d9591a]">{track.name} · practical assessment</p>
          <h1 className="mt-1 font-display text-[28px] font-bold text-ink">{a.title}</h1>
          <p className="mt-2 text-[14px] leading-[1.6] text-[#4b5058]">{a.brief} It runs on the {RIGS[a.rig]?.name.toLowerCase()}; draft it in the sandbox first if you like.</p>
          <h2 className="mt-5 text-[14px] font-semibold text-ink">Requirements</h2>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[13.5px] leading-[1.55] text-[#3d434a]">
            {a.requirements.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ol>
          <h2 className="mt-5 text-[14px] font-semibold text-ink">Tags</h2>
          <table className="mt-2 w-full text-left text-[12.5px]">
            <tbody>
              {a.io.map(([tag, what]) => (
                <tr key={tag} className="border-t border-[#f1f2f4]">
                  <td className="py-1.5 pr-3 font-mono text-ink">{tag}</td>
                  <td className="py-1.5 text-[#4b5058]">{what}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-5 text-[12.5px] leading-[1.6] text-muted-ink">Hidden tests drive the inputs scan by scan and check the outputs. Any correct program passes, in ladder or structured text. A pass with a plan earns the track certificate.</p>
        </section>
        <section className="rounded-2xl border border-[#e4e6e9] bg-white p-6">
          <Suspense fallback={<Skeleton lines={6} />}>
            <Gate trackId={trackId} starter={a.starter} />
          </Suspense>
        </section>
      </div>
    </SiteShell>
  );
}
