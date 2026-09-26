# CLAUDE.md（watched_work_manage_iOS）

## このリポジトリでの Claude の立場
- **Claude は下流（実装）担当。** 上流（要件・データ契約・画面設計・実装計画）は、共同開発者の Codex が持つ
- 共同開発のルールの正は `./docs/collaboration.md`。ここには書き写さない
- 作業を始めたら、まず `docs/handoff/` の中から、Claude 宛て（`to: claude`）で `status: open` の連絡ファイルを探して確認する
- `docs/requirements.md`・`docs/contracts.md`・`docs/design/`・`docs/plans/` は**直接編集しない**。直したいときは `docs/handoff/` に連絡ファイルを書く（`collaboration.md` §4）
- 実装は `docs/plans/<機能名>.md` を読んでから始める。計画が無ければ実装せず、連絡ファイルで依頼する（`collaboration.md` §3）

## プロジェクト概要
- 名前: 観た作品と聖地巡礼の記録アプリ（アプリ名は未定。`docs/requirements.md` 未決事項）
- 目的 / 誰のためのアプリか: `docs/requirements.md` §1・§2
- スタック: iOS アプリ（iPhone 縦向きのみ・ライト固定）＝ Expo SDK 57 ＋ Expo Router ＋ TypeScript ／ Supabase（DB・認証は Apple でサインイン・写真のストレージ）。Expo は 2026-09-26 に上田が決めた（連絡ファイル `2026-09-26-claude-foundation-started.md`）
- リポジトリ構成の要点: 画面（ルート）は `src/app/`、判断の純関数は `src/domain/`、Supabase との読み書きは `src/api/`、部品は `src/components/<画面>/`、スキーマは `supabase/migrations/`。`docs/` に要件・データ契約・罠・連絡ファイルを置く

## 毎回読む文書
- `./docs/collaboration.md` — 共同開発のルール（担当・ファイルの持ち主・連絡ファイル・Git）
- `./docs/requirements.md` — 何を作るか（WHAT / WHY）
- `./docs/contracts.md` — データ契約とドメイン用語。単位・綴り・集計の定義はここが正
- `./docs/traps.md` — この環境で踏んだ罠と、それを避けるコード規約（Claude が持ち主）

## 検証コマンド（このプロジェクトで「done」を証明する手段）
> 完了報告の前に必ずこれらを実行する。実行できないものは「⚠️ 未検証」として明示する。
- Lint: `npm run lint`（expo lint）
- 型チェック: `npm run typecheck`。⚠️ typed routes の型は開発サーバを一度起動すると `.expo/types/` にできる。無い間は画面遷移の道筋の誤りを検出しない
- テスト: `npm test`（`src/**/*.test.ts` を node --test で動かす。対象は `src/domain/` の純関数）
- ビルド: `npm run export:web`（まとめて組み立てられるかの確認。iOS のビルドは EAS で人間が行う）
- 起動 / 目視確認: Web は `npx expo start --web`（Apple でのサインインは使えない）。実機（開発用ビルド・TestFlight 版）で確認するまでは未確認。Web での確認は「Web で確認」と書く
- データ / SQL: ローカルの DB は無い。スキーマとマイグレーションは SQL ファイルで用意し、Supabase への適用は人間が行う → 適用前は未検証扱い

## Single Source of Truth（一元管理する場所）
> 同じ定数・テーブルを複数ファイルに複製しない。編集前にここを確認・grep する。
- データの形（列挙値・必須項目・上限）とドメイン用語: `docs/contracts.md`（Codex が持ち主）。コード側は `src/domain/types.ts`、DB 側は `supabase/migrations/` の check 制約。⚠️ 列挙値の綴りはこの2か所が複製なので、片方だけ変えない
- 作品・シーズンの判断（絞り込み・重複・種別の変更・最後のシーズン）: `src/domain/works.ts`。画面に条件分岐を書かない
- 本人しか読み書きできない、という判定: Supabase の行レベルセキュリティだけ。アプリ側で重ねて判定しない
- デザイントークン（色・余白・タイポグラフィ）: `src/theme/tokens.ts`（下敷きは `docs/design/wireframe-v3.html`）。生の色コードを直接書かない
- 種別・視聴状態などの画面の名前: `src/domain/labels.ts`
- 利用規約・プライバシーポリシーの URL: `src/config/links.ts`（まだ null）
- アプリ名: `app.json` の `name`（画面は `expo-constants` から読む）
- 画面の文言（エラー・空状態の文言）: まだ無し。同じ文言が2箇所に出たらここに記録する

## 実装前に必ず読む参照資料
- `./docs/plans/<機能名>.md`（その機能の実装計画）
- `./docs/requirements.md`（「参考」にワイヤーフレームの URL がある。**実装の正ではない**）
- `./docs/contracts.md`
- `./docs/traps.md`

## 役割の線引き
| | |
|---|---|
| Claude が用意する | SQL と確認クエリ・コマンド・コードの変更・`traps.md`・README のセットアップ手順・連絡ファイル |
| Codex が用意する | 要件・データ契約・画面設計・実装計画（`collaboration.md` §2） |
| **人間がやる** | **本番への SQL 適用・ストアの操作・本番ビルドと提出・push の指示** |

## 絶対に守ること
- `collaboration.md` §6 を守る（進捗表を書かない・決定を変えたら理由を残す・推測で断定しない・実機で見るまでは未確認）
- エラーを握り潰さない。「取得できなかった」と「0件だった」を必ず区別する
- 要件・契約と食い違うコードを書かない。要件の側がおかしいと思ったら、連絡ファイルで Codex に伝える
- `blocking: yes` の連絡ファイルが回答待ちの部分は、推測で実装しない

## このプロジェクト特有の注意
- 秘密の値（Supabase の service_role key、Apple サインインの秘密鍵、作品データベース API のキー）はコミットしない。アプリに埋め込んでよいのは Supabase の URL と anon key だけ
- 通信が無いときは保存しない。黙って消さず「接続できません」を出し、入力内容を画面に残す
- 写真の位置情報（EXIF）を保存時に消すかは未決。次段階で公開するときに漏れるので、決めるまで公開の仕組みを作らない
- UI は日本語のみ・ライト固定・iPhone 縦向きのみ
