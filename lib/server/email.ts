import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { SITE_URL as PUBLIC_URL } from "@/lib/config";

/** Links in emails point at APP_URL when set, so development mail opens the development server. */
const SITE_URL = process.env.APP_URL ?? PUBLIC_URL;

// SMTP settings come from the environment. Without SMTP_HOST, mail is logged instead of sent, and
// the last messages are kept in memory for the development mailbox at /dev/mail.

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
  sentAt: string;
}

const globalForMail = globalThis as unknown as { transport?: Transporter; outbox?: Mail[] };
export const outbox: Mail[] = globalForMail.outbox ?? (globalForMail.outbox = []);

function transport(): Transporter | null {
  if (!process.env.SMTP_HOST) return null;
  globalForMail.transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return globalForMail.transport;
}

const FROM = () => process.env.MAIL_FROM ?? "Setpoint Labs <hello@setpointlabs.co.za>";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** A light, single column email with the logo, a heading, paragraphs and an optional button. */
function layout(title: string, paragraphs: string[], button?: { label: string; url: string }) {
  const body = paragraphs.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#3d434a">${esc(p)}</p>`).join("");
  const cta = button
    ? `<p style="margin:22px 0"><a href="${esc(button.url)}" style="display:inline-block;background:#f26b1d;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px;font-size:15px">${esc(button.label)}</a></p><p style="margin:0 0 14px;font-size:12px;color:#8a9097">If the button does not work, paste this link into your browser:<br>${esc(button.url)}</p>`
    : "";
  const html = `<!doctype html><html><body style="margin:0;background:#f4f5f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f6;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e4e6e9;border-radius:16px;padding:28px">
<tr><td><img src="${SITE_URL}/brand/logo-horizontal.png" alt="Setpoint Labs" height="32" style="display:block;margin-bottom:22px">
<h1 style="margin:0 0 16px;font-size:21px;color:#1b2430">${esc(title)}</h1>${body}${cta}
<p style="margin:24px 0 0;font-size:12px;color:#8a9097">Setpoint Labs. For education only, not for use on live plant.</p></td></tr></table>
</td></tr></table></body></html>`;
  const text = [title, "", ...paragraphs, ...(button ? ["", `${button.label}: ${button.url}`] : []), "", "Setpoint Labs"].join("\n");
  return { html, text };
}

export async function sendMail(to: string, subject: string, title: string, paragraphs: string[], button?: { label: string; url: string }) {
  const { html, text } = layout(title, paragraphs, button);
  const t = transport();
  if (t) await t.sendMail({ from: FROM(), to, subject, html, text });
  else console.info(`[mail] to ${to}: ${subject}${button ? ` -> ${button.url}` : ""}`);
  outbox.unshift({ to, subject, html, text, sentAt: new Date().toISOString() });
  outbox.splice(50);
}

// ── The transactional emails ────────────────────────────────────────────────

