# Data Model

P0ではSQLiteの`events`テーブルだけを使う。

profileはP1で必要になった時点で追加する。過度な正規化や将来用の列は先回りして導入しない。

---

## 1. events

食事・症状・生活要因を同じタイムライン上のeventとして扱う。

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

`occurred_at`、`created_at`、`updated_at`はUTCのISO 8601文字列として保存する。日時入力と表示は利用者のPCの現地時刻に合わせる。

### type

P0では次の4種類を使う。

- meal
- symptom
- context
- other

`severity`は症状だけに使う0〜10の整数とする。

### 例

```text
id: 1
type: meal
occurred_at: 2026-09-24T03:30:00.000Z
label: ラーメン
severity: null

id: 2
type: context
occurred_at: 2026-09-24T06:00:00.000Z
label: 冷え

id: 3
type: symptom
occurred_at: 2026-09-24T09:00:00.000Z
label: 腹痛
severity: 6
```

---

## 2. profile（P1）

P0ではprofileテーブルを作らない。P1で必要になったら、明示された好みだけを保持する。

```text
profile
- id
- data_json
- updated_at
```

例:

```json
{
  "likes": ["魚"],
  "dislikes": ["激辛料理"],
  "notes": ["朝は調理に時間をかけたくない"]
}
```

profileをAIが勝手に大量生成しない。

---

## 3. なぜテーブルをまとめるか

当初案では:

- meals
- meal_items
- symptoms
- context_events
- memories
- insights
- external_sources

などを分けていた。

しかしMVPでは:

- タイムライン表示
- typeごとの検索
- 時刻差集計

が中心なので、まずevents一つで十分。

具体的な要件が出てから分割する。

---

## 4. Insightは保存しない

MVPではInsightテーブルを作らない。

質問・画面表示時にその場で計算する。

例:

```text
腹痛イベントを取得
 ↓
各腹痛の6時間前までのeventを取得
 ↓
label別にcount
 ↓
表示
```

これで十分な間は永続化しない。

---

## 5. Raw input

AIが抽出した後でも元の自然文を残す。

MVPでは各eventのraw_textに同じ入力が重複しても許容する。

正規化のためのinputsテーブルは、重複が問題になってから追加する。

---

## 6. 将来分割する候補

必要になった時点で追加する。

- meal_items
- bowel_events
- memories
- insights
- external_sources
- restaurants
- menu_items
- meal_plans
- recipes
- pantry_items
- shopping_lists

---

## 7. 設計原則

### FactとInferenceを混ぜない

保存するeventはユーザーが記録・確認した事実を基本とする。

例:

```text
18:00 腹痛
```

一方、

```text
牛乳と腹痛に関連がありそう
```

はeventとして保存しない。

### SQLiteで計算できるものはコードで計算する

- count
- time difference
- grouping
- filtering

をLLMへ任せない。

### 将来のためだけの列を増やさない

必要になった時点でmigrationする。
