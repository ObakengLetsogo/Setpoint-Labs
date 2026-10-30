import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, isNull } from "drizzle-orm";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { assessmentRuns, certificates, memberships, organisations, users } from "@/db/schema";
import { CURRICULUM } from "@/data/curriculum";
import { SITE_URL } from "@/lib/config";
import { levelOfTrack } from "@/data/access";
import { hasLevel } from "./access";
import { runAssessment, type AssessmentResult } from "./assess";
import { audit } from "./billing";
import { db } from "./db";
import { mails } from "./email";
import { certificateCode, newId } from "./ids";

export const trackName = (trackId: string) => CURRICULUM.find((t) => t.id === trackId)?.name ?? trackId;

export type SubmitOutcome = AssessmentResult & { certificate?: string; note?: string };

/**
 * Marks a submission, stores the run, and on a pass issues the track certificate. Certificates
 * need a confirmed email and paid access; a pass without them is kept and counts later.
 */
export async function submitAssessment(user: { id: string; email: string; name: string; verified: boolean }, trackId: string, language: "ladder" | "st", source: string): Promise<SubmitOutcome> {
  const result = runAssessment(trackId, language, source);
  await db.insert(assessmentRuns).values({ id: newId(), userId: user.id, assessmentId: trackId, source, language, passed: result.passed, results: result.results });
  if (!result.passed) return result;

  const existing = (await db.select().from(certificates).where(and(eq(certificates.userId, user.id), eq(certificates.trackId, trackId), isNull(certificates.revokedAt))).limit(1))[0];
  if (existing) return { ...result, certificate: existing.code };
  if (!user.verified) return { ...result, note: "Passed. Confirm your email to receive the certificate." };
  if (!(await hasLevel(user.id, levelOfTrack(trackId)))) return { ...result, note: "Passed. Certificates come with this level's training; buy it and submit again." };

  // A learner on an institution seat gets that institution's name on the certificate.
  const org = (
    await db
      .select({ id: organisations.id })
      .from(memberships)
      .innerJoin(organisations, eq(organisations.id, memberships.organisationId))
      .where(and(eq(memberships.userId, user.id), eq(organisations.kind, "institution")))
      .limit(1)
  )[0];

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = certificateCode();
    try {
      await db.insert(certificates).values({ id: newId(), code, userId: user.id, trackId, nameOnCertificate: user.name, organisationId: org?.id ?? null });
      await audit(user.id, "certificate.issued", code, { trackId });
      await mails.certificate(user.email, trackName(trackId), code);
      return { ...result, certificate: code };
    } catch (e) {
      const dup = (e as { cause?: { code?: string } }).cause?.code === "ER_DUP_ENTRY";
      if (!dup) throw e;
      // A clash on the user and track means another request just issued it; on the code, retry.
      const again = (await db.select().from(certificates).where(and(eq(certificates.userId, user.id), eq(certificates.trackId, trackId))).limit(1))[0];
      if (again) return { ...result, certificate: again.code };
    }
  }
  throw new Error("could not allocate a certificate code");
}

export async function certificateByCode(code: string) {
  const rows = await db
    .select({ c: certificates, org: organisations.certificateName, orgName: organisations.name })
    .from(certificates)
    .leftJoin(organisations, eq(organisations.id, certificates.organisationId))
    .where(eq(certificates.code, code.toUpperCase()))
    .limit(1);
  const r = rows[0];
  if (!r) return null;
  return { ...r.c, issuer: r.org ?? r.orgName ?? null, track: trackName(r.c.trackId) };
}

/** An A4 landscape certificate with the name, track, date, code and where to verify it. */
export async function certificatePdf(cert: NonNullable<Awaited<ReturnType<typeof certificateByCode>>>) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Setpoint Labs certificate ${cert.code}`);
  pdf.setAuthor("Setpoint Labs");
  const page = pdf.addPage([842, 595]);
  const { width, height } = page.getSize();
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.106, 0.141, 0.188);
  const muted = rgb(0.42, 0.45, 0.49);
  const orange = rgb(0.949, 0.42, 0.114);

  page.drawRectangle({ x: 24, y: 24, width: width - 48, height: height - 48, borderColor: rgb(0.89, 0.9, 0.91), borderWidth: 1.5 });
  page.drawRectangle({ x: 24, y: height - 30, width: width - 48, height: 6, color: orange });

  const logo = await pdf.embedPng(await readFile(path.join(/*turbopackIgnore: true*/ process.cwd(), "public/brand/logo-horizontal.png")));
  const lw = 190;
  page.drawImage(logo, { x: (width - lw) / 2, y: height - 110, width: lw, height: (lw * logo.height) / logo.width });

  const centre = (text: string, y: number, font = sans, size = 12, color = ink) => page.drawText(text, { x: (width - font.widthOfTextAtSize(text, size)) / 2, y, size, font, color });
  centre("CERTIFICATE OF COMPLETION", height - 160, bold, 12, orange);
  centre("This certifies that", height - 205, sans, 13, muted);
  centre(cert.nameOnCertificate, height - 260, serif, 40);
  centre("has completed the practical assessment for", height - 300, sans, 13, muted);
  centre(cert.track, height - 340, bold, 24);
  if (cert.issuer) centre(`through ${cert.issuer}`, height - 368, sans, 12, muted);

  const issued = cert.issuedAt.toISOString().slice(0, 10);
  page.drawText(`Issued ${issued}`, { x: 70, y: 90, size: 11, font: sans, color: ink });
  page.drawText(`Certificate ${cert.code}`, { x: 70, y: 72, size: 11, font: bold, color: ink });
  const verify = `Verify at ${SITE_URL.replace(/^https?:\/\//, "")}/verify/${cert.code}`;
  page.drawText(verify, { x: width - 70 - sans.widthOfTextAtSize(verify, 11), y: 72, size: 11, font: sans, color: muted });
  centre("Setpoint Labs trains on simulated equipment. For education only, not for use on live plant.", 40, sans, 8.5, muted);
  return pdf.save();
}

export async function revokeCertificate(code: string, actorId: string) {
  await db.update(certificates).set({ revokedAt: new Date() }).where(eq(certificates.code, code));
  await audit(actorId, "certificate.revoked", code);
}

export const userName = async (id: string) => (await db.select({ name: users.name }).from(users).where(eq(users.id, id)).limit(1))[0]?.name;