export const mails = {
  welcome: (to: string, name: string) =>
    sendMail(to, "Welcome to Setpoint Labs", `Welcome, ${name}`, ["Your account is ready. The first two Foundation chapters are free, and every machine is waiting on the bench."], { label: "Open the labs", url: SITE_URL }),
  verify: (to: string, token: string) =>
    sendMail(to, "Confirm your email", "Confirm your email", ["Tap the button to confirm this address. The link works for 48 hours."], { label: "Confirm email", url: `${SITE_URL}/verify-email?token=${token}` }),
  reset: (to: string, token: string) =>
    sendMail(to, "Reset your password", "Reset your password", ["Someone asked to reset the password for this account. If it was not you, ignore this email. The link works for one hour."], { label: "Choose a new password", url: `${SITE_URL}/reset?token=${token}` }),
  receipt: (to: string, lines: string[]) => sendMail(to, "Your Setpoint Labs receipt", "Payment received", lines, { label: "Go to your account", url: `${SITE_URL}/account` }),
  paymentFailed: (to: string, plan: string) =>
    sendMail(to, "Your payment did not go through", "Payment not completed", [`We could not complete your payment for ${plan}. Nothing was charged. You can try again from the pricing page.`], { label: "Try again", url: `${SITE_URL}/pricing` }),
  renewalReminder: (to: string, plan: string, ends: string) =>
    sendMail(to, "Your access ends soon", "Your access ends soon", [`Your ${plan} access ends on ${ends}. Renew to keep every track open. Your progress is kept either way.`], { label: "Renew now", url: `${SITE_URL}/pricing` }),
  expired: (to: string, plan: string, graceEnds: string) =>
    sendMail(to, "Your access has ended", "Your access has ended", [`Your ${plan} access has ended. Paid lessons stay open until ${graceEnds}, then they lock. Your progress and programs are kept.`], { label: "Renew now", url: `${SITE_URL}/pricing` }),
  certificate: (to: string, track: string, code: string) =>
    sendMail(to, `Certificate: ${track}`, "Your certificate is ready", [`Well done. You have completed ${track}. Your certificate code is ${code}; anyone can check it on the verify page.`], { label: "View certificate", url: `${SITE_URL}/verify/${code}` }),
  projectOpen: (to: string, due: string) =>
    sendMail(to, "Your Expert final project is open", "Your final plant project is open", [`You passed the Expert exam. Submit your final plant project by ${due}. An assessor will then review it and interview you for 30 minutes.`], { label: "Open the project", url: `${SITE_URL}/exams/project` }),
  interviewBooked: (to: string, when: string, link: string) =>
    sendMail(to, "Your Expert interview is booked", "Your interview is booked", [`Your 30 minute Expert interview is on ${when}, South African time.`, `Join here: ${link}. Have your project open and your ID ready.`], { label: "See your project", url: `${SITE_URL}/exams/project` }),
  projectDecided: (to: string, passed: boolean, feedback: string) =>
    sendMail(to, passed ? "Your Expert project is signed off" : "Your Expert project needs more work", passed ? "Signed off" : "Not yet", [passed ? "Your assessor has signed off your final project and interview." : "Your assessor did not sign off your project yet. You can resubmit within 30 days.", `Feedback: ${feedback}`], { label: "See your project", url: `${SITE_URL}/exams/project` }),
  practicalBooked: (to: string, title: string, when: string, venue: string) =>
    sendMail(to, `Booked: ${title}`, "Your practical day is booked", [`${title}, ${when}, at ${venue}. Lunch is included.`, "Bring closed shoes and your ID. You can cancel free until 7 days before the day."], { label: "See your bookings", url: `${SITE_URL}/practical` }),
  practicalCancelled: (to: string, title: string, when: string) =>
    sendMail(to, `Cancelled: ${title}`, "A practical day was cancelled", [`We had to cancel ${title} on ${when}. Your seat credit is back on your account so you can book another day.`, "We are sorry for the change of plan."], { label: "Book another day", url: `${SITE_URL}/practical` }),
  certExpiring: (to: string, level: string, code: string, date: string, expired: boolean) =>
    sendMail(to, expired ? `Your ${level} certificate has expired` : `Your ${level} certificate expires on ${date}`, expired ? "Certificate expired" : "Time to recertify", [expired ? `Your ${level} certificate ${code} expired on ${date}. Its verify page now shows it as expired.` : `Your ${level} certificate ${code} is valid until ${date}.`, "Renew it with a short recertification exam online: 20 questions in 30 minutes. Passing keeps your certificate code and adds 3 years."], { label: "Recertify", url: `${SITE_URL}/exams` }),
  recertified: (to: string, level: string, code: string, date: string) =>
    sendMail(to, `Your ${level} certificate is renewed`, "Recertified", [`You passed the recertification exam. Certificate ${code} is now valid until ${date}.`], { label: "See your certificate", url: `${SITE_URL}/verify/${code}` }),
  rplDecided: (to: string, status: "approved" | "declined" | "more_info", level: string, feedback: string) =>
    sendMail(
      to,
      status === "approved" ? `RPL approved: ${level}` : status === "declined" ? "Your RPL application" : "Your RPL application needs more information",
      status === "approved" ? "Prior learning recognised" : status === "declined" ? "Not approved this time" : "More information needed",
      [
        status === "approved" ? `An assessor has recognised your prior learning at ${level} level. You can now sit the ${level} exam, theory and practical, without the earlier levels or the course.` : status === "declined" ? "An assessor has reviewed your application and could not recognise your prior learning at this level yet. You can apply again after 90 days, or take the course." : "An assessor needs more from you before deciding. Update your application and send it again.",
        `Assessor's note: ${feedback}`,
      ],
      { label: status === "approved" ? "Go to exams" : "See your application", url: `${SITE_URL}/${status === "approved" ? "exams" : "rpl"}` },
    ),
};
