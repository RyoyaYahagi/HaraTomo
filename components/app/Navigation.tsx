import Link from "next/link";

export function Navigation({ current }: { current: "record" | "timeline" | "insights" }) {
  return (
    <nav aria-label="メインナビゲーション" className="main-navigation">
      <Link aria-current={current === "record" ? "page" : undefined} href="/">
        記録
      </Link>
      <Link aria-current={current === "timeline" ? "page" : undefined} href="/timeline">
        履歴
      </Link>
      <Link aria-current={current === "insights" ? "page" : undefined} href="/insights">
        振り返り
      </Link>
    </nav>
  );
}
