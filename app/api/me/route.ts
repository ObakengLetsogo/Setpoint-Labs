import { accessFor } from "@/lib/server/access";
import { currentUser } from "@/lib/server/auth";

/** Who is signed in and whether they have paid access. Never cached. */
export async function GET() {
  const user = await currentUser();
  const access = await accessFor(user?.id);
  return Response.json(
    {
      user: user ? { name: user.name, email: user.email, verified: user.verified, role: user.role, platform: user.platform } : null,
      paid: access.paid,
      until: access.until,
      inGrace: access.inGrace,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
