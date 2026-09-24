import Link from "next/link";
import { Navigation } from "@/components/app/Navigation";
import { RecordComposer } from "@/components/app/RecordComposer";
import { getEventRepository } from "@/lib/db/events";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const recentEvents = getEventRepository().listRecent(5);

  return (
    <main className="page-shell">
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="HaraTomo 記録">
          HaraTomo
        </Link>
        <Navigation current="record" />
      </header>
      <div className="page-content home-content">
        <RecordComposer recentEvents={recentEvents} />
      </div>
    </main>
  );
}
