# Data Model Draft

初期段階のたたき台。実装時に変更する。

## Event

すべての出来事を時間軸で扱うための共通テーブル。

```text
Event
- id
- user_id
- type
- occurred_at
- ended_at?
- source
- raw_text?
- created_at
- updated_at
```

type:

- meal
- symptom
- context
- bowel
- medication
- note

## Meal

```text
Meal
- event_id
- meal_type
- restaurant?
- menu_name?
- note?
```

## MealItem

```text
MealItem
- id
- meal_event_id
- food_name
- amount?
- unit?
- ingredient_data?
- source_id?
```

## Symptom

```text
Symptom
- event_id
- symptom_type
- severity?
- duration_minutes?
```

## ContextEvent

```text
ContextEvent
- event_id
- context_type
- value?
- unit?
- severity?
```

例:

- cold_exposure
- sleep
- stress
- exercise

## Memory

```text
Memory
- id
- user_id
- category
- statement
- source_type
- source_event_ids[]
- confidence
- active
- created_at
- updated_at
```

source_type:

- user_explicit
- imported
- computed

## Insight

```text
Insight
- id
- user_id
- hypothesis
- feature_definition
- outcome_definition
- observation_count
- support_count
- effect_size?
- confidence_level
- calculation_version
- generated_at
```

## ExternalSource

```text
ExternalSource
- id
- url
- publisher
- official
- retrieved_at
- content_hash
```

外食メニュー等の情報と紐付ける。

---

# Future

## MealPlan

```text
MealPlan
- id
- user_id
- date
- meal_type
- recipe_id?
- planned_at
- status
```

status:

- planned
- eaten_as_planned
- modified
- skipped

## PantryItem

```text
PantryItem
- id
- user_id
- food_id
- quantity
- unit
- purchased_at?
- expires_at?
- location
```

## ShoppingListItem

```text
ShoppingListItem
- id
- list_id
- food_id
- quantity
- unit
- source
- checked
```

source:

- meal_plan
- manual
- low_stock

---

## 設計上の注意

### Raw dataを残す

AI構造化後のデータだけでなく、元の入力 `raw_text` を保持できるようにする。

理由:

- AI抽出ミスを後から修正できる
- parser更新後に再処理できる
- debugging/evaluationに使える

ただし音声原本はprivacy・storage costの観点から別ポリシーとする。

### EventとInferenceを混ぜない

ユーザーが実際に記録した事実:

> 18:00 腹痛

と、システムが導いた推測:

> 牛乳との関連の可能性

は別テーブルにする。

### Versioning

AIや集計ロジックを更新しても再現可能なように、

- extraction_model
- extraction_version
- calculation_version

などを保持する。
