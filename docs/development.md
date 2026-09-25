# HaraTomo 開発準備

## Git 運用

機能や修正のまとまりごとに、ローカル `develop` から作業ブランチを作る。

```sh
git switch develop
git switch -c codex/<task>
```

`<task>` は作業内容が分かる短い kebab-case 名にする。実装コミットは `codex/<task>` 上で作り、`main` と `develop` には直接作らない。

作業ブランチでは、リポジトリで利用できる型チェック・テスト・ビルドなどの決定的な検証を実行し、差分をレビューする。成功した検証と残る制約を記録してから `develop` に統合する。今回のLLM/Jev接続では、実APIを使う動作確認は後日行い、統合条件には含めない。利用可能な決定的検証がない場合は、その事実を完了報告に記す。

統合後は `develop` 上で状態とコミット履歴を確認する。`main` への統合は別途指定されたリリース手順に従う。明示的な依頼がない限り、GitHubへのpushやPull Request作成は行わない。

## 1. MVP Stack

- Next.js
- TypeScript
- SQLite
- Drizzle ORM
- Zod
- LLM API
- Jev

単一Next.jsアプリとして作る。

```text
HaraTomo/
├── app/
├── components/
│   ├── ui/          # generic UI primitives
│   └── app/         # HaraTomo固有component
├── lib/
│   ├── ai/
│   │   ├── extract.ts
│   │   └── jev.ts
│   ├── db/
│   └── insights/
├── drizzle/
└── docs/
    ├── PRODUCT.md
    ├── UX.md
    ├── DESIGN.md
    └── AI_UI_PROMPT.md
```

`components/ui/` はButton / Input / Dialogなどアプリ固有の意味を持たないprimitiveに限定する。

`components/app/` はEventRow / NaturalLanguageEntry / MealItemなどHaraTomoのdomainを含むcomponentを置く。

空directoryは作らず、必要なcomponentを実装するときに作成する。将来の再利用を想定した先回りの抽象化はしない。

MVPでは以下を導入しない。

- PostgreSQL / Supabase / Firebase
- Vector DB
- Redis / Queue
- Background Worker
- Microservices
- Separate API Server
- Authentication / RLS
- Generic Agent Framework

---

## 2. AIアーキテクチャ

基本原則:

```text
自由生成・抽出 → LLM
固定候補からの判断 → Jev
確定計算 → TypeScript / SQL
型保証 → Zod
保存 → SQLite
```

### Input Pipeline

```text
raw text
  ↓
LLM extraction
  ↓
Jev decisions
  ├─ eventType Choice
  ├─ normalizedLabel Choice
  ├─ supportedBySource Boolean
  └─ needsClarification Boolean
  ↓
Zod
  ↓
confirmation when needed
  ↓
SQLite
```

JevをLLMの代替として全面利用しない。

現行のP0記録画面はGeminiで候補を抽出し、Jevで種類・症状/生活要因の分類・元文支持・追加確認要否を判定する。初期実装では、曖昧さに関係なく全候補を確認画面へ出す。日付が省略された候補には利用日の現地日付を入れ、時刻が省略・曖昧な候補は空欄にして保存前の入力を必須にする。Jevが失敗した候補も元文とGemini候補を保持して確認画面に出す。Geminiまたは出力schema検証が失敗した場合はHomeの下書きを保持し、手動入力へ進める。

音声入力はPCブラウザーで最大60秒録音する補助経路とする。ブラウザーが録音時間を制限し、Next.jsのNode runtime routeは音声の受信サイズを10 MiB以下に検証する。routeは音声を`@google/genai` Files APIへ一時アップロードして `gemini-3.5-transcribe` Interactions APIで逐語文字起こしする。routeは処理後にFiles APIで削除を試みる。削除に失敗しても利用可能な文字起こしは返し、音声がGemini上に残っている可能性を画面に表示する。文字起こし自体にも失敗した場合は入力文を保持し、必要なら再録音できることを案内する。ブラウザーはMediaRecorderの全チャンクをまとめ、停止後にマイクtrackとBlob参照を解放する。文字起こし結果をHomeの既存下書きへ追記する。「記録する」を押されるまではEvent候補を抽出しない。音声ファイルをSQLiteまたはローカルディスクへ保存しない。この経路は `GEMINI_API_KEY` だけを使う。

