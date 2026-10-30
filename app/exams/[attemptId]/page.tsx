import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LEVEL_NAMES } from "@/config/plans";
import { requireUser } from "@/lib/server/auth";
import { attemptForLearner } from "@/lib/server/exams";
import { ExamRunner } from "@/components/site/ExamRunner";
import { SiteShell, Skeleton } from "@/components/site/SiteShell";

export const metadata = { title: "Exam · Setpoint Labs" };

async function Attempt({ params }: { params: PageProps<"/exams/[attemptId]">["params"] }) {
  const { attemptId } = await params;
  const user = await requireUser(`/exams/${attemptId}`);
  const a = await attemptForLearner(user.id, attemptId);
  if (!a) notFound();
  return (
    <ExamRunner
      attemptId={a.id}
      title={`${LEVEL_NAMES[a.level]} exam`}
      deadline={a.deadlineAt.toISOString()}
      questions={a.questions}
      done={a.submitted ? { theoryPct: a.theoryPct ?? 0, practical: Boolean(a.practicalPassed), passed: Boolean(a.passed), late: false } : null}
      expert={a.level === "E"}
      atCentre={a.atCentre}
    />
  );
}

export default function AttemptPage({ params }: PageProps<"/exams/[attemptId]">) {
  return (
    <SiteShell>
      <Suspense fallback={<Skeleton lines={6} />}>
        <Attempt params={params} />
      </Suspense>
    </SiteShell>
  );
}
