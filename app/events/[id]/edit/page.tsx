import Link from "next/link";
import { notFound } from "next/navigation";
import { EventEditor } from "@/components/app/EventEditor";
import { Navigation } from "@/components/app/Navigation";
import { getEventRepository } from "@/lib/db/events";

export const dynamic = "force-dynamic";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  if (!/^\d+$/.test(rawId)) notFound();
  const event = getEventRepository().getById(Number(rawId));
  if (!event) notFound();

  return (
    <main className="page-shell">
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="HaraTomo 記録">
          HaraTomo
        </Link>
        <Navigation current="timeline" />
      </header>
      <div className="page-content editor-content">
        <h1>記録を編集</h1>
        <EventEditor key={event.id} event={event} />
      </div>
    </main>
  );
}
