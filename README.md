# 作品日和

アニメ・ドラマ・映画の感想・評価と、聖地巡礼・グッズ・イベントの記録を残す iOS アプリ。
何を作るかは `docs/requirements.md`、開発のルールは `docs/collaboration.md`。

- アプリ: Expo（SDK 57）＋ Expo Router ＋ TypeScript。画面は `src/app/`
- サーバ: Supabase（DB・Apple でサインイン）。スキーマは `supabase/migrations/`

## 検証コマンド

```bash
npm run typecheck   # 型チェック
npm run lint        # ESLint（expo lint）
npm test            # 純関数の単体テスト（node --test）
npm run export:web  # Web 向けにまとめて組み立てられるか（dist/ に出る。コミットしない）
```

⚠️ Web で動いても iPhone で動くとは限らない。Apple でのサインインは Web では使えない。

## 初回セットアップ

⚠️ 以下のうち Supabase・Apple・EAS の操作は **人間が行う**（`docs/collaboration.md` §6）。手順はまだ一度も通していない。

### 1. 依存を入れる

```bash
npm install
```

### 2. Supabase のプロジェクトを作る

1. https://supabase.com でプロジェクトを作る
2. SQL Editor で `supabase/migrations/` の SQL をファイル名の順に実行する
3. Project Settings > API から Project URL と anon key を控える（service_role key はアプリに入れない）
4. `supabase/functions/delete-account` をデプロイする。アカウント削除時に非公開Storageの写真を先に削除するために必要

```bash
supabase functions deploy delete-account
```

`20260927000000_records_and_photos.sql` は非公開の `record-photos` バケットも作る。本番へSQLとFunctionを適用するのは人間が行う。

### 3. 接続先を設定する

リポジトリ直下の `.env.example` をコピーして `.env.local` を作り、値を入れる（`.env.local` は `.gitignore` 済み。コミットしない）。

```
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

⚠️ 値は手で貼らず、Supabase の画面からコピーしたものを貼ったあと、長さと先頭・末尾が一致しているかを確かめる（`docs/traps.md`「環境変数・秘密の値は手で貼らない」）。
未設定のまま起動すると、「接続先が設定されていません」の画面が出る。

### 4. Apple でサインインを有効にする

1. Apple Developer で App ID `com.tiffanysho.sakuhinbiyori` を作り、Sign In with Apple を有効にする
2. Supabase の Authentication > Providers > Apple を有効にし、Client IDs に `com.tiffanysho.sakuhinbiyori` を入れる
   - ⚠️ **Expo Go では Apple でサインインできない**（App Store の Expo Go にはこの機能が入っていなかった。2026-09-26 に実機で確認）。試すには手順5の開発用ビルドが要る

Expo Go で開くときは `--go` を付ける（`expo-dev-client` が入っているので、付けないと開発用ビルド向けの QR コードが出て、Expo Go では開けない）。

```bash
npx expo start --go --tunnel
```

Expo Go とパソコンの Expo CLI は、同じ Expo のアカウントでログインしておく（違うと「You're signed in to Expo CLI as …」で止まる）。

#### 開発用ログイン（Expo Go と Web で画面を確かめる）

開発中（`__DEV__`）だけ、サインイン画面にメールとパスワードの欄が出る。本番のビルドには入らない（`src/app/sign-in.tsx`）。

1. Supabase の Authentication > Providers > Email が有効になっていることを確かめる（既定で有効）
2. Authentication > Users > Add user > Create new user で、テスト用のアカウントを作る。「Auto Confirm User」にチェックを入れる
3. アプリのサインイン画面の「開発用ログイン」に、そのメールとパスワードを入れる

⚠️ App Store に出す前に、Email のログインを Supabase 側で無効にするか決める。アプリから欄が消えても、Supabase の Email が有効なままなら API から直接アカウントを作れる。

### 5. iPhone で動かす

Apple でのサインインを試すには、開発用ビルド（development build）を EAS で作る。

```bash
npm install -g eas-cli
```

```bash
eas login
```

```bash
eas build --profile development --platform ios
```

入れたら `npx expo start` で開発サーバを立ち上げ、iPhone のアプリから接続する。
開発用ビルドの JS は手元の開発サーバから届くので、接続先は手元の `.env.local` が使われる。

⚠️ TestFlight 用（`preview` / `production`）のビルドには `.env.local` が入らない（`.gitignore` 済みのファイルは EAS に送られない）。
EAS の環境変数に、ファイルから読ませて設定する。対話プロンプトに手で貼らない（前作で先頭の1文字が飲まれ、本番だけが起動直後に落ちた）。
設定したら、手元の値と長さ・完全一致を機械で突き合わせる。production / preview / development の3つとも確かめる。

### 6. 本人の行しか読めないことを確かめる

アカウントが1人分以上ある状態で、`supabase/tests/rls_check.sql` の全文を SQL Editor に貼ってそのまま実行する（受け入れ基準14）。
仮の「他人」を作って試し、最後にすべて取り消す。結果の1行の `verdict` が `OK` なら、他人の作品・シーズン・各話・写真付き記録は読めず、書き換えられない。
