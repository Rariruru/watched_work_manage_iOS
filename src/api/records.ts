import { randomUUID } from "expo-crypto";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { supabase } from "./supabase";
import { AppError, toAppError } from "./errors";
import type { RecordKind, RecordPhoto, WorkRecord } from "@/domain/types";
import { MAX_PHOTO_EDGE } from "@/domain/records";

const PHOTO_BUCKET = "record-photos";

type PhotoRow = { id: string; storage_path: string; position: number };
type RecordRow = {
  id: string;
  work_id: string;
  kind: RecordKind;
  name: string;
  occurred_on: string | null;
  memo: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  record_photos: PhotoRow[] | null;
};

export type PhotoDraft = {
  id: string;
  previewUri: string;
  localUri: string | null;
  storagePath: string | null;
  width: number;
  height: number;
  fileSize: number | null;
  failed?: boolean;
};

export type RecordInput = {
  workId: string;
  kind: RecordKind;
  name: string;
  occurredOn: string | null;
  memo: string | null;
  latitude: number | null;
  longitude: number | null;
  photos: PhotoDraft[];
};

async function run<T>(fallback: string, fn: () => PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  let result: { data: T; error: unknown };
  try {
    result = await fn();
  } catch (e) {
    throw toAppError(e, fallback);
  }
  if (result.error) throw toAppError(result.error, fallback);
  return result.data;
}

async function signedPhoto(row: PhotoRow): Promise<RecordPhoto> {
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(row.storage_path, 60 * 60);
  if (error || !data?.signedUrl) {
    console.warn("[records] 写真のURLを作れなかった", row.storage_path, error);
    return { id: row.id, storagePath: row.storage_path, position: row.position, url: null };
  }
  return { id: row.id, storagePath: row.storage_path, position: row.position, url: data.signedUrl };
}

async function toRecord(row: RecordRow): Promise<WorkRecord> {
  const photos = await Promise.all((row.record_photos ?? []).map(signedPhoto));
  return {
    id: row.id,
    workId: row.work_id,
    kind: row.kind,
    name: row.name,
    occurredOn: row.occurred_on,
    memo: row.memo,
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: row.created_at,
    photos: photos.sort((a, b) => a.position - b.position),
  };
}

const RECORD_SELECT =
  "id, work_id, kind, name, occurred_on, memo, latitude, longitude, created_at, " +
  "record_photos(id, storage_path, position)";

export async function fetchRecords(workId?: string): Promise<WorkRecord[]> {
  let query = supabase.from("records").select(RECORD_SELECT).order("created_at", { ascending: false });
  if (workId) query = query.eq("work_id", workId);
  const data = await run("記録を読み込めませんでした", () => query);
  if (!Array.isArray(data)) {
    console.warn("[records] 一覧の応答が配列ではない", data);
    throw new AppError("invalid-response", "記録を読み込めませんでした");
  }
  return Promise.all((data as unknown as RecordRow[]).map(toRecord));
}

async function currentUserId(): Promise<string> {
  let response: Awaited<ReturnType<typeof supabase.auth.getUser>>;
  try {
    response = await supabase.auth.getUser();
  } catch (error) {
    throw toAppError(error, "サインイン情報を確認できませんでした");
  }
  if (response.error) throw toAppError(response.error, "サインイン情報を確認できませんでした");
  const id = response.data.user?.id;
  if (typeof id !== "string") throw new AppError("invalid-response", "サインイン情報を確認できませんでした");
  return id;
}

function resizeAction(photo: PhotoDraft) {
  const longest = Math.max(photo.width, photo.height);
  if (longest <= MAX_PHOTO_EDGE) return [];
  return photo.width >= photo.height ? [{ resize: { width: MAX_PHOTO_EDGE } }] : [{ resize: { height: MAX_PHOTO_EDGE } }];
}

