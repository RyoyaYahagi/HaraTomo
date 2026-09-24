# HaraTomo 開発準備

## 1. MVPで採用する構成

まずWebアプリとして作る。

### Stack

- Next.js
- TypeScript
- SQLite
- Drizzle ORM
- Zod
- LLM API

MVPでは単一Next.jsアプリにまとめる。

```text
HaraTomo/
├── app/
├── components/
├── lib/
│   ├── db/
│   ├── ai/
│   └── insights/
├── drizzle/
├── docs/
└── ...
```

以下はMVPでは導入しない。

- PostgreSQL
- Supabase
- Firebase
- Vector DB
- Redis
- Queue
- Background Worker
- Microservices
- Separate API server
- Authentication
- RLS
- Audit log

---

## 2. SQLite

MVPではSQLiteを直接利用する。

理由:

- 個人開発でセットアップが軽い
- SQLで時系列集計しやすい
- ローカルで完結できる
- 後から他のSQL DBへ移しやすい

注意:

公開デプロイする段階では、実行環境がSQLiteファイルを永続化できるか確認する必要がある。

MVPのローカル開発ではこの問題を先に解かない。

---

## 3. 最小AI Pipeline

### Input

```text
text
 ↓
LLM structured output
 ↓
Zod validation
 ↓
confirmation UI
 ↓
SQLite
```

まずtextだけで完成させる。

音声は後から:

```text
voice
 ↓
speech-to-text
 ↓
上と同じtext pipeline
```

に接続する。

---

## 4. LLM出力

最初はevent schemaを小さく保つ。

```ts
type EventDraft = {
  type: "meal" | "symptom" | "context";
  occurredAt: string;
  label: string;
  severity?: number;
  note?: string;
};
```

LLMに以下をやらせない。

- 症状率の計算
- 原因判定
- DB検索
- 数値の推測

---

## 5. DB

MVPでは細かい正規化をしすぎない。

最低限:

- events
- profile

だけから始める。

将来必要になった時点で:

- meal_items
- insights
- sources
- meal_plans
- pantry_items
- shopping_lists

などへ分離する。

---

## 6. Personal Memory

MVPではMemory Engineを作らない。

「AIが自分を知っている」体験はまず:

1. SQLiteに過去eventがある
2. profileに明示的な好みがある
3. 質問時にコードが必要なデータを取得
4. LLMへ渡す

だけで実現する。

```text
question
 ↓
SQL / TypeScript retrieval
 ↓
computed summary
 ↓
profile
 ↓
LLM
```

EmbeddingやVector Searchは必要になってから追加する。

---

## 7. Insight

MVPでは1種類だけ実装する。

**「症状の前6時間に何があったか」**

例:

腹痛10件について、その6時間前までのmeal/contextを取得する。

計算するもの:

- 症状件数
- 各labelの出現回数
- sample size

最初から以下は実装しない。

- baseline rate
- lift
- Bayesian update
- confounder adjustment
- causal inference
- ML
- custom confidence score
- N-of-1 experiment

必要性が見えてから追加する。

---

## 8. Authentication

ローカルMVPではログインを作らない。

単一ユーザー前提で十分。

公開して他のユーザーに使ってもらうタイミングで:

- Authentication
- user_id
- access control

を追加する。

---

## 9. Export / Delete

MVP:

- event単位の削除
- 全event削除
- JSON export

CSV、アカウント削除、複雑なprivacy dashboardは公開版まで後回し。

---

## 10. Testing

テストもMVP範囲に合わせる。

### 必須

- Zod schema validation
- event CRUD
- 日時処理
- 6時間window集計

### AI fixture

5〜10個程度の固定入力から始める。

例:

```text
昨日の昼に牛丼。夕方冷えて、夜8時に腹痛7くらい。
```

期待:

- meal: 牛丼
- context: 冷え
- symptom: 腹痛
- severity: 7

最初から大規模なAI evaluation基盤は作らない。

---

## 11. Error handling

最低限:

- LLM失敗時に元入力を失わない
- JSON parse / schema validation失敗を表示
- DB保存失敗を表示

高度なobservability基盤は不要。

development中はconsole / local logで十分。

---

## 12. 開発順序

### Step 1

Next.js + SQLite + Drizzleを起動。

### Step 2

手動フォームでevent CRUD。

AIなしでもTimelineを動かす。

### Step 3

自然文 → structured event。

### Step 4

確認UI → 保存。

### Step 5

症状前6時間の簡易Insight。

ここで最初のP0完成。

### Step 6

音声入力。

### Step 7

過去ログについてAIに質問。

### Step 8

簡単なprofile。

---

## 13. 将来まで作り込みすぎないルール

実装時は次を避ける。

- 将来用interfaceの大量作成
- 未使用のRepository abstraction
- Generic agent framework
- 複雑なplugin system
- 独自workflow engine
- 将来のモバイルアプリを想定した過剰なAPI分離
- 使っていないDBテーブル
- 早すぎるキャッシュ
- 早すぎる最適化

必要になったときに追加する。
