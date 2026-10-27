// Free play: any rig, your own program, no checkpoint. A sandbox is stored like a lesson under
// the id "sandbox:<rig>", so programs, the language switch and the sim all work unchanged.

import type { RigId } from "./curriculum";
import { RIGS } from "@/rigs";
import type { RigDef } from "@/rigs/types";

const PREFIX = "sandbox:";

export const isSandbox = (id: string) => id.startsWith(PREFIX);
export const sandboxId = (rig: RigId) => `${PREFIX}${rig}`;
export const sandboxRig = (id: string): RigId | undefined => {
  const rig = id.slice(PREFIX.length) as RigId;
  return isSandbox(id) && RIGS[rig] ? rig : undefined;
};

function ioList(rig: RigDef) {
  const row = (kind: "input" | "output") =>
    rig.tags
      .filter((t) => t.kind === kind)
      .map((t) => `${t.tag} ${t.address}`)
      .join(", ");
  return [`Inputs: ${row("input")}`, `Outputs: ${row("output")}`];
}

/** A blank program that lists the rig's I/O as comments, which ladder and structured text both read. */
export function starterProgram(rig: RigDef) {
  const lines = [`Sandbox on the ${rig.name.toLowerCase()}. Write anything; nothing is marked.`, ...ioList(rig)];
  return lines.map((l) => `// ${l}`).join("\n") + "\n";
}
