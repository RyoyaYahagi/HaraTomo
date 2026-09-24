import Link from "next/link";
import { EventEditor } from "@/components/app/EventEditor";
import { Navigation } from "@/components/app/Navigation";

export default function NewEventPage() {
  return (
    <main className="page-shell">
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="HaraTomo 記録">
          HaraTomo
        </Link>
        <Navigation current="record" />
      </header>
      <div className="page-content editor-content">
        <h1>記録を追加</h1>
        <p className="muted">1件の出来事を入力してください。</p>
        <EventEditor />
      </div>
    </main>
  );
}
