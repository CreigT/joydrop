import type { Metadata } from "next";
import { CardUnlock } from "@/components/cards/CardUnlock";
import { SESSION_ID_PATTERN } from "@/lib/stripe";
import { sponsoredDescription, SPONSOR_TEXT } from "@/lib/site";

export const metadata: Metadata = {
  title: "Your card | JoyDrop",
  description: sponsoredDescription("Download and share your paid JoyDrop card."),
  robots: { index: false },
  other: { sponsor: SPONSOR_TEXT }
};

export const dynamic = "force-dynamic";

export default function CardSuccessPage({
  searchParams
}: {
  searchParams: { session_id?: string };
}) {
  const raw = searchParams.session_id;
  const sessionId = raw && SESSION_ID_PATTERN.test(raw) ? raw : null;
  return (
    <main className="min-h-screen bg-bg px-5 py-8">
      <CardUnlock sessionId={sessionId} />
    </main>
  );
}
