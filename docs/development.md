# HaraTomo 開発準備

## 1. 最初に決める技術選定

### Mobile

候補:

#### React Native + Expo

向いている場合:

- TypeScriptで統一したい
- Web/Node経験を活かしたい
- 開発速度を重視
- 将来的にAndroidも視野

#### Swift / SwiftUI

向いている場合:

- iOSを最優先
- HealthKit / Siri / App Intents等を深く使いたい
- Appleプラットフォームとの統合を重視

現時点の構想では、MVP速度重視なら React Native + Expo、Apple連携を強くするなら SwiftUI が有力。

---

## 2. Backend

必要機能:

- Authentication
- REST / RPC API
- PostgreSQL
- Vector / semantic search
- background jobs
- scheduled jobs
- AI gateway
- Web search
- audit log

候補:

- Supabase
- Firebase
- Cloudflare
- Vercel + managed DB
- AWS / GCP

MVPでは運用負荷を減らすため、Supabase等のmanaged backendが扱いやすい。

---

## 3. DBで最初に持つべき概念

詳細は data-model.md 参照。

重要なのは、すべてを `food_logs` に押し込まず、**Event + typed detail** 的に扱えること。

候補:

- users
- events
- meals
- meal_items
- symptoms
- context_events
- memories
- observations
- insights
- sources

将来:

- meal_plans
- recipes
- pantry_items
- shopping_lists
- restaurants
- menu_items

---

## 4. AI Pipeline

### Input

```
voice
  ↓
speech-to-text
  ↓
raw utterance
  ↓
LLM structured extraction
  ↓
schema validation
  ↓
user confirmation
  ↓
DB
```

### Ask

```
user question
  ↓
intent detection
  ↓
SQL / retrieval
  ↓
deterministic calculation
  ↓
relevant memories
  ↓
LLM answer generation
  ↓
evidence links
```

重要:

**LLMにDB全体を渡して集計させない。**

検索・件数・割合・時間計算はコードで行う。

---

## 5. Personal Memory

Memoryはチャット履歴そのものとは分ける。

例:

```json
{
  "type": "food_preference",
  "statement": "朝は調理に10分以上かけたくない",
  "source": "user_explicit",
  "confidence": 1.0
}
```

```json
{
  "type": "learned_pattern",
  "statement": "睡眠6時間未満かつ辛い食事の日に腹痛が多い",
  "source": "computed",
  "support_count": 8,
  "confidence": 0.64
}
```

**ユーザーが明示的に話した事実**と、**システムが推測した傾向**を分離する。

---

## 6. Insight Engine

MVPでは高度なMLより、透明な集計から始める。

### 最初に実装する候補

症状時刻を (t_s)、食事・要因を (t_e) とする。

```
0 < t_s - t_e <= window
```

を満たすイベントを紐付ける。

window例:

- 2h
- 4h
- 6h
- 12h
- 24h

食品/要因ごとに

- exposures
- symptoms_after_exposure
- symptom_rate
- baseline_rate
- lift
- sample size

を計算する。

将来的に:

- conditional analysis
- confounder adjustment
- Bayesian update
- N-of-1 experiment
- time-series model

を検討。

---

## 7. External Food Data

外食情報はWeb検索だけに依存しない。

保存したいmetadata:

- source_url
- source_type
- retrieved_at
- official / unofficial
- raw snapshot hash
- parsed fields

更新されたメニュー情報と古い履歴を混同しないように、取得時点を必ず保持する。

---

## 8. Testing

### Unit

- Event parsing後のschema
- 時刻変換
- exposure window計算
- insight集計
- pantry quantity
- expiration logic

### Integration

- STT → extraction → DB
- chat → retrieval → answer
- web menu retrieval
- auth

### AI Evaluation

固定テストセットを用意する。

例:

入力:

```
昨日の昼に牛丼。夕方冷えて、夜8時に腹痛7くらい。
```

期待:

- meal: 牛丼
- context: 冷え
- symptom: 腹痛
- severity: 7
- relative dates correctly resolved

評価項目:

- event type
- datetime
- entity
- severity
- hallucination
- missing information

---

## 9. Observability

最低限記録する。

- request id
- model
- latency
- token usage
- parse success/failure
- retrieval source
- tool errors

健康情報そのものを平文application logへ残さないよう注意。

---

## 10. セキュリティ

- LLM API keyはserver-side
- secrets manager / environment variables
- Row Level Security
- user_idベースのデータ分離
- rate limit
- prompt injection対策
- fetched Web contentを命令として扱わない
- URL allow/deny policy
- dependency scan
- secret scan

---

## 11. 開発の最初のIssue候補

### P0

1. Product scope / MVP確定
2. Tech stack決定
3. Repository scaffold
4. DB schema v0
5. Authentication
6. Timeline CRUD
7. Text → structured event extraction
8. Voice input
9. Confirmation/edit UI
10. Basic insight calculation
11. AI chat over own logs
12. Privacy / delete / export

### P1

13. External restaurant/menu lookup
14. Source citation
15. Memory management UI
16. Notifications
17. Meal planning prototype

### P2

18. Pantry
19. Expiration
20. Grocery list
21. Receipt / barcode
22. Agent automation

---

## 12. MVP完成条件

以下のシナリオが一通り動けばMVPとする。

1. ユーザーが音声で今日の出来事を話す
2. 食事・症状・冷え等へ正しく分解される
3. ユーザーが修正して保存できる
4. タイムラインで確認できる
5. 数週間分のログから簡易パターンを計算できる
6. 「最近お腹を壊した日の共通点は？」と質問できる
7. AIが実データに基づいて回答し、観測数の少なさを隠さない
8. ユーザー自身がデータを削除・エクスポートできる
