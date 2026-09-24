# AI UI Implementation Prompt

HaraTomoのUI / frontend実装をAIコーディングエージェントへ依頼するときに使う共通プロンプト。

必要に応じて末尾の「今回のタスク」だけ書き換える。

---

## Prompt

あなたはHaraTomoのfrontendを実装する。

実装前に必ず以下を読む。

- `README.md`
- `docs/PRODUCT.md`
- `docs/requirements.md`
- `docs/UX.md`
- `docs/DESIGN.md`
- `docs/development.md`

これらを仕様のsource of truthとして扱う。

### 最重要ルール

UIを「豪華にする」「Dashboardらしくする」「AIアプリらしくする」ことを目的にしない。

目的は、ユーザーが迷わず記録し、必要なときに履歴を確認できること。

#### Rule 1: いきなりコードを書かない

対象画面について最初に以下を1〜3行で整理する。

- この画面でユーザーがする最重要の行動
- 最重要の情報
- Primary Action

この3点が決まる前にcomponentを追加しない。

#### Rule 2: 先にtext wireframeを作る

実装前に簡単なtext wireframeを作り、情報順序を確認する。

例:

```text
今日どうだった？

[ 自然文入力                              ]

                         記録する

最近の記録
20:00  腹痛
12:30  ラーメン
```

色・shadow・Cardで情報構造を作らない。

#### Rule 3: DESIGN.mdにないpatternを勝手に増やさない

- color
- spacing
- radius
- typography
- surface
- component pattern

は `docs/DESIGN.md` に従う。

新しいvisual patternが本当に必要な場合は、コードへ黙って追加せず理由を明示する。

#### Rule 4: primitive → app component → page の順に考える

共通UIは `components/ui/`。

HaraTomo固有componentは `components/app/`。

ただし将来の再利用を想像して不要な抽象化をしない。

まず既存componentを再利用する。

#### Rule 5: 最後に削減passを行う

実装後、機能を削らずにvisual complexityを減らす。

以下を1つずつ確認する。

- 不要なCardを削除
- 不要なborderを削除
- 不要なbadgeを削除
- 不要なiconを削除
- 重複headingを削除
- 長すぎる説明文を短くする
- secondary actionを弱くする
- 同じ情報の重複表示を削除

「余白があるから何かを追加する」は禁止。

### Card禁止ルール

Cardはデフォルトで使用禁止。

まず以下で表現する。

1. whitespace
2. typography hierarchy
3. divider
4. list row
5. section heading

Cardを使用してよいのは、独立した操作単位として分離する必要が明確な場合だけ。

特に次は禁止。

- Timelineの各eventをCard化
- Homeの各featureをCard化
- stat cardを並べてDashboard化
- Card in Card
- sectionすべてにrounded borderを付ける

Cardを追加する場合、実装前に「なぜwhitespace / divider / listでは不十分か」を説明する。

### UX制約

- 1画面1目的
- Primary Actionは原則1つ
- HomeはDashboardではなく記録開始地点
- 詳細入力を最初から要求しない
- AI confidenceを医学的確信度として表示しない
- AIが原因を断定するcopyを書かない
- 未実装の将来機能への空navigationを作らない
- desktopだからといって情報量を増やさない
- mobile first

### 禁止事項

指示がない限り以下をしない。

- 新機能の追加
- 新しいnavigation itemの追加
- 新しいdependencyの追加
- gradient
- glassmorphism
- 大量のshadow
- decorative animation
- decorative icon
- colorful category cards
- KPI dashboard
- placeholderのためのdummy content大量追加

### 実装後の自己レビュー

完成前に `docs/DESIGN.md#16-ui-review-checklist` を確認する。

さらに次を報告する。

1. 画面のPrimary Action
2. 再利用した既存component
3. 新しく作ったcomponent
4. Cardを使ったか。使ったなら理由
5. 削減passで削った要素
6. mobile幅で確認した内容

問題があれば、見た目を足して隠すのではなく情報構造を修正する。

---

## 今回のタスク

ここに実装したい画面・変更内容を書く。
