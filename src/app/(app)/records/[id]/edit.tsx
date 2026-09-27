import { useLocalSearchParams, useRouter } from "expo-router";
import { deleteRecord } from "@/api/records";
import { useSave } from "@/api/useSave";
import type { Work, WorkRecord } from "@/domain/types";
import { useDialog } from "@/components/common/dialog";
import { Button } from "@/components/common/ui";
import { RecordEditor } from "@/components/records/RecordEditor";
import { RecordGate } from "@/components/records/RecordGate";

export default function EditRecord() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RecordGate id={id} title="記録を編集">{(record, work) => <Edit record={record} work={work} />}</RecordGate>;
}

function Edit({ record, work }: { record: WorkRecord; work: Work }) {
  const router = useRouter();
  const dialog = useDialog();
  const { run, saving } = useSave();

  async function remove() {
    const proceed = await dialog.confirm({
      title: "この記録を削除しますか？",
      message: "写真とメモも消え、元に戻せません。",
      confirmLabel: "削除する",
      destructive: true,
    });
    if (!proceed) return;
    const ok = await run(() => deleteRecord(record), "削除しました", "記録を削除できませんでした");
    if (ok) router.dismissTo({ pathname: "/works/[id]", params: { id: work.id } });
  }

  return (
    <RecordEditor
      work={work}
      kind={record.kind}
      record={record}
      onCancel={() => router.back()}
      onSaved={() => router.back()}
      footer={<Button label="この記録を削除" variant="danger" small onPress={remove} disabled={saving} />}
    />
  );
}
