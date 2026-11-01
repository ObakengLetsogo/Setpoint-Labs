import Link from "next/link";
import { Suspense } from "react";
import { signUp } from "@/app/actions/auth";
import { AuthForm } from "@/components/site/AuthForm";
import { Card, SiteShell, Skeleton } from "@/components/site/SiteShell";

export const metadata = { title: "Create an account · Setpoint Labs" };

async function Form({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <AuthForm
      action={signUp}
      submit="Create account"
      hidden={next ? { next } : {}}
      fields={[
        { name: "name", label: "Your name", autoComplete: "name", hint: "As it should appear on your certificates." },
        { name: "email", label: "Email", type: "email", autoComplete: "email" },
        { name: "password", label: "Password", type: "password", autoComplete: "new-password", hint: "At least 10 characters." },
        { name: "birthDate", label: "Date of birth", type: "date", autoComplete: "bday" },
        { name: "guardianName", label: "Parent or guardian's name (under 18 only)", autoComplete: "off", optional: true },
        { name: "guardianEmail", label: "Parent or guardian's email (under 18 only)", type: "email", autoComplete: "off", optional: true, hint: "If you are under 18 we email them to agree before your account opens, as the law (POPIA) requires." },
      ]}
    />
  );
}

export default function SignUpPage({ searchParams }: PageProps<"/signup">) {
  return (
    <SiteShell>
      <Card kicker="Free to start" title="Create your account">
        <p className="mb-5 text-[14px] leading-[1.6] text-[#4b5058]">Save your progress and programs, earn certificates, and unlock every track when you are ready.</p>
        <Suspense fallback={<Skeleton />}>
          <Form searchParams={searchParams as Promise<{ next?: string }>} />
        </Suspense>
        <p className="mt-5 text-[13px] text-[#4b5058]">
          Already have an account? <Link href="/login" className="font-medium text-ink hover:underline">Sign in</Link>
        </p>
      </Card>
    </SiteShell>
  );
}
