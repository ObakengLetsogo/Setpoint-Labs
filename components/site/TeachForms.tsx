"use client";

import { useActionState } from "react";
import { addAssignment, createCohort, importLearners, saveOrgSettings } from "@/app/actions/teach";
import { buttonClass } from "./SiteShell";

const input = "rounded-lg border border-[#dfe2e6] bg-white px-3 py-2 text-[13px] text-ink outline-none focus:border-ink/40";

function Status({ s }: { s: { error?: string; ok?: string } }) {
  if (s.error) return <span role="alert" className="text-[12.5px] text-[#9b2c2c]">{s.error}</span>;
  if (s.ok) return <span role="status" className="text-[12.5px] text-[#1b6b4a]">{s.ok}</span>;
  return null;
}

export function ImportForm({ orgId, classes }: { orgId: string; classes: { id: string; name: string }[] }) {
  const [s, run, pending] = useActionState(importLearners, {});
  return (
    <form action={run} className="flex flex-col gap-2">
      <input type="hidden" name="orgId" value={orgId} />
      <textarea name="roster" rows={4} placeholder={"thandi@college.ac.za, Thandi Mokoena\nsipho@college.ac.za, Sipho Dlamini"} className={`${input} font-mono`} />
      <div className="flex flex-wrap items-center gap-2">
        <input type="file" name="file" accept=".csv,text/csv" className="text-[12.5px] file:mr-2 file:rounded-lg file:border-0 file:bg-[#f3f4f5] file:px-3 file:py-1.5 file:text-[12.5px]" />
        <select name="cohortId" className={input} defaultValue="">
          <option value="">No class</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button type="submit" disabled={pending} className={buttonClass}>{pending ? "Adding" : "Add learners"}</button>
        <Status s={s} />
      </div>
      <p className="text-[12px] text-muted-ink">New addresses get an email to set a password. Each learner takes a seat while seats last.</p>
    </form>
  );
}

export function CohortForm({ orgId, platforms }: { orgId: string; platforms: { id: string; name: string }[] }) {
  const [s, run, pending] = useActionState(createCohort, {});
  return (
    <form action={run} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="orgId" value={orgId} />
      <input name="name" required placeholder="Class name, e.g. N4 Electrical 2027" className={input} />
      <select name="platform" className={input} defaultValue="">
        <option value="">Any controller</option>
        {platforms.map((p) => (
          <option key={p.id} value={p.id}>Lock to {p.name}</option>
        ))}
      </select>
      <button type="submit" disabled={pending} className={buttonClass}>Create class</button>
      <Status s={s} />
    </form>
  );
}

export function AssignmentForm({ cohortId, lessons }: { cohortId: string; lessons: { id: string; label: string }[] }) {
  const [s, run, pending] = useActionState(addAssignment, {});
  return (
    <form action={run} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="cohortId" value={cohortId} />
      <select name="lessonId" className={`${input} max-w-[320px]`}>
        {lessons.map((l) => (
          <option key={l.id} value={l.id}>{l.label}</option>
        ))}
      </select>
      <input type="date" name="due" className={input} aria-label="Due date" />
      <button type="submit" disabled={pending} className={buttonClass}>Assign</button>
      <Status s={s} />
    </form>
  );
}

export function OrgSettingsForm({ orgId, platform, certificateName, platforms }: { orgId: string; platform: string | null; certificateName: string | null; platforms: { id: string; name: string }[] }) {
  const [s, run, pending] = useActionState(saveOrgSettings, {});
  return (
    <form action={run} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="orgId" value={orgId} />
      <select name="platform" defaultValue={platform ?? ""} className={input}>
        <option value="">Learners choose their controller</option>
        {platforms.map((p) => (
          <option key={p.id} value={p.id}>Everyone on {p.name}</option>
        ))}
      </select>
      <input name="certificateName" defaultValue={certificateName ?? ""} placeholder="Name on certificates" className={input} />
      <button type="submit" disabled={pending} className={buttonClass}>Save</button>
      <Status s={s} />
    </form>
  );
}
