import Link from "next/link";

export function Navigation({ current }: { current: "record" | "timeline" }) {
  return (
    <nav aria-label="メインナビゲーション" className="main-navigation">
      <Link aria-current={current === "record" ? "page" : undefined} href="/">
        記録
      </Link>
      <Link aria-current={current === "timeline" ? "page" : undefined} href="/timeline">
        履歴
      </Link>
    </nav>
  );
}
