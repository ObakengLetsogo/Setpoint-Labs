import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PartRender } from "@/components/render/PartRender";

export default function RenderPartsPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense>
      <PartRender />
    </Suspense>
  );
}
