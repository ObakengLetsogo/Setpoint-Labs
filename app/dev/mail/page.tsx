import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { outbox } from "@/lib/server/email";
import { Card, SiteShell, Skeleton } from "@/components/site/SiteShell";

async function Mails() {
  await connection();
  if (process.env.NODE_ENV === "production") notFound();
  if (!outbox.length) return <p className="text-[14px] text-muted-ink">No mail sent since the server started.</p>;
  return (
    <div className="flex flex-col gap-4">
      {outbox.map((m, i) => (
        <article key={i} className="overflow-hidden rounded-xl border border-[#e4e6e9]">
          <p className="border-b border-[#eef0f2] bg-[#f6f7f8] px-4 py-2 font-mono text-[12px] text-ink">
            {m.sentAt.slice(11, 19)} · to {m.to} · {m.subject}
          </p>
          <iframe title={m.subject} srcDoc={m.html} className="h-[420px] w-full" />
        </article>
      ))}
    </div>
  );
}

export default function DevMailPage() {
  return (
    <SiteShell wide>
      <Card kicker="Development" title="Outbox">
        <Suspense fallback={<Skeleton />}>
          <Mails />
        </Suspense>
      </Card>
    </SiteShell>
  );
}
