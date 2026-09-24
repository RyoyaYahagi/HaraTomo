# AGENTS.md

HaraTomoで作業するAI coding agent向けのrepository-wide instructions。

## Source of truth

frontend / UI / UXに触れる前に必ず読む。

1. `docs/PRODUCT.md`
2. `docs/requirements.md`
3. `docs/UX.md`
4. `docs/DESIGN.md`
5. `docs/development.md`

詳細なUI実装手順は `docs/AI_UI_PROMPT.md` に従う。

## Frontend mandatory rules

- いきなりUIコードを書かず、画面の目的・最重要情報・Primary Actionを先に確認する。
- 実装前にtext wireframeで情報順序を確認する。
- `docs/DESIGN.md` に存在しないvisual patternを理由なく追加しない。
- `components/ui/` はgeneric primitive、`components/app/` はHaraTomo固有componentに分ける。
- 既存componentを優先し、将来用の抽象化を作らない。
- 実装後に削減passを行い、不要なCard / border / badge / icon / heading / 説明文を削る。
- Cardはデフォルト禁止。whitespace、typography、divider、listで表現できない場合だけ使う。
- 1画面のPrimary Actionは原則1つ。
- HomeをKPI Dashboard化しない。
- mobile first。
- UI改善の依頼で、依頼されていない機能を追加しない。
- desktopの余白を埋めるためだけにcolumnやwidgetを増やさない。

## Component placement

`components/ui/`:
- Button
- Input
- Textarea
- Dialog
- Select
- FormField
- その他、HaraTomo固有の意味を持たないprimitive

`components/app/`:
- NaturalLanguageEntry
- EventRow
- MealItem
- SymptomItem
- EventEditor
- FoodSearch
- InsightList
- その他、HaraTomoのdomain conceptを含むcomponent

「他アプリでも同じ名前のまま使えるか」で判断する。

## AI / health UI rules

- 本人の記録とAIの推測を混同しない。
- Jev confidenceを医学的な確率として表示しない。
- 相関・同時出現を原因として表現しない。
- 医学的診断を生成しない。
- raw textをAI処理失敗時にも失わない。

## YAGNI

次を先回りして追加しない。

- design system package
- generic component framework
- dashboard framework
- unused component variants
- unused navigation
- future feature placeholders
- animation library
- state management library

現在のタスクを最小の構造で満たす。
