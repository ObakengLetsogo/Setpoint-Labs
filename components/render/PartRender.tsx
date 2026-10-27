"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

const PartScene = dynamic(() => import("./PartScene"), { ssr: false });

export function PartRender() {
  const id = useSearchParams().get("id") ?? "contactor";
  return (
    <div id="shot" style={{ width: 256, height: 256, background: "transparent" }}>
      <PartScene id={id} />
    </div>
  );
}
