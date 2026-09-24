# HaraTomo 開発準備

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
├── lib/
│   ├── ai/
│   │   ├── extract.ts
│   │   └── jev.ts
│   ├── db/
│   └── insights/
├── drizzle/
└── docs/
```

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
  rawType?: string;
  occurredAt?: string;
  label: string;
  severity?: number;
  note?: string;
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

MVPでは:

- events
- profile

だけから始める。

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
- created_at
- updated_at
```

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

すべてSQL / TypeScriptで計算する。

Jevを使わない。

- time difference
- grouping
- count
- sample size

をAIに委ねない。

---

## 8. Personalization

MVPではMemory Engineを作らない。

```text
SQLite events
 + profile
 + code-generated summary
        ↓
      LLM
```

必要ならJevでユーザー意図を固定カテゴリへ分類できるが、価値が出るまでは追加しない。

---

## 9. Testing

### deterministic

- Zod validation
- CRUD
- datetime
- 6h window

### LLM fixture

5〜10件から開始。

### Jev fixture

最低限:

1. event type
2. symptom normalization
3. context normalization
4. supportedBySource
5. needsClarification

について、明確例と曖昧例を用意する。

例:

```text
「20時に下痢した」
expected:
type = symptom
normalized = diarrhea
needsClarification = false
```

```text
「昨日なんかお腹微妙」
expected:
needsClarification = true
```

モデルやpromptを変更したらfixtureで回帰確認する。

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
音声。

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

**「固定候補の曖昧な判断か？」がYesのときだけJevを検討する。**
