import { LEVEL_NAMES } from "@/config/plans";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/server/auth";
import { recertForLearner } from "@/lib/server/recert";
import { ExamRunner } from "@/components/site/ExamRunner";
import { SiteShell, Skeleton } from "@/components/site/SiteShell";

export const metadata = { title: "Recertification exam · Setpoint Labs" };

async function Attempt({ params }: { params: PageProps<"/exams/r/[attemptId]">["params"] }) {
  const { attemptId } = await params;
  const user = await requireUser(`/exams/r/${attemptId}`);
  const a = await recertForLearner(user.id, attemptId);
  if (!a) notFound();
  return (
    <ExamRunner
      attemptId={a.id}
      title={`${LEVEL_NAMES[a.level]} recertification`}
      deadline={a.deadlineAt.toISOString()}
      questions={a.questions}
      done={a.submitted ? { theoryPct: a.pct ?? 0, practical: true, passed: Boolean(a.passed), late: false } : null}
      expert={false}
      recert
    />
  );
}

export default function RecertAttemptPage({ params }: PageProps<"/exams/r/[attemptId]">) {
  return (
    <SiteShell>
      <Suspense fallback={<Skeleton lines={6} />}>
        <Attempt params={params} />
      </Suspense>
    </SiteShell>
  );
}
