import Link from "next/link";
import { Navigation } from "@/components/app/Navigation";
import { SimpleInsightList } from "@/components/app/SimpleInsightList";
import { getEventRepository } from "@/lib/db/events";
import { calculateSimpleInsights } from "@/lib/insights/simple-insight";

export const dynamic = "force-dynamic";

export default function InsightsPage() {
  const insights = calculateSimpleInsights(getEventRepository().listAll());

  return (
    <main className="page-shell">
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="HaraTomo 記録">
          HaraTomo
        </Link>
        <Navigation current="insights" />
      </header>
      <div className="page-content insight-content">
        <h1>振り返り</h1>
        <p className="muted">症状の前6時間に記録されていた食事や生活の出来事です。</p>
        <SimpleInsightList insights={insights} />
      </div>
    </main>
  );
}
