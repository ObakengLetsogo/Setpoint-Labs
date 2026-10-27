import Link from "next/link";
import { Suspense } from "react";
import { confirmEmail } from "@/app/actions/auth";
import { Card, SiteShell, Skeleton, buttonClass } from "@/components/site/SiteShell";

export const metadata = { title: "Confirm your email · Setpoint Labs" };

async function Body({ searchParams }: { searchParams: Promise<{ token?: string; done?: string; failed?: string }> }) {
  const { token, done, failed } = await searchParams;
  if (done)
    return (
      <>
        <p className="text-[14.5px] leading-[1.6] text-[#4b5058]">Your email is confirmed. You can now choose a plan and earn certificates.</p>
        <Link href="/account" className={`${buttonClass} mt-5`}>Go to your account</Link>
      </>
    );
  if (failed || !token)
    return (
      <>
        <p className="text-[14.5px] leading-[1.6] text-[#4b5058]">This link has expired or was already used. Sign in and ask for a new one from your account page.</p>
        <Link href="/account" className={`${buttonClass} mt-5`}>Go to your account</Link>
      </>
    );
  return (
    <form action={confirmEmail}>
      <input type="hidden" name="token" value={token} />
      <p className="text-[14.5px] leading-[1.6] text-[#4b5058]">One tap to confirm this email address belongs to you.</p>
      <button type="submit" className={`${buttonClass} mt-5`}>Confirm my email</button>
    </form>
  );
}

export default function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  return (
    <SiteShell>
      <Card kicker="Account" title="Confirm your email">
        <Suspense fallback={<Skeleton lines={2} />}>
          <Body searchParams={searchParams as Promise<{ token?: string; done?: string; failed?: string }>} />
        </Suspense>
      </Card>
    </SiteShell>
  );
}
