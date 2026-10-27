import { Suspense } from "react";
import { resetPassword } from "@/app/actions/auth";
import { AuthForm } from "@/components/site/AuthForm";
import { Card, SiteShell, Skeleton } from "@/components/site/SiteShell";

export const metadata = { title: "Choose a new password · Setpoint Labs" };

async function Form({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <AuthForm action={resetPassword} submit="Save new password" hidden={{ token }} fields={[{ name: "password", label: "New password", type: "password", autoComplete: "new-password", hint: "At least 10 characters." }]} />;
}

export default function ResetPage({ searchParams }: PageProps<"/reset">) {
  return (
    <SiteShell>
      <Card kicker="Account" title="Choose a new password">
        <Suspense fallback={<Skeleton />}>
          <Form searchParams={searchParams as Promise<{ token?: string }>} />
        </Suspense>
      </Card>
    </SiteShell>
  );
}
