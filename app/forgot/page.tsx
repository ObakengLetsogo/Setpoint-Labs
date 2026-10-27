import { requestReset } from "@/app/actions/auth";
import { AuthForm } from "@/components/site/AuthForm";
import { Card, SiteShell } from "@/components/site/SiteShell";

export const metadata = { title: "Reset your password · Setpoint Labs" };

export default function ForgotPage() {
  return (
    <SiteShell>
      <Card kicker="Account" title="Reset your password">
        <p className="mb-5 text-[14px] leading-[1.6] text-[#4b5058]">Enter your email and we will send a link to choose a new password.</p>
        <AuthForm action={requestReset} submit="Send reset link" fields={[{ name: "email", label: "Email", type: "email", autoComplete: "email" }]} />
      </Card>
    </SiteShell>
  );
}
