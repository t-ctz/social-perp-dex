import { ReactNode, useEffect, useState } from "react";
import { loadLS, saveLS } from "@/lib/hooks";

interface Props {
  id: string;
  title: ReactNode;
  defaultPos: { x: number; y: number };
  width: number;
  height?: number;
  defaultCollapsed?: boolean;
  onClose?: () => void;
  right?: ReactNode;
  children: ReactNode;
  z?: number;
}

type Saved = { x: number; y: number; c: boolean; w?: number; h?: number };

/** Draggable, resizable, collapsible floating widget. Position, size and collapsed state persist in localStorage. */
export function FloatingPanel({ id, title, defaultPos, width, height = 360, defaultCollapsed = false, onClose, right, children, z = 40 }: Props) {
  const [pos, setPos] = useState(defaultPos);
  const [size, setSize] = useState({ w: width, h: height });
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [raised, setRaised] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const [rs, setRs] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    const s = loadLS<Saved | null>("panel:" + id, null);
    if (s) {
      setPos({ x: Math.max(0, Math.min(s.x, window.innerWidth - 120)), y: Math.max(0, Math.min(s.y, window.innerHeight - 40)) });
      setCollapsed(s.c);
      if (s.w && s.h) setSize({ w: s.w, h: s.h });
    }
    setLoaded(true);
  }, [id]);

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) =>
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 100, e.clientX - drag.dx)),
        y: Math.max(0, Math.min(window.innerHeight - 36, e.clientY - drag.dy)),
      });
    const up = () => setDrag(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [drag]);

  useEffect(() => {
    if (!rs) return;
    const move = (e: PointerEvent) =>
      setSize({
        w: Math.max(220, Math.min(window.innerWidth - pos.x - 8, rs.w + (e.clientX - rs.x))),
        h: Math.max(120, Math.min(window.innerHeight - pos.y - 8, rs.h + (e.clientY - rs.y))),
      });
    const up = () => setRs(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [rs, pos.x, pos.y]);

  // Save only after the stored values have been applied, so defaults never overwrite them.
  useEffect(() => {
    if (!loaded || drag || rs) return;
    const v: Saved = { x: pos.x, y: pos.y, c: collapsed, w: size.w, h: size.h };
    saveLS("panel:" + id, v);
  }, [loaded, drag, rs, pos.x, pos.y, collapsed, size.w, size.h, id]);

  return (
    <div
      className="fixed flex flex-col overflow-hidden rounded-lg border border-white/10 bg-[#0f1318]/95 shadow-2xl shadow-black/60 backdrop-blur"
      style={{ left: pos.x, top: pos.y, width: size.w, height: collapsed ? undefined : size.h, zIndex: z + raised }}
      onPointerDown={() => setRaised(5)}
    >
      <div
        className="flex touch-none cursor-grab select-none items-center gap-2 border-b border-white/10 bg-white/[0.03] px-3 py-1.5 active:cursor-grabbing"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          setDrag({ dx: e.clientX - pos.x, dy: e.clientY - pos.y });
        }}
      >
        <span className="text-zinc-500">⠿</span>
        <div className="flex-1 truncate text-xs font-semibold tracking-wide text-zinc-200">{title}</div>
        {right}
        <button className="rounded px-1.5 text-zinc-400 hover:bg-white/10 hover:text-white" onClick={() => setCollapsed((c) => !c)} title={collapsed ? "Expand" : "Collapse"}>
          {collapsed ? "▢" : "–"}
        </button>
        {onClose && <button className="rounded px-1.5 text-zinc-400 hover:bg-white/10 hover:text-white" onClick={onClose} title="Close">✕</button>}
      </div>
      {!collapsed && <div className="min-h-0 flex-1 overflow-auto">{children}</div>}
      {!collapsed && (
        <div
          title="Drag to resize"
          className="absolute bottom-0 right-0 h-3.5 w-3.5 cursor-nwse-resize touch-none"
          style={{ background: "linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.25) 50%)" }}
          onPointerDown={(e) => {
            e.stopPropagation();
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            setRs({ x: e.clientX, y: e.clientY, w: size.w, h: size.h });
          }}
        />
      )}
    </div>
  );
}
