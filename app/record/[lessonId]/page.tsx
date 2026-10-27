import { notFound } from "next/navigation";
import { Suspense } from "react";
import { catalog as lessons } from "@/data/catalog";
import { RecordStage } from "@/components/record/RecordStage";

export function generateStaticParams() {
  return lessons.filter((l) => !l.locked).map((l) => ({ lessonId: l.id }));
}

export const metadata = { robots: { index: false } };

export default async function RecordPage({ params }: PageProps<"/record/[lessonId]">) {
  const { lessonId } = await params;
  if (!lessons.some((l) => l.id === lessonId)) notFound();
  return (
    <Suspense>
      <RecordStage lessonId={lessonId} />
    </Suspense>
  );
}
