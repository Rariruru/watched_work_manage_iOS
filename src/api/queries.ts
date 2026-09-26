import { QueryClient, useQuery } from "@tanstack/react-query";
import { fetchWorks } from "./works";
import type { Work } from "@/domain/types";

/**
 * ⚠️ キャッシュは端末に永続化しない（persist しない）。
 *    永続化すると前のバージョンの形の応答が起動直後に返る（traps.md「ローカルに持った古いデータ」）
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ⚠️ 再試行は supabase-js（postgrest-js）が GET の通信失敗で最大3回（1s・2s・4s）行う。ここでは重ねない
      retry: false,
      // ⚠️ 既定の "online" だと、react-query がオフライン・非表示と判断した時点で再試行を黙って止め、
      //    読み込み中のまま止まる（2026-09-26 Web のプレビューで実際に踏んだ）。失敗は必ず画面に返す
      networkMode: "always",
      staleTime: 30_000,
    },
    mutations: { networkMode: "always" },
  },
});

export const worksKey = ["works"] as const;

export function useWorks() {
  return useQuery({ queryKey: worksKey, queryFn: fetchWorks });
}

/** 一覧のキャッシュから1作品を引く。無ければ undefined（読み込み中か、削除済みか） */
export function useWork(id: string | undefined): { work: Work | undefined; query: ReturnType<typeof useWorks> } {
  const query = useWorks();
  return { work: query.data?.find((w) => w.id === id), query };
}

export function invalidateWorks(): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: worksKey });
}
