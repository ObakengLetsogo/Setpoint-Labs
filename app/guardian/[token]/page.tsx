import { Suspense } from "react";
import { guardianDecides } from "@/app/actions/consent";
import { consentRequestFor } from "@/lib/server/consent";
import { Card, SiteShell, Skeleton, accentButtonClass, ghostButtonClass } from "@/components/site/SiteShell";

export const metadata = { title: "Parent or guardian consent · Setpoint Labs", robots: { index: false } };

async function Decide({ params }: { params: PageProps<"/guardian/[token]">["params"] }) {
  const { token } = await params;
  const req = await consentRequestFor(token);
  if (!req) return <p className="text-[14px] text-[#4b5058]">This link has been used or has expired. If you still need to decide, ask your child to send it again from their account.</p>;
  return (
    <div className="flex flex-col gap-3 text-[14px] leading-[1.6] text-[#4b5058]">
      <p>Hello {req.guardianName}. <span className="font-semibold text-ink">{req.name}</span> ({req.email}) has signed up for Setpoint Labs and named you as their parent or guardian.</p>
      <p>Setpoint Labs teaches industrial PLC programming on simulated machines in the browser. It is for education only; nobody works on real equipment.</p>
      <p className="font-medium text-ink">What we keep about your child, if you agree</p>
      <ul className="list-disc pl-5">
        <li>Their name, email address and date of birth</li>
        <li>Lesson progress, quiz scores and the programs they write</li>
        <li>Exam results and certificates, if they sit exams</li>
        <li>Payment records, if a course is bought</li>
      </ul>
      <p>We use this only to run their training, as POPIA requires. We never sell it or use it for advertising. You can ask us at any time to see it or delete it.</p>
      <form action={guardianDecides} className="mt-2 flex flex-wrap gap-2">
        <input type="hidden" name="token" value={token} />
        <button type="submit" name="decision" value="agree" className={accentButtonClass}>I am their parent or guardian and I agree</button>
        <button type="submit" name="decision" value="refuse" className={ghostButtonClass}>I do not agree; delete the account</button>
      </form>
    </div>
  );
}

export default function GuardianPage({ params }: PageProps<"/guardian/[token]">) {
  return (
    <SiteShell>
      <Card kicker="Parent or guardian" title="Consent for a learner under 18">
        <Suspense fallback={<Skeleton />}>
          <Decide params={params} />
        </Suspense>
      </Card>
    </SiteShell>
  );
}
