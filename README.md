# HaraTomo

**HaraTomo（はらとも）** は、胃腸が弱い人のための「自分のことを知っている食生活AIエージェント」を目指すWebアプリです。

食事・腹痛・下痢・膨満感だけでなく、冷え・睡眠・ストレスなども自然文でまとめて記録し、ユーザー自身の履歴から「どんな条件のときに調子を崩しやすいか」を振り返れるようにします。

将来的には、献立、買い物リスト、冷蔵庫在庫、賞味期限、外食時のメニュー選びまで同じエージェントにつなげます。

> 目標は「毎回フォームに食事を記録すること」ではなく、  
> **自分のお腹に関する出来事をAIに話すだけで、記録と振り返りが済むこと**。

---

## MVPで確認したい価値

最初から「食生活OS」を作るのではなく、まず次を検証します。

**自然文で簡単に記録すると、自分のお腹の傾向を後から振り返れることに価値があるか。**

例:

> 「昼にラーメン。夕方かなり冷えて、20時に下痢。腹痛は6くらい。」

処理イメージ:

```text
自然文
  ↓
LLM: 自由な文字列・日時・出来事を抽出
  ↓
Jev: 固定候補から分類・妥当性・聞き返し要否を判断
  ↓
Zod: schema validation
  ↓
必要な箇所だけ確認・修正
  ↓
SQLite
```

役割を分ける。

- **LLM**: 自由文を読む・自由な値を抽出する・説明文を書く
- **Jev**: Choice / Boolean / Scoreで表せる曖昧な判断
- **コード**: 日時計算・集計・保存・検索・ルール判定

---

## MVP

### P0

- [ ] 自然文入力
- [ ] マイクからの音声入力
- [ ] LLMによる出来事候補の抽出
- [ ] Jevによるevent分類・正規化
- [ ] Jevによる抽出妥当性 / 聞き返し要否の判定
- [ ] Zod validation
- [ ] 必要な箇所だけ確認・修正
- [ ] SQLiteへの保存
- [ ] 時系列タイムライン
- [ ] ログの編集・削除
- [ ] 症状前6時間の簡単な傾向表示

### P1

- [ ] 自分の履歴についてAIに質問
- [ ] 簡単なプロフィール・好み
- [ ] JSONエクスポート

### MVPではやらない

- ログイン・複数ユーザー
- Vector DB / Embedding
- 高度なAI Memory
- 因果推論
- 外食Web検索
- 献立
- 在庫・賞味期限
- 買い物リスト
- Push通知
- HealthKit / Siri
- Background Job
- Generic Agent Framework
- 複雑なマイクロサービス

---

## MVP技術スタック

- **Web:** Next.js + TypeScript
- **DB:** SQLite
- **ORM:** Drizzle ORM
- **Validation:** Zod
- **自由抽出・文章生成:** LLM API
- **分類・判断:** Jev
- **構成:** 単一Next.jsアプリ

Gemini (`@google/genai`) とJev (`@typesafe-ai/sdk`) はNext.jsサーバー側から接続する。環境変数名は `.env.example` を参照する。APIキーを設定していない開発環境ではAI解析と実API確認は利用できないが、手動記録とfixtureによる決定的テストは利用できる。

```text
Browser
  ↓
Next.js
  ├─ UI
  ├─ LLM extraction
  ├─ Jev decisions
  ├─ TypeScript calculations
  └─ SQLite
```

---

## AI / Jev / Code の境界

### LLM

- 「ラーメン」のような自由な料理名抽出
- 自由記述のnote
- 相対日時の候補抽出
- AIチャットの自然な回答

### Jev

固定された出力空間にできるものだけ使う。

例:

```text
Choice eventType
- meal
- symptom
- context
- other
```

```text
Choice normalizedSymptom
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

```text
Boolean supportedBySource
Boolean needsClarification
```

Jevの確率は「医学的確信度」ではなく、**そのモデル判断の確からしさ**としてのみ扱う。

### Code / SQLite

- 日時の確定・時間差
- 6時間window
- count / grouping
- CRUD
- 過去ログ検索
- 在庫や賞味期限（将来）
- 数学的に確定できるルール

**コードで決められることをAIに決めさせない。**

---

## 最小データモデル

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

P0では`events`だけを作る。プロフィール情報はP1で必要になった時点で追加する。

Jevの判断結果は、必要にならない限り専用テーブルを作らない。debug用に一時ログへ残す程度から始める。

---

## 将来像

1. 音声で記録
2. 外食情報取得
3. 1週間の献立
4. 献立を食事ログとして再利用
5. 買い物リスト
6. 冷蔵庫・賞味期限
7. 体調・予定・在庫まで見て動く食生活エージェント

将来、複数候補から選ぶ処理にもJevを利用できる。

例:

- 外食メニュー候補からユーザー嗜好に合う候補を選ぶ
- 献立候補から現在の条件に合う候補を選ぶ
- 通知する / しない
- 追加質問する / しない

ただし、医学的な安全性や原因判定をJev単独で決めない。

---

## プロダクト原則

1. **入力を増やさない**
2. **AIが原因を断定しない**
3. **本人の記録とAIの推測を分ける**
4. **自由生成・曖昧判断・確定計算を分離する**
5. **数値はコードで計算する**
6. **ユーザーが記録を修正・削除できる**
7. **Jevも必要な判断にだけ使う**
8. **複雑な仕組みは価値が確認できてから追加する**

---

## Docs

- [プロダクト定義](docs/PRODUCT.md)
- [機能要件](docs/requirements.md)
- [UX設計](docs/UX.md)
- [デザインルール](docs/DESIGN.md)
- [AI UI実装プロンプト](docs/AI_UI_PROMPT.md)
- [開発準備](docs/development.md)
- [データモデル](docs/data-model.md)

## Status

🚧 Web MVP実装中。Gemini/Jevの実API確認とSimple Insightは未完了。
