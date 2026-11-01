import { Suspense } from "react";
import { Card, SiteShell, Skeleton } from "@/components/site/SiteShell";

export const metadata = { title: "Thank you · Setpoint Labs", robots: { index: false } };

const TEXT = {
  agreed: "Thank you. Your child's account is open and we have let them know.",
  refused: "The account and everything stored with it has been deleted.",
  gone: "This link has already been used or has expired.",
} as const;

async function Result({ searchParams }: { searchParams: PageProps<"/guardian/done">["searchParams"] }) {
  const r = (await searchParams).result;
  return <p className="text-[14px] text-[#4b5058]">{TEXT[(typeof r === "string" && r in TEXT ? r : "gone") as keyof typeof TEXT]}</p>;
}

export default function DonePage({ searchParams }: PageProps<"/guardian/done">) {
  return (
    <SiteShell>
      <Card kicker="Parent or guardian" title="Done">
        <Suspense fallback={<Skeleton />}>
          <Result searchParams={searchParams} />
        </Suspense>
      </Card>
    </SiteShell>
  );
}
