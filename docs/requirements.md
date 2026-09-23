# HaraTomo 機能要件

## 1. MVP機能要件

### FR-001 自然文入力

ユーザーは自由文で、食事・体調・生活要因を一度に入力できる。

例:

```
朝はトーストとコーヒー。昼から冷房でかなり冷えた。
16時ごろからお腹が痛くなって、17時に下痢。
```

AIは入力内容を構造化し、保存前にユーザーが確認・修正できる。

### FR-002 音声入力

- マイクから発話
- Speech-to-Text
- 発話を自然文入力と同じパイプラインで処理
- 曖昧な部分のみ確認する
- 音声ファイルを保持するかどうかはユーザー設定で制御する

### FR-003 Food Log

最低限保持する項目:

- eaten_at
- food / dish
- amount（任意）
- meal_type
- restaurant / brand（任意）
- ingredients（分かる場合）
- source
- free_text

### FR-004 Symptom Log

例:

- 腹痛
- 下痢
- 便秘
- 膨満感
- ガス
- 吐き気
- 胃もたれ
- 腹鳴

各症状に以下を持てるようにする。

- occurred_at
- severity
- duration
- note

排便については Bristol Stool Scale を将来的に追加可能な設計にする。

### FR-005 Context Log

食事以外の要因を記録できる。

初期候補:

- 冷え
- 睡眠
- ストレス
- 運動
- 飲酒
- カフェイン
- 月経関連（任意・センシティブ設定）
- 服薬
- 外出
- 旅行
- 自由定義要因

固定項目だけでなく、ユーザーが独自項目を追加できるようにする。

### FR-006 Timeline

食事、症状、生活要因を同一タイムラインで表示する。

例:

```
12:15 昼食: ラーメン
15:10 冷え: 強い
17:45 腹痛: 6/10
18:05 下痢
```

### FR-007 AI Memory

AIが参照可能な記憶を分類して保持する。

- Profile memory
- Preference memory
- Food history
- Symptom history
- Context history
- Learned patterns
- Current state
- Planned meals
- Pantry state

ユーザーが「AIが何を覚えているか」を確認・修正・削除できること。

### FR-008 Insight

食事や生活要因と症状の関係を集計する。

MVPでは複雑な因果推論より以下を優先する。

- 症状前 N 時間以内に現れた食事・要因
- exposure回数
- symptom occurrence回数
- symptom rate
- 条件の組み合わせ
- サンプル数
- 最終観測日

LLMには集計値を渡し、自然言語で説明させる。

### FR-009 Confidence

AIが出す傾向には確信度を持たせる。

例:

- insufficient data
- weak signal
- possible pattern
- repeated pattern

単純なLLM自己評価ではなく、観測回数・再現性・交絡候補等を使ったルール/統計で決める。

### FR-010 Search / Ask

ユーザーは自分の過去ログに対して質問できる。

例:

- 「牛乳を飲んだ後に腹痛になったことある？」
- 「先月下痢した日の共通点は？」
- 「最近寝不足の日はどう？」
- 「この店で前に何食べた？」

回答には参照した履歴へのリンクを付ける。

### FR-011 Data Correction

AIが誤抽出した情報を簡単に修正できる。

修正内容は今後の抽出改善にも利用できる設計を検討する。

### FR-012 Export / Delete

- CSV / JSON export
- アカウント削除
- 個別ログ削除
- AI memory削除
- 全データ削除

---

## 2. 外食機能

### FR-101 Restaurant Search

店名・メニュー名を指定して、Web上の公式情報を取得できる。

優先順位:

1. 店舗公式サイト
2. メーカー公式ページ
3. 公開API
4. 信頼できる第三者DB

AI検索結果には出典URLと取得日時を保存する。

### FR-102 Menu Information

可能であれば以下を取得。

- 商品名
- 栄養成分
- 原材料
- アレルゲン
- サイズ
- 公式URL

推測値と公式値を区別する。

### FR-103 Personalized Menu Support

本人の履歴に基づき、過去に症状が少なかった選択肢などを表示できる。

ただし「安全」「食べても大丈夫」のような医学的断定は避ける。

---

## 3. Meal Planning

### FR-201 Weekly Meal Plan

以下を条件に1週間分の献立を生成する。

- 好み
- 苦手
- 調理時間
- 予算
- 在庫
- 賞味期限
- 過去の本人の反応
- 栄養条件
- 食事制限

### FR-202 Planned Meal = Pre-filled Log

献立を食事予定として保持し、食後に

> 予定どおり食べましたか？

だけで記録できる。

予定と異なる場合は差分だけ入力する。

---

## 4. Pantry

### FR-301 Inventory

- 食品
- 数量
- 単位
- 購入日
- 賞味/消費期限
- 保存場所

### FR-302 Auto Add

将来候補:

- レシートOCR
- バーコード
- EC購入履歴連携
- 写真認識

### FR-303 Auto Consume

献立または食事記録と連動し、使用食材を在庫から減算する。

曖昧な量は確認を求める。

---

## 5. Shopping

### FR-401 Auto Grocery List

```
献立に必要な食材
-
現在庫
=
買い物リスト
```

### FR-402 Grouping

- 野菜
- 肉・魚
- 乳製品
- 調味料
- その他

等に自動分類する。

---

## 6. Notifications

候補:

- 予定した食事の確認
- 症状記録の軽いリマインド
- 賞味期限
- 買い物
- 本人にとって再現性のある傾向が増えた時

通知過多にならないことを優先する。

---

## 7. 非機能要件

### Privacy

健康・食生活データを扱うため、Privacy by Designを前提にする。

- TLS
- encryption at rest
- 最小権限
- API keyをクライアントへ直接埋め込まない
- ログへの個人情報流出防止
- 外部LLMに送信する情報の最小化
- 削除可能性

### Reliability

AIの抽出結果は必ずschema validationする。

LLM出力例:

```json
{
  "events": [
    {
      "type": "meal",
      "occurred_at": "...",
      "confidence": 0.92
    }
  ]
}
```

構造化に失敗した場合にraw textを失わない。

### Explainability

Insightには可能な限り以下を表示。

- 根拠になったログ
- 対象期間
- サンプル数
- 使用した時間窓
- 交絡候補

### Accessibility

- 音声中心でも利用可能
- 片手操作
- 大きな文字
- 色だけに依存しない表現

---

## 8. 医療・安全上の境界

HaraTomoは医師の代替を目的としない。

AIが避けるべき表現:

- 「あなたはIBSです」
- 「この食品が原因です」
- 「この薬をやめてください」
- 「この食品なら絶対安全です」

代わりに:

- 「この記録では関連が見られます」
- 「まだ観測数が少ないです」
- 「複数要因が重なっている可能性があります」

緊急性が疑われる入力については、医療機関への相談を促す安全設計を別途検討する。
