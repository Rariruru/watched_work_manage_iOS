import { useCallback, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { AppError, OFFLINE_MESSAGE, toAppError } from "./errors";
import { invalidateWorks } from "./queries";
import { useToast } from "@/components/common/toast";

/**
 * 保存・削除を1か所で扱う。
 * - 通信が無いと分かっているときは送らずに「接続できません」（受け入れ基準12）
 * - 成功・失敗のどちらでも必ず通知を出す（受け入れ基準15）
 * - 失敗しても画面は閉じない。入力は呼び出し側の state に残る
 * 戻り値は成功したかどうか。成功したときだけ呼び出し側が画面を閉じる
 */
export function useSave() {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const run = useCallback(
    async (fn: () => Promise<unknown>, successMessage: string, failureMessage: string): Promise<boolean> => {
      setSaving(true);
      try {
        const net = await NetInfo.fetch().catch(() => null);
        // ⚠️ isConnected が null（判定できない）のときは送ってみる。false のときだけ止める
        if (net?.isConnected === false) throw new AppError("offline", OFFLINE_MESSAGE);
        await fn();
        await invalidateWorks();
        toast.success(successMessage);
        return true;
      } catch (e) {
        toast.error(toAppError(e, failureMessage).message);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [toast]
  );

  return { run, saving };
}