async function uploadPhoto(userId: string, recordId: string, photo: PhotoDraft): Promise<string> {
  if (photo.storagePath) return photo.storagePath;
  if (!photo.localUri) throw new AppError("invalid-response", "写真を読み込めませんでした");

  // 再エンコードにより長辺を制限し、EXIFを引き継がない（基準38）
  const rendered = await manipulateAsync(photo.localUri, resizeAction(photo), {
    compress: 0.85,
    format: SaveFormat.JPEG,
    base64: false,
  });
  const bytes = await fetch(rendered.uri).then((response) => response.arrayBuffer());
  const path = `${userId}/${recordId}/${photo.id}.jpg`;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, bytes, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error) throw toAppError(error, "写真をアップロードできませんでした");
  return path;
}

async function removeStorage(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove(paths);
  if (error) console.warn("[records] 不要な写真を削除できなかった", paths, error);
}

async function uploadAll(
  recordId: string,
  photos: PhotoDraft[],
  onPhotoFailure?: (id: string) => void
): Promise<{ ids: string[]; paths: string[]; newlyUploaded: string[] }> {
  const userId = await currentUserId();
  const paths: string[] = [];
  const newlyUploaded: string[] = [];
  try {
    for (const photo of photos) {
      try {
        const path = await uploadPhoto(userId, recordId, photo);
        paths.push(path);
        if (!photo.storagePath) newlyUploaded.push(path);
      } catch (error) {
        onPhotoFailure?.(photo.id);
        throw error;
      }
    }
    return { ids: photos.map((photo) => photo.id), paths, newlyUploaded };
  } catch (error) {
    await removeStorage(newlyUploaded);
    throw error;
  }
}

function rpcInput(input: RecordInput, photos: { ids: string[]; paths: string[] }) {
  return {
    p_name: input.name,
    p_occurred_on: input.occurredOn,
    p_memo: input.memo,
    p_latitude: input.latitude,
    p_longitude: input.longitude,
    p_photo_ids: photos.ids,
    p_photo_paths: photos.paths,
  };
}

export async function createRecord(
  input: RecordInput,
  onPhotoFailure?: (id: string) => void
): Promise<string> {
  const recordId = randomUUID();
  const uploaded = await uploadAll(recordId, input.photos, onPhotoFailure);
  try {
    const id = await run("記録を保存できませんでした", () =>
      supabase.rpc("create_record", {
        p_id: recordId,
        p_work_id: input.workId,
        p_kind: input.kind,
        ...rpcInput(input, uploaded),
      })
    );
    if (typeof id !== "string") throw new AppError("invalid-response", "記録を保存できませんでした");
    return id;
  } catch (error) {
    await removeStorage(uploaded.newlyUploaded);
    throw error;
  }
}

export async function updateRecord(
  record: WorkRecord,
  input: RecordInput,
  onPhotoFailure?: (id: string) => void
): Promise<void> {
  const uploaded = await uploadAll(record.id, input.photos, onPhotoFailure);
  try {
    await run("記録を保存できませんでした", () =>
      supabase.rpc("update_record", { p_record_id: record.id, ...rpcInput(input, uploaded) })
    );
  } catch (error) {
    await removeStorage(uploaded.newlyUploaded);
    throw error;
  }
  const kept = new Set(uploaded.paths);
  await removeStorage(record.photos.map((photo) => photo.storagePath).filter((path) => !kept.has(path)));
}

export async function deleteRecord(record: WorkRecord): Promise<void> {
  await run("記録を削除できませんでした", () => supabase.from("records").delete().eq("id", record.id));
  await removeStorage(record.photos.map((photo) => photo.storagePath));
}

export function photoDraftFromStored(photo: RecordPhoto): PhotoDraft {
  return {
    id: photo.id,
    previewUri: photo.url ?? "",
    localUri: null,
    storagePath: photo.storagePath,
    width: 0,
    height: 0,
    fileSize: null,
  };
}

export function newPhotoDraft(input: {
  uri: string;
  width: number;
  height: number;
  fileSize?: number | null;
}): PhotoDraft {
  return {
    id: randomUUID(),
    previewUri: input.uri,
    localUri: input.uri,
    storagePath: null,
    width: input.width,
    height: input.height,
    fileSize: input.fileSize ?? null,
  };
}
