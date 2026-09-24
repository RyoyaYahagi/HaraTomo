"use client";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="page-shell">
      <div className="page-content editor-content" role="alert">
        <h1>記録を読み込めませんでした</h1>
        <p className="muted">保存先に接続できないか、処理に失敗しました。少し待ってから再度お試しください。</p>
        <button className="button button-primary" type="button" onClick={reset}>
          再試行
        </button>
      </div>
    </main>
  );
}
