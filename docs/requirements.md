# HaraTomo 機能要件

## 1. MVPの処理フロー

```text
自然文
  ↓
LLM: event候補を抽出
  ↓
Jev: 固定候補から分類・検証
  ↓
Zod validation
  ↓
必要なら確認
  ↓
SQLite
  ↓
Timeline / Simple Insight
```

JevはすべてのAI処理に使わない。**Choice / Boolean / Scoreで自然に表せる判断だけ**に利用する。

---

## 2. P0機能要件

### FR-001 自然文入力

食事・症状・生活要因をまとめて入力できる。

例:

```text
朝はトースト。昼から冷房でかなり冷えた。
16時ごろ腹痛、17時に下痢。
```

### FR-002 LLM抽出

LLMは自由な情報をEventDraft候補へ変換する。

抽出対象:

- 自由な食事名
- 症状表現
- 生活要因
- 日時候補
- severity候補
- note

LLMに最終的な原因判定や数値集計はさせない。

### FR-003 Jev event分類

抽出候補ごとに、必要であればJev Choiceで分類する。

初期候補:

- meal
- symptom
- context
- other

自由生成ではなく固定候補から選ぶ必要があるためJevを優先する。

### FR-004 Jev label正規化

症状や生活要因を既知カテゴリへ寄せる場合はJev Choiceを使う。

例:

```text
「お腹がパンパン」
→ bloating

「クーラーで体が冷えた」
→ cold_exposure
```

候補外の内容は `other` とし、元のlabelは保持する。

### FR-005 Jev抽出妥当性

Jev Booleanで、LLMの抽出結果が元発言に支持されているかを判定できる。

例:

```text
source:
「夜8時に腹痛」

candidate:
symptom / 腹痛 / 20:00

supportedBySource → true
```

低確率の判断を自動で「誤り」とは扱わず、確認対象に回す。

### FR-006 Jev聞き返し判定

Jev Booleanで `needsClarification` を判断する。

例:

```text
「昨日なんかお腹微妙だった」
→ needsClarification: high

「昨日20時に下痢した」
→ needsClarification: low
```

目的は、毎回確認フォームを出すのではなく、**曖昧な部分だけユーザーへ聞くこと**。

P0初期は安全のため常時確認UIでもよい。挙動が安定したらJev結果で確認量を減らす。

### FR-007 Zod validation

Jev / LLMの結果に関係なく、保存前にschema validationする。

AIのconfidenceでschema validationを省略しない。

### FR-008 確認・修正

最低限:

- type
- occurred_at
- label
- normalized_label
- severity

を修正できる。

### FR-009 Timeline

全eventを時系列表示する。

### FR-010 CRUD

eventの作成・編集・削除。

### FR-011 Simple Insight

MVPでは因果推論をしない。

症状前6時間に出現したmeal/contextをTypeScript / SQLで集計する。

計算:

- symptom count
- label occurrence count
- sample size

Jev・LLMには集計させない。

---

## 3. 音声入力

### FR-101 ブラウザー録音と文字起こし

```text
voice
 ↓
speech-to-text
 ↓
既存text pipeline
```

録音はPCブラウザーのマイクだけを使い、ブラウザー側で最大60秒に制限する。Node runtime routeは受信音声を最大10 MiBに制限する。音声は文字起こしのためGeminiへ一時アップロードし、処理後にFiles APIから削除を試みる。削除に失敗した場合は利用者にその旨を知らせる。音声をSQLiteまたはローカルディスクへ保存しない。文字起こし結果は既存の自然文入力欄へ追記し、ユーザーが編集して「記録する」を押すまでevent抽出を行わない。文字起こしの失敗時も既存の入力下書きを保持する。ファイルアップロードUIは提供しない。

## 4. P1

### FR-102 AI Ask

ユーザー自身の履歴について質問できる。

SQL / TypeScriptで検索・集計し、その結果をLLMへ渡して文章化する。

必要に応じてJevをintent分類に使えるが、MVPで無理に導入しない。

### FR-103 Simple Profile

明示された好み・希望だけ保持する。

Memory Engineは作らない。

---

## 5. 初期カテゴリ

### symptom Choice候補

- abdominal_pain
- diarrhea
- constipation
- bloating
- gas
- nausea
- indigestion
- bowel_sound
- other

### context Choice候補

- cold_exposure
- lack_of_sleep
- stress
- exercise
- alcohol
- caffeine
- other

自由な元表現は別途保持する。

---

## 6. MVPでは実装しない

- Authentication / multi-user
- Vector DB
- 高度なMemory
- causal inference
- 医学的confidence score
- 外食Web検索
- meal planning
- pantry
- expiration
- shopping list
- push notification
- generic agent framework
- background jobs

---

## 7. Jevを使わない処理

次はJevへ渡さない。

- 任意の料理名を生成・抽出する
- 自然な説明文を書く
- 日時差を計算する
- 症状回数を数える
- 6時間以内か判断する
- DB検索
- 数量・賞味期限計算
- 医学的診断
- 「原因かどうか」の最終判断

---

## 8. 将来のJev候補

将来、出力候補を事前に生成できる場合に利用する。

- 献立候補からChoice
- 外食メニュー候補からChoice
- 通知する / しない Boolean
- ユーザーに質問する / しない Boolean
- 代替案の適合度 Score

医学的な安全性判定には単独利用しない。

---

## 9. P0完成条件

1. 自然文入力
2. PCブラウザーのマイク録音から既存入力欄へ文字起こしを追記
3. LLMがevent候補を抽出
4. Jevが適切な箇所を分類 / 検証
5. Zod validation
6. 必要箇所を確認・修正
7. SQLite保存
8. Timeline表示
9. CRUD
10. 症状前6時間をコードで集計
