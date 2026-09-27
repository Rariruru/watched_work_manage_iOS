import { RECORD_KIND_LABEL } from "@/domain/labels";
import { RECORD_KINDS } from "@/domain/types";

export const RECORD_KIND_OPTIONS = RECORD_KINDS.map((value) => ({ value, label: RECORD_KIND_LABEL[value] }));
