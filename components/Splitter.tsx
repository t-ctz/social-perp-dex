import { useRef } from "react";

/** A thin drag handle. dir="x" resizes horizontally, dir="y" vertically. Reports pixel deltas. */
export function Splitter({ dir, onDelta }: { dir: "x" | "y"; onDelta: (d: number) => void }) {
  const last = useRef<number | null>(null);
  const isX = dir === "x";
  return (
    <div
      role="separator"
      aria-orientation={isX ? "vertical" : "horizontal"}
      className={`${isX ? "w-1.5 cursor-col-resize" : "h-1.5 cursor-row-resize"} shrink-0 touch-none bg-white/5 hover:bg-emerald-500/50 active:bg-emerald-500`}
      onPointerDown={(e) => {
        last.current = isX ? e.clientX : e.clientY;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (last.current === null) return;
        const cur = isX ? e.clientX : e.clientY;
        const d = cur - last.current;
        last.current = cur;
        if (d) onDelta(d);
      }}
      onPointerUp={() => (last.current = null)}
      onPointerCancel={() => (last.current = null)}
    />
  );
}
