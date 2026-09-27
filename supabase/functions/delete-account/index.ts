// @ts-nocheck
// アカウント削除: Storageの写真を先に消し、成功したときだけauth.usersを削除する。
// デプロイは人間が行う。SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY はFunctionsの標準環境変数。
// eslint-disable-next-line import/no-unresolved
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function response(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function listFolder(storage: ReturnType<typeof createClient>["storage"], path: string) {
  const all = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await storage.from("record-photos").list(path, { limit: 100, offset });
    if (error) throw error;
    all.push(...(data ?? []));
    if (!data || data.length < 100) return all;
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return response(405, { error: "method not allowed" });

  const authorization = request.headers.get("Authorization");
  if (!authorization) return response(401, { error: "not authenticated" });

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return response(500, { error: "server is not configured" });

  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return response(401, { error: "not authenticated" });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const folders = await listFolder(admin.storage, userData.user.id);
    const paths = [];
    for (const folder of folders) {
      const prefix = `${userData.user.id}/${folder.name}`;
      const files = await listFolder(admin.storage, prefix);
      for (const file of files) paths.push(`${prefix}/${file.name}`);
    }
    if (paths.length > 0) {
      const { error } = await admin.storage.from("record-photos").remove(paths);
      if (error) throw error;
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(userData.user.id);
    if (deleteError) throw deleteError;
    return response(200, { ok: true });
  } catch (error) {
    console.error("delete-account failed", error);
    return response(500, { error: "account could not be deleted" });
  }
});
