import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/server/auth";
import { endorsementForLearner } from "@/lib/server/endorsements";
import { ExamRunner } from "@/components/site/ExamRunner";
import { SiteShell, Skeleton } from "@/components/site/SiteShell";

export const metadata = { title: "Endorsement exam · Setpoint Labs" };

async function Attempt({ params }: { params: PageProps<"/exams/e/[attemptId]">["params"] }) {
  const { attemptId } = await params;
  const user = await requireUser(`/exams/e/${attemptId}`);
  const a = await endorsementForLearner(user.id, attemptId);
  if (!a) notFound();
  return (
    <ExamRunner
      attemptId={a.id}
      title={`${a.name} platform endorsement`}
      deadline={a.deadlineAt.toISOString()}
      questions={a.questions}
      done={a.submitted ? { theoryPct: a.pct ?? 0, practical: true, passed: Boolean(a.passed), late: false } : null}
      expert={false}
      endorsement
    />
  );
}

export default function EndorsementAttemptPage({ params }: PageProps<"/exams/e/[attemptId]">) {
  return (
    <SiteShell>
      <Suspense fallback={<Skeleton lines={6} />}>
        <Attempt params={params} />
      </Suspense>
    </SiteShell>
  );
}