接続形はGoogleの[音声文字起こしガイド](https://ai.google.dev/gemini-api/docs/transcribe)と導入済み `@google/genai` 型定義を基準にする。言語ヒントは日本語（`ja-JP`）、転記モードは逐語（`verbatim`）に固定する。

#### JavaScript SDK接続

- Gemini: `@google/genai` の `GoogleGenAI.models.generateContent()` をサーバー側で呼び、JSON Schema付きJSONを受け取ってZodで再検証する。現行モデル識別子は `gemini-3.5-flash-lite`。
- Jev: `@typesafe-ai/sdk` の `TypeSafeClient.systemOne()` に `choice()` と `noul()` の質問を渡す。現行の既定モデル識別子は `jev-latest`。SDKの `noul` はYesの確率を返すため、Boolean判断へ変換する境界は0.5とする。この確率は画面へ出さない。
- 接続コードは`server-only`とし、キーは `GEMINI_API_KEY` と `TYPESAFE_API_KEY` からだけ読む。追跡対象の `.env.example` は空欄にする。開発者ごとの `.env.local` はGitへ追加しない。
- 複数候補の保存はSQLite transactionでまとめる。途中のDB書き込みが失敗した場合は全件を取り消す。
- fixtureテストはAPIを呼び出さず、実APIによる確認は後日行う。

SDKの呼び出し形とモデル識別子は、2026-09-24に確認した公式資料と導入済みSDK型定義に基づく。

- [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output)
- [Gemini generateContent API](https://ai.google.dev/api/generate-content)
- [TypeSafe JavaScript SDK](https://github.com/typesafe-ai/typesafe-sdk-js)
- [TypeSafe JavaScript SDK documentation](https://docs.typesafe.ai/sdk/javascript)

---

## 3. LLM

LLMは出力空間を固定しづらい処理に使う。

例:

- 「ミラノ風ドリア」など自由な料理名
- note
- 自然文の分割
- 相対時刻の解釈候補
- ユーザー向け説明

EventDraft例:

```ts
type RawEventDraft = {
  rawType: "meal" | "symptom" | "context" | "other" | null;
  date: string | null;
  time: string | null;
  label: string;
  severity: number | null;
  note: string | null;
};
```

---

## 4. Jev

Jevは **Choice / Boolean / Score が自然な判断だけ**に使う。

### 4.1 event type

```ts
type EventType =
  | "meal"
  | "symptom"
  | "context"
  | "other";
```

LLMに長い説明をさせる必要がない分類なのでJev向き。

### 4.2 normalization

例:

```text
input label: お腹が張る
Choice:
- abdominal_pain
- diarrhea
- constipation
- bloating
- gas
- nausea
- indigestion
- bowel_sound
- other
```

元のlabelは失わない。

### 4.3 source verification

```text
Boolean:
candidateはraw textに支持されているか
```

これを医学的な真偽判定には使わない。

### 4.4 clarification gate

```text
Boolean:
このeventを記録する前に追加質問が必要か
```

高確率で不要な場合のみ確認を省略する設計は、十分なfixture評価後に有効化する。

### 4.5 Score

P0では基本的に不要。

将来、複数候補への適合度評価が必要になったら使う。

---

## 5. Jev confidenceの扱い

Jevが返す確率を:

- 症状の原因確率
- 医学的リスク
- ユーザーが安全に食べられる確率

として解釈しない。

あくまで:

**「このChoice / Boolean判断についてモデルがどの程度確信しているか」**

として使う。

thresholdはコードに定数として置き、fixtureで調整する。

例:

```ts
const AUTO_ACCEPT_THRESHOLD = 0.95;
```

ただしP0初期では自動保存を急がず、まず確認UIありで評価する。

---

## 6. SQLite

P0では:

- events

だけを作る。profileはP1で必要になった時点で追加する。

```text
events
- id
- type
- occurred_at
- label
- normalized_label?
- severity?
- note?
- raw_text?
- created_at (UTC ISO 8601)
- updated_at (UTC ISO 8601)
```

`type`は`meal`、`symptom`、`context`、`other`のいずれかとする。`severity`は症状に限り、0〜10の整数を保存する。PC現地時刻で入力・表示し、DBではUTCのISO 8601文字列に統一する。

Jev専用テーブルは作らない。

必要ならdevelopment/debug logとして:

- decision name
- selected value
- probability
- model/version

を一時保存する程度から始める。

---

## 7. Insight

MVPは「症状の前6時間に何があったか」だけ。

表示時に全イベントを読み、TypeScriptで計算する。Insight専用のテーブルやAI呼び出しは作らない。症状はnormalized labelがあればそれ、なければraw labelでグループ化する。各グループの分母は要因の有無によらず、その種類の全症状記録数とする。症状時刻の6時間前ちょうど以上、症状時刻未満のmeal/contextを対象にする。1つの症状記録の範囲内で、同じmeal raw labelまたはcontext normalized label（なければraw label）は一度だけ数える。`other`と`symptom`は要因に含めない。

Jevを使わない。

次の計算はすべてコードで行い、AIには委ねない。

画面は症状カテゴリ別に要因の件数を `該当した症状記録数 / グループ内の症状記録数` として表示する。百分率、原因、危険度、診断は表示しない。

- time difference
- grouping
- count
- sample size

---

## 8. Personalization

MVPではMemory Engineを作らない。

```text
SQLite events
 + code-generated summary
        ↓
      LLM
```

profileはP1で必要になった場合にのみこの要約へ含める。必要ならJevでユーザー意図を固定カテゴリへ分類できるが、価値が出るまでは追加しない。

---

## 9. Testing

### deterministic

通常の変更では、まずAPIを呼ばない決定的テストを使う。

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

`tests/ai-pipeline.test.ts` はGemini/Jevをfixtureへ差し替えてpipelineのfallbackやvalidationを確認する。
`tests/eval-dataset.test.ts` は実APIを呼ばず、AI評価データセットが20件・smokeが5件であることと最低限の形式を確認する。

### live AI eval

`eval/cases.json` に20件の固定評価ケースを置く。5件だけ `smoke: true` とし、日常的な短い確認に使う。

```sh
# .env.local等で GEMINI_API_KEY / TYPESAFE_API_KEY を設定
npm run eval:smoke  # 5件
npm run eval:ai     # 20件
```

live evalは実際のGemini/Jev APIを呼ぶため、CIでは実行しない。モデル、prompt、schema、Jev criteriaを変更したときは20件を実行し、通常の実装確認では必要に応じて5件のsmokeだけを使う。

評価は自由な料理名などの完全一致ではなく、主に次を見る。

- event数
- event type
- normalized label
- 明示された時刻
- 明示されたseverity
- 時刻が曖昧な場合のneedsClarification

失敗時は実際のReviewDraftを表示し、期待値が過度に厳しいのか、モデル挙動が退行したのかを確認する。

### browser E2E

固定happy-pathはPlaywrightで1本だけ持つ。CIではAI APIを使わず、専用SQLiteへ手動eventを保存し、Timelineへ表示されるところまで確認する。

ローカルで実行する場合はPlaywrightを一時インストールする。

```sh
npm install --no-save --package-lock=false @playwright/test@1.63.0
npx playwright install chromium
npx playwright test
```

Playwrightをpackage.jsonへ常設しないのは、MVPでブラウザテストが1本だけのため。E2Eが増えたらdevDependency化してpackage-lockへ固定する。

StagehandはPlaywright系のブラウザ操作にAIの `act` / `extract` / `observe` を組み合わせられるが、現時点のCI gateは固定操作だけなので使わない。将来、UI変更への自己修復や探索的なブラウザテストが必要になった場合に追加を検討する。固定happy-pathはPlaywright locatorの方が決定的で、追加のLLM APIキーや推論コストも不要。

### CI

`.github/workflows/ci.yml` は `develop` / `main` へのpushとPull Requestで次を実行する。

1. npm ci
2. lint
3. typecheck
4. node test
5. Next.js build
6. Playwright + ChromiumをCI内だけ一時インストール
7. browser happy-path

Gemini/JevのsecretはCIに登録しない。

---

## 10. Error Handling

- LLM失敗時もraw textを保持
- Jev失敗時はLLM結果を勝手に確定せず確認UIへfallback
- schema validation失敗も確認UIへ
- DB failureを表示

Jevが落ちても記録不能にならないようにする。

---

## 11. 開発順序

### Step 1
Next.js + SQLite + Drizzle。

### Step 2
手動event CRUD + Timeline。

### Step 3
自然文 → LLM EventDraft。

### Step 4
Jev event type / normalization。

### Step 5
Jev supportedBySource / needsClarification。

### Step 6
Zod + confirmation UI + SQLite保存。

### Step 7
6時間Insight。

ここでP0。

### Step 8
音声入力。

### Step 9
AI Ask / profile。

---

## 12. YAGNI

次を避ける。

- Jev用の独自framework
- 全判断をJev化
- 全出力をScore化
- 将来用interfaceの大量作成
- generic agent framework
- workflow engine
- 未使用テーブル
- 早すぎるcache
- 過剰なAPI分離
- 将来用のUI component大量作成
- design system packageの先行導入

**「固定候補の曖昧な判断か？」がYesのときだけJevを検討する。**
