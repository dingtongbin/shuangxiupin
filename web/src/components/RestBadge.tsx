import { RestType } from "./typesHelper";

/** 双休=绿 / 单休=红 / 不定=红黑渐变 */
export function RestBadge({ type, label }: { type: number; label?: string }) {
  const cls =
    type === RestType.Double
      ? "sxu-rest sxu-rest-double"
      : type === RestType.Single
        ? "sxu-rest sxu-rest-single"
        : "sxu-rest sxu-rest-unset";
  return <span className={cls}>{label ?? restLabel(type)}</span>;
}

export function restLabel(type: number): string {
  if (type === RestType.Double) return "双休";
  if (type === RestType.Single) return "单休";
  return "不定";
}
