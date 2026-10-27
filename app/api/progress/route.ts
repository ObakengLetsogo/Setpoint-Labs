import { z } from "zod";
import { metaOf } from "@/data/catalog";
import { canOpenLesson } from "@/lib/server/access";
import { currentUser } from "@/lib/server/auth";
import { markProgress, progressOf, recordQuiz } from "@/lib/server/progress";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorised" }, { status: 401 });
  return Response.json(await progressOf(user.id), { headers: NO_STORE });
}

const Body = z.object({
  lessonId: z.string().max(60),
  status: z.enum(["ran", "completed"]).optional(),
  quiz: z.object({ score: z.number().int().min(0).max(50), total: z.number().int().min(1).max(50) }).optional(),
});

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorised" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !metaOf(parsed.data.lessonId)) return Response.json({ error: "bad request" }, { status: 400 });
  const { lessonId, status, quiz } = parsed.data;
  if (!(await canOpenLesson(user.id, lessonId))) return Response.json({ error: "upgrade" }, { status: 402 });
  if (status) await markProgress(user.id, lessonId, status);
  if (quiz && quiz.score <= quiz.total) await recordQuiz(user.id, lessonId, quiz.score, quiz.total);
  return Response.json({ ok: true }, { headers: NO_STORE });
}
