import { Stack } from "expo-router";
import { color } from "@/theme/tokens";

/** サインイン後の画面。ここに入れるのはセッションがあるときだけ（ルートの Stack.Protected） */
export default function AppLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }} />;
}
