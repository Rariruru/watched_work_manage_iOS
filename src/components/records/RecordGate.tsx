import { useRouter } from "expo-router";
import { useRecord, useWorks } from "@/api/queries";
import { toAppError } from "@/api/errors";
import type { Work, WorkRecord } from "@/domain/types";
import { Header, Screen, StateView } from "@/components/common/ui";

export function RecordGate(props: {
  id: string | undefined;
  title: string;
  children: (record: WorkRecord, work: Work) => React.ReactNode;
}) {
  const router = useRouter();
  const records = useRecord(props.id);
  const works = useWorks();
  const back = { label: "‹ 戻る", onPress: () => (router.canGoBack() ? router.back() : router.replace("/")) };
  if ((records.query.isError && !records.query.data) || (works.isError && !works.data)) {
    return (
      <Screen>
        <Header title={props.title} left={back} />
        <StateView title="読み込めませんでした" message={toAppError(records.query.error ?? works.error, "記録を読み込めませんでした").message} />
      </Screen>
    );
  }
  if (records.query.isPending || works.isPending) {
    return <Screen><Header title={props.title} left={back} /><StateView loading /></Screen>;
  }
  const record = records.record;
  const work = works.data.find((item) => item.id === record?.workId);
  if (!record || !work) {
    return <Screen><Header title={props.title} left={back} /><StateView title="見つかりませんでした" /></Screen>;
  }
  return <>{props.children(record, work)}</>;
}
