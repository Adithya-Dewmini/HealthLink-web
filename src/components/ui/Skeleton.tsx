import type { CSSProperties } from "react";

type SkeletonProps = {
  width?: number | string;
  height?: number | string;
  className?: string;
};

export default function Skeleton({ width, height, className = "" }: SkeletonProps) {
  const style: CSSProperties = {
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
  };

  return <div className={`hl-skeleton ${className}`.trim()} style={style} aria-hidden="true" />;
}
