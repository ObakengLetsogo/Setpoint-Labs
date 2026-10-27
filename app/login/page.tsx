import Link from "next/link";
import { Suspense } from "react";
import { signIn } from "@/app/actions/auth";
import { AuthForm } from "@/components/site/AuthForm";
import { Card, SiteShell, Skeleton } from "@/components/site/SiteShell";

export const metadata = { title: "Sign in · Setpoint Labs" };

async function Form({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <AuthForm
      action={signIn}
      submit="Sign in"
      hidden={next ? { next } : {}}
      fields={[
        { name: "email", label: "Email", type: "email", autoComplete: "email" },
        { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
      ]}
    />
  );
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <SiteShell>
      <Card kicker="Welcome back" title="Sign in">
        <Suspense fallback={<Skeleton />}>
          <Form searchParams={searchParams as Promise<{ next?: string }>} />
        </Suspense>
        <div className="mt-5 flex justify-between text-[13px]">
          <Link href="/forgot" className="text-[#d9591a] hover:underline">Forgot your password?</Link>
          <Link href="/signup" className="text-ink hover:underline">Create an account</Link>
        </div>
      </Card>
    </SiteShell>
  );
}
