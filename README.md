# 観た作品ノート（仮）

アニメ・ドラマ・映画の感想・評価と、聖地巡礼・グッズ・イベントの記録を残す iOS アプリ。
何を作るかは `docs/requirements.md`、共同開発のルールは `docs/collaboration.md`。

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

### 3. 接続先を設定する

リポジトリ直下に `.env.local` を作る（`.gitignore` 済み。コミットしない）。

```
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

⚠️ 値は手で貼らず、Supabase の画面からコピーしたものを貼ったあと、長さと先頭・末尾が一致しているかを確かめる（`docs/traps.md`「環境変数・秘密の値は手で貼らない」）。
未設定のまま起動すると、「接続先が設定されていません」の画面が出る。

### 4. Apple でサインインを有効にする

1. Apple Developer で App ID `com.tiffanysho.watchedwork` を作り、Sign In with Apple を有効にする
2. Supabase の Authentication > Providers > Apple を有効にし、Client IDs に `com.tiffanysho.watchedwork` を入れる
   - Expo Go で試す場合は `host.exp.Exponent` も足す（本番前に外す）

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

2人分のアカウントで作品を作り、`supabase/tests/rls_check.sql` を SQL Editor で実行する（受け入れ基準14）。
