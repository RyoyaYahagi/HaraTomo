import Link from "next/link";
import { Navigation } from "@/components/app/Navigation";
import { EventList } from "@/components/app/EventList";
import { getEventRepository } from "@/lib/db/events";

export const dynamic = "force-dynamic";

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const events = getEventRepository().listAll();
  const { created } = await searchParams;

  return (
    <main className="page-shell">
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="HaraTomo 記録">
          HaraTomo
        </Link>
        <Navigation current="timeline" />
      </header>
      <div className="page-content timeline-content">
        <h1>履歴</h1>
        {created ? <p className="visually-hidden" aria-live="polite">記録を保存しました。</p> : null}
        <EventList events={events} groupByDate clearDraftOnLoad={Boolean(created)} />
      </div>
    </main>
  );
}
