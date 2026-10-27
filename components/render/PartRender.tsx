"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { LAB_RENDERS, PART_RENDERS } from "./labRenders";

const PartScene = dynamic(() => import("./PartScene"), { ssr: false });

export function PartRender() {
  const params = useSearchParams();
  const lab = params.get("lab");
  const spec = (lab ? LAB_RENDERS[lab] : PART_RENDERS[params.get("id") ?? "contactor"]) ?? PART_RENDERS.contactor;
  return (
    <div id="shot" style={{ width: 256, height: 256, background: "transparent" }}>
      <PartScene spec={spec} />
    </div>
  );
}
