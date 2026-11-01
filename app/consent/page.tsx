import { redirect } from "next/navigation";
import { Suspense } from "react";
import { resendConsent, signOut } from "@/app/actions/auth";
import { currentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CONSENT_DAYS } from "@/lib/server/consent";
import { Card, SiteShell, Skeleton, accentButtonClass, ghostButtonClass } from "@/components/site/SiteShell";

export const metadata = { title: "Waiting for consent · Setpoint Labs" };

const input = "rounded-xl border border-[#dfe2e6] bg-white px-3.5 py-2.5 text-[14px]";

async function Waiting({ sent }: { sent?: string }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!user.needsConsent) redirect("/account");
  const u = (await db.select({ guardianName: users.guardianName, guardianEmail: users.guardianEmail, at: users.consentRequestedAt }).from(users).where(eq(users.id, user.id)).limit(1))[0];
  const until = u.at ? new Date(u.at.getTime() + CONSENT_DAYS * 86_400_000).toISOString().slice(0, 10) : "";
  return (
    <div className="flex flex-col gap-4 text-[14px] leading-[1.6] text-[#4b5058]">
      <p>
        Hi {user.name}. Because you are under 18, we have emailed <span className="font-semibold text-ink">{u.guardianName}</span> at <span className="font-mono text-ink">{u.guardianEmail}</span> to agree to your account. As soon as they do, everything opens.
      </p>
      <p>The free taster lessons work without an account in the meantime. If nobody answers by {until}, the account is deleted and you can sign up again.</p>
      {sent === "1" && <p className="rounded-lg bg-[#eef8f3] px-3 py-2 text-[13px] text-[#1b6b4a]">Sent again.</p>}
      {sent === "busy" && <p className="rounded-lg bg-[#fdf4f4] px-3 py-2 text-[13px] text-[#9b2c2c]">Sent too many times; try again in an hour.</p>}
      <form action={resendConsent} className="flex flex-col gap-2">
        <p className="font-medium text-ink">Wrong email, or not received? Send it again.</p>
        <input name="guardianName" required defaultValue={u.guardianName ?? ""} className={input} />
        <input name="guardianEmail" type="email" required defaultValue={u.guardianEmail ?? ""} className={input} />
        <button type="submit" className={accentButtonClass}>Send again</button>
      </form>
      <form action={signOut}>
        <button type="submit" className={ghostButtonClass}>Sign out</button>
      </form>
    </div>
  );
}

export default function ConsentPage({ searchParams }: PageProps<"/consent">) {
  return (
    <SiteShell>
      <Card kicker="Almost there" title="Waiting for your parent or guardian">
        <Suspense fallback={<Skeleton />}>
          <FromParams searchParams={searchParams} />
        </Suspense>
      </Card>
    </SiteShell>
  );
}

async function FromParams({ searchParams }: { searchParams: PageProps<"/consent">["searchParams"] }) {
  const sp = await searchParams;
  return <Waiting sent={typeof sp.sent === "string" ? sp.sent : undefined} />;
}
