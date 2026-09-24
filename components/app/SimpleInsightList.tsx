import type { SimpleInsight } from "@/lib/insights/simple-insight";

export function SimpleInsightList({ insights }: { insights: SimpleInsight[] }) {
  if (insights.length === 0) {
    return <p className="muted">症状の記録がまだありません。記録が増えると、ここに表示します。</p>;
  }

  return (
    <div className="insight-groups">
      {insights.map((insight) => (
        <section aria-labelledby={`insight-${insight.key}`} className="insight-group" key={insight.key}>
          <h2 id={`insight-${insight.key}`}>{insight.symptomLabel}</h2>
          <p className="muted">{insight.symptomCount}件の{insight.symptomLabel}の記録</p>
          {insight.factors.length > 0 ? (
            <ul className="insight-list">
              {insight.factors.map((factor) => (
                <li key={factor.key}>
                  <span>{factor.label}</span>
                  <span>{factor.symptomCount} / {insight.symptomCount}回</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">症状前6時間に食事や生活の記録はありません。</p>
          )}
        </section>
      ))}
    </div>
  );
}
