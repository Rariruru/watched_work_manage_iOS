# AGENTS.md（watched_work_manage_iOS）

## このリポジトリでの Codex の立場
- **Codex は上流担当。** 要件・データ契約・画面設計・実装計画を持つ。実装（コード・SQL・テスト）は、共同開発者の Claude Code が持つ
- 共同開発のルールの正は `./docs/collaboration.md`。ここには書き写さない
- 作業を始めたら、まず `docs/handoff/` の中から、Codex 宛て（`to: codex`）で `status: open` の連絡ファイルを探して確認する
- アプリのコード・`supabase/`・`docs/traps.md` は**直接編集しない**。直したいときは `docs/handoff/` に連絡ファイルを書く（`collaboration.md` §4）
- `CLAUDE.md` は Claude 用。Codex はそこの指示に従う必要はない。ただし「検証コマンド」と「Single Source of Truth」の節は、実装計画を書くときに参照してよい

## 毎回読む文書
- `./docs/collaboration.md` — 共同開発のルール（担当・ファイルの持ち主・連絡ファイル・Git）
- `./docs/requirements.md` — 何を作るか（WHAT / WHY）。持ち主は Codex
- `./docs/contracts.md` — データ契約とドメイン用語。持ち主は Codex。**単位・綴り・必須項目・集計の定義はここが正**
- `./docs/traps.md` — 実装で踏んだ罠（持ち主は Claude）。計画を書くときに、ここに載っている罠を避ける順序にする

## UIモック
- https://claude.ai/artifact/DczPJBtEZHrgcmJPHEChbf （同じ内容: `docs/design/wireframe-v2.html`）
- 2026-09-26 時点の第2版。**実装の正ではない**。要件の抜けを探すためのもので、正は `requirements.md` と `contracts.md`

## Codex が書くもの
- `docs/requirements.md`: 受け入れ基準は「〈条件〉のとき、〈観測できる結果〉になる」の形で、番号を付ける。変えたら末尾の「変更履歴」に日付と理由を書く
- `docs/contracts.md`: 列挙値・必須項目・上限・削除の連鎖。決めていないものは「未定」と書き、推測で埋めない
- `docs/design/`: 画面設計。ページ冒頭に日付と「実装の正ではない」を書く
- `docs/plans/<機能名>.md`: 実装計画。必ず書く項目は `collaboration.md` §3

## 書き方
- 文書は UTF-8（BOM なし）・改行 LF
- 答えても実装が変わらない項目は書かない
- 非スコープ（やらないこと）を必ず書く
- `main` に直接コミットする（ブランチと PR は使わない）。作業前と push 前に `git pull --rebase`、競合したら相手の持ち物は相手の版を採る（`collaboration.md` §5）
- 1コミットには上流の文書だけを入れる。本文の最後に `AI: codex` と書く
- 実装計画は `status: draft` で書き、共同開発者が OK したら `status: ready` にする。Claude は `ready` のものしか実装しない（`collaboration.md` §3）

## 人間がやること
- 本番への SQL 適用・App Store Connect の操作・本番ビルドと提出・push の指示。Codex は手順を書くところまで
