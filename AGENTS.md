# AGENTS.md（watched_work_manage_iOS）

## このリポジトリでの Codex の立場
- **Codex は単独の開発エージェント。** 要件定義、データ契約、画面設計、実装計画、アプリ実装、SQL、テスト、技術文書まで一貫して担当する
- 開発ルールの正は `./docs/collaboration.md`
- `docs/handoff/` は旧 Claude Code 共同開発体制の履歴兼バックログ。作業開始時に `status: open` の連絡を確認し、未反映事項を要件・契約・計画・実装へ直接取り込む。新しい連絡ファイルは原則作らない
- リポジトリ全体を編集してよい。ただし、ユーザーの既存変更や無関係な変更は保持する

## 毎回読む文書
- `./docs/collaboration.md` — 単独開発のルール、作業順序、Git 運用
- `./docs/requirements.md` — 何を作るか（WHAT / WHY）
- `./docs/contracts.md` — データ契約とドメイン用語。単位・綴り・必須項目・集計の定義はここが正
- `./docs/traps.md` — 実装で判明した罠。計画と実装では、ここに載っている罠を避ける順序にする
- `./docs/handoff/` の `status: open` — 旧体制から残る未解決事項

## Single Source of Truth
優先順位は次のとおり。

1. `docs/contracts.md`
2. `docs/requirements.md`
3. `docs/plans/*.md`
4. 実装コード、SQL、テスト

矛盾を見つけた場合は、上位文書を確認・更新してから下位をそろえる。未決事項を推測で埋めず、「未定」と明記するかユーザーへ確認する。

実装内の一元管理先:

- ドメイン型: `src/domain/types.ts`。DB の列挙値・制約は `supabase/migrations/` と同時にそろえる
- 作品・シーズンの判定: `src/domain/works.ts`。同じ条件分岐を画面へ複製しない
- 本人だけが読み書きできる判定: Supabase の行レベルセキュリティ
- 色・余白・タイポグラフィ: `src/theme/tokens.ts`。生の色コードを画面へ直接書かない
- 画面表示用の種別・状態名: `src/domain/labels.ts`
- 利用規約・プライバシーポリシー URL: `src/config/links.ts`
- アプリ名: `app.json` の `name`

## 開発の進め方
1. 作業前に `git pull --rebase` し、作業ツリーと未解決の引き継ぎを確認する
2. 振る舞いやデータ契約が変わる場合は、実装前に `requirements.md` と `contracts.md` を更新する
3. 複数層にまたがる機能、危険な変更、判断が残る変更は `docs/plans/<機能名>.md` に計画を書く
4. 原則として、DB／契約 → サーバー処理 → アプリ → テスト → 文書の順に整合させる
5. 変更範囲に応じた検証を行い、結果を確認してからコミットする
6. push はユーザーから指示されたときだけ行う。push 前にも `git pull --rebase` する

## 文書の書き方
- 文書は UTF-8（BOM なし）・改行 LF
- `docs/requirements.md` の受け入れ基準は「〈条件〉のとき、〈観測できる結果〉になる」の形で番号を付ける
- `requirements.md` や `contracts.md` を変えたら、末尾の変更履歴に日付と理由を書く
- `contracts.md` には列挙値・必須項目・上限・削除の連鎖を書く。決めていないものは「未定」とする
- `docs/design/` の各版には、冒頭に日付と「実装の正ではない」ことを書く
- 非スコープ（やらないこと）を明記する
- 実装計画は、判断中なら `status: draft`、実装可能なら `status: ready`、完了後は `status: done` とする

## 検証コマンド
変更内容に応じて必要なものを実行する。

```powershell
npm run lint
npm run typecheck
npm test
npm run export:web
```

DB 変更では、マイグレーション、型、RLS、削除連鎖、既存データへの影響も確認する。本番への SQL 適用は行わない。

## 実装上の安全事項
- `service_role` key、Apple サインインの秘密鍵、外部 API キーなどの秘密情報をコミットしない
- 通信失敗と0件を区別する。保存できなかった入力を黙って破棄しない
- 写真の位置情報（EXIF）の扱いが未決の間は、写真を公開する仕組みを作らない
- UI は日本語、ライト固定、iPhone 縦向きを前提とする。変更する場合は要件から更新する
- Web、シミュレーター、実機のどれで確認したかを明記し、実機未確認を「確認済み」としない

## UI モック
- 現行の参照用モックは `docs/design/wireframe-v3.html`。過去版は削除しない
- UI モックは要件の抜けを探すための資料であり、実装の正ではない。正は `requirements.md` と `contracts.md`
- 新版は `docs/design/wireframe-v<N>.html` として保存する
- 旧 Claude Artifact は履歴として扱う。公開版との同期を前提にせず、必要ならユーザーと公開方法を決める

## Git
- `main` に直接コミットする。ブランチと PR は原則使わない
- 作業前と push 前に `git pull --rebase` する
- force push はしない
- コミット前に差分と対象ファイルを確認し、無関係な変更を含めない
- 1コミットは1つの論理変更にまとめる
- コミット本文の最後に `AI: codex` と書く

## 人間が行うこと
- 本番への SQL 適用
- App Store Connect の操作
- 本番ビルドと提出
- 本番シークレットや外部サービスの重要操作
- push の指示
