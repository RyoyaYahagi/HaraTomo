# HaraTomo Design

## 1. Design Direction

HaraTomoは「高機能な健康ダッシュボード」ではなく、**毎日使っても疲れない記録ツール**として見せる。

キーワード:

- calm
- simple
- lightweight
- trustworthy
- content-first

装飾で健康感やAI感を演出しすぎない。

## 2. 情報階層

優先順位:

1. 今やる操作
2. ユーザー自身の記録
3. 確認が必要な情報
4. 振り返り
5. 補助説明

すべてを同じ強さで見せない。

## 3. Card禁止ルール

**Cardはデフォルトで使用禁止。**

情報のまとまりを表現したい場合は、まず以下を使う。

1. whitespace
2. typography hierarchy
3. divider
4. list / table-like row
5. section heading

Cardを使ってよいのは、次の条件を満たす場合だけ。

- 周囲から独立した1つの操作単位である
- 背景から分離しないと操作対象が分かりにくい
- Dialog / Popoverなど明確に浮いたsurfaceである
- 複数の関連要素を1つの選択肢として扱う必要がある

「見栄えがよい」「Dashboardっぽい」「まとまりを作りたい」だけではCardを追加しない。

特に禁止:

- Timelineの各eventをCard化
- Homeの各機能をCard化
- 数字1つのためのstat card
- Cardの中にCard
- ほぼ全sectionへのrounded border

## 4. Color

色はsemantic tokenとして扱い、componentへ直接hexを散らさない。

初期palette:

```css
--background: #FCFCFA;
--surface: #FFFFFF;
--foreground: #1B1F1D;
--muted-foreground: #66706B;
--border: #E5E8E6;

--primary: #256147;
--primary-foreground: #FFFFFF;

--danger: #B42318;
--warning: #8A4B08;
```

原則:

- primary colorは主要操作と重要な選択状態に限定
- sectionごとに色を変えない
- gradientは使わない
- AI機能を紫色にする等の「AIっぽい配色」をしない
- severityは色だけで伝えない

dark modeはMVP必須ではない。

## 5. Spacing

4px gridを使う。

推奨scale:

```text
4   micro
8   compact
12  control internal
16  default
24  section inner
32  section separation
48  major separation
64  page separation
```

任意の `13px` や `27px` をその場で作らない。

余白不足をborderやCardで補わない。

## 6. Typography

MVPではfont依存を増やさず、system fontを基本とする。

候補:

```css
font-family:
  ui-sans-serif,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  "Noto Sans JP",
  sans-serif;
```

基本:

- body: 16px
- secondary: 14px
- page title: 24–28px
- section title: 18–20px
- line-height: body 1.5–1.7

原則:

- 文字サイズを増やしすぎてhierarchyを作らない
- 太字を乱用しない
- ALL CAPSを使わない
- 長い説明文をUIへ常設しない

## 7. Radius / Border / Shadow

### Radius

- control: 8px
- larger surface: 12px
- pill: tag / statusなど意味がある場合のみ

巨大な丸角をブランド表現として乱用しない。

### Border

必要な境界だけに使う。

入力欄・Dialog・明確な区切り以外ではwhitespaceを優先する。

### Shadow

原則なし。

Dialog / Popoverなどz-axisの分離が必要な場合だけ控えめに使用する。

## 8. Layout

Mobile First。

- mobile horizontal padding: 16px
- tablet/desktop: 24–32px
- main content max-width: 720px
- text/form中心画面: 560–640pxを目安
- desktopだからといって空間を埋めるために2–3 column化しない

HomeとTimelineは中央の1 columnを基本とする。

## 9. Buttons

1画面のPrimary Buttonは原則1つ。

### Primary

その画面の完了・中心操作。

例:
- 記録する
- この内容で保存
- 保存

### Secondary

補助操作。Primaryより視覚的に弱くする。

### Destructive

削除など。Primaryの隣で同じ強さにしない。

原則:

- Buttonをnavigation代わりに乱用しない
- icon onlyは意味が十分明確な場合のみ
- CTA文言に「今すぐ」「AIで」など不要な煽りを入れない

## 10. Input

自然文入力をHaraTomoの主要componentとして扱う。

- 十分な入力面積
- placeholderに長い説明を詰め込まない
- 入力例は1つあればよい
- Enter送信と改行の競合を避ける
- AI処理中もraw textを保持する

詳細フォームはConfirmation / Editで必要な場合だけ表示する。

## 11. Lists

Timeline、event候補、履歴はCard collectionではなくlistを優先する。

区切り:

- date heading
- spacing
- divider
- alignment

で表現する。

## 12. Icons

iconは意味を補助するときだけ使う。

導入する場合は1つのicon setに統一する。装飾目的のiconは置かない。

食事・症状・生活要因をすべてカラフルな絵文字で分類する必要はない。

## 13. Motion

MVPでは最小限。

許可:

- Dialog open/close
- loading/progress
- small state transition

禁止:

- decorative entrance animation
- background motion
- attentionを奪うloop animation

## 14. Figmaとの関係

Figmaを作成した場合:

- PRODUCT / requirements: 何を作るか
- UX: どう流れるか
- DESIGN: 視覚ルール
- Figma: 具体的な画面配置・見た目
- code: 実装

Figmaを見て実装する場合でも、PRODUCT / UX / DESIGNに反する要素を自動で追加しない。

## 15. Component境界

`components/ui/`

アプリ固有の意味を持たないprimitive。

例:

- Button
- Input
- Textarea
- Dialog
- Select
- FormField

`components/app/`

HaraTomo固有の意味を持つcomponent。

例:

- NaturalLanguageEntry
- MealItem
- SymptomItem
- EventRow
- EventEditor
- FoodSearch
- InsightList

判断基準:

> HaraTomo以外のアプリでも名前を変えず使えるか？

Yes → `components/ui`

No → `components/app`

componentを抽象化するためだけに作らない。2回以上必要になるか、責務が明確に独立したときに抽出する。

## 16. UI Review Checklist

実装完了前に確認する。

- [ ] 画面のPrimary Actionは1つ以下か
- [ ] Cardなしで表現できる箇所をCard化していないか
- [ ] 不要なborder / badge / icon / headingがないか
- [ ] 同じ意味の情報を重複表示していないか
- [ ] spacing token外の値を増やしていないか
- [ ] 色を意味なく増やしていないか
- [ ] desktopの空白を埋めるためだけにcolumnを増やしていないか
- [ ] UIの説明文が長すぎないか
- [ ] raw user recordとAI推測が混同されていないか
- [ ] 見栄えのためだけの機能を追加していないか
