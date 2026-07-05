"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Stage, Layer, Rect, Text, Line, Ellipse, Transformer } from "react-konva";
import Konva from "konva";
import { jsPDF } from "jspdf";
import {
  Type,
  ImagePlus,
  Trash2,
  Save,
  Download,
  FileText,
  ArrowUp,
  ArrowDown,
  Palette as PaletteIcon,
  Check,
  Loader2,
  Shapes,
  Square,
  Circle,
  Minus,
  SquareDashedBottom,
  Table as TableIcon,
  QrCode,
  Info,
  Plus,
  GripVertical,
  RefreshCw,
  Pipette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectMenu } from "@/components/ui/select-menu";
import { NumberField } from "@/components/ui/number-field";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";
import { dashErr } from "@/lib/dash-error";
import type { Dictionary } from "@/i18n/shared";
import {
  A4,
  PALETTES,
  FONT_FAMILIES,
  genId,
  parseFontStyle,
  composeFontStyle,
  applyPaletteToDesign,
  buildIconSvg,
  tableHeight,
  ICON_KEYS,
  DEFAULT_TABLE_ROWS,
  type QrDesign,
  type AnyElement,
  type TextEl,
  type RectEl,
  type QrEl,
  type IconEl,
  type EllipseEl,
  type LineEl,
  type TableEl,
  type TableRow,
  type Palette,
} from "@/lib/qr-template";

type QrT = Dictionary["dashboard"]["qr"];

const WEIGHT_VALUES = ["400", "500", "600", "700", "800"] as const;
const weightLabels = (t: QrT): Record<string, string> => ({
  "400": t.weightNormal,
  "500": t.weightMedium,
  "600": t.weightSemibold,
  "700": t.weightBold,
  "800": t.weightExtrabold,
});
import {
  EditableImage,
  EditableQr,
  EditableIcon,
  EditableTable,
} from "./konva-nodes";
import { saveTemplate } from "./actions";

const SCALE = 0.6;
const EXPORT_RATIO = 2 / SCALE; // ~2x A4 for print quality

interface Props {
  locale: string;
  businessId: string;
  businessName: string;
  bookingUrl: string;
  initialDesign: QrDesign;
  scheduleRows: TableRow[];
}

export function QrEditor({
  locale,
  businessId,
  bookingUrl,
  initialDesign,
  scheduleRows,
}: Props) {
  const t = useDict().dashboard.qr;
  const dErrors = useDict().dashboard.errors;
  const [design, setDesign] = useState<QrDesign>(initialDesign);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [shapePickerOpen, setShapePickerOpen] = useState(false);
  const [browserNoteOpen, setBrowserNoteOpen] = useState(false);
  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({
    v: [],
    h: [],
  });
  const [rubber, setRubber] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef<Map<string, Konva.Node>>(new Map());
  const clipboardRef = useRef<AnyElement[]>([]);
  const designRef = useRef(design);
  const selIdsRef = useRef(selectedIds);
  const dragGroup = useRef<{ id: string; positions: Map<string, { x: number; y: number }> } | null>(null);
  const rubberStart = useRef<{ x: number; y: number } | null>(null);
  const history = useRef<QrDesign[]>([]);
  const future = useRef<QrDesign[]>([]);
  const prevDesign = useRef<QrDesign>(initialDesign);
  const timeTravel = useRef(false);
  designRef.current = design;
  selIdsRef.current = selectedIds;

  const selectElement = useCallback((id: string, additive: boolean) => {
    setSelectedIds((prev) => {
      if (additive)
        return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      return prev.length === 1 && prev[0] === id ? prev : [id];
    });
  }, []);

  const registerRef = useCallback((id: string, node: Konva.Node | null) => {
    if (node) nodeRefs.current.set(id, node);
    else nodeRefs.current.delete(id);
  }, []);

  // Attach the transformer to all selected nodes
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const nodes = selectedIds
      .map((id) => nodeRefs.current.get(id))
      .filter((n): n is Konva.Node => !!n);
    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  }, [selectedIds, design]);

  // Redraw once web fonts are ready (canvas text metrics)
  useEffect(() => {
    document.fonts?.ready.then(() => {
      stageRef.current?.batchDraw();
    });
  }, []);

  const selectedEls = design.elements.filter((e) =>
    selectedIds.includes(e.id),
  );
  const selected = selectedEls.length === 1 ? selectedEls[0] : null;

  const update = (id: string, patch: Partial<AnyElement>) => {
    setDesign((d) => ({
      ...d,
      elements: d.elements.map((e) =>
        e.id === id ? ({ ...e, ...patch } as AnyElement) : e,
      ),
    }));
    setSaved(false);
  };

  const addText = () => {
    const el: TextEl = {
      id: genId("txt"),
      type: "text",
      x: A4.width / 2 - 80,
      y: A4.height / 2,
      // no fixed width → the box grows with the text
      text: t.newText,
      fontSize: 28,
      fontFamily: "Inter",
      fontStyle: "normal",
      fill: "#0a0a0a",
      align: "left",
      lineHeight: 1.2,
    };
    setDesign((d) => ({ ...d, elements: [...d.elements, el] }));
    setSelectedIds([el.id]);
    setSaved(false);
  };

  const addIcon = (iconKey: string) => {
    const el: IconEl = {
      id: genId("icon"),
      type: "icon",
      x: A4.width / 2 - 32,
      y: A4.height / 2 - 32,
      size: 64,
      iconKey,
      color: "#C89B3C",
      bg: "#111111",
    };
    setDesign((d) => ({ ...d, elements: [...d.elements, el] }));
    setSelectedIds([el.id]);
    setSaved(false);
  };

  const addQr = () => {
    const el: QrEl = {
      id: genId("qr"),
      type: "qr",
      x: A4.width / 2 - 115,
      y: A4.height / 2 - 115,
      size: 230,
      data: bookingUrl,
      fill: "#111111",
      background: "#ffffff",
    };
    setDesign((d) => ({ ...d, elements: [...d.elements, el] }));
    setSelectedIds([el.id]);
    setSaved(false);
  };

  const addShape = (kind: "rect" | "round" | "ellipse" | "line") => {
    const cx = A4.width / 2;
    const cy = A4.height / 2;
    let el: AnyElement;
    if (kind === "line") {
      el = {
        id: genId("line"),
        type: "line",
        x: cx - 120,
        y: cy,
        points: [0, 0, 240, 0],
        stroke: "#111111",
        strokeWidth: 4,
      };
    } else if (kind === "ellipse") {
      el = {
        id: genId("ellipse"),
        type: "ellipse",
        x: cx,
        y: cy,
        radiusX: 90,
        radiusY: 90,
        fill: "#C89B3C",
        stroke: undefined,
        strokeWidth: 0,
      };
    } else {
      el = {
        id: genId("rect"),
        type: "rect",
        x: cx - 110,
        y: cy - 70,
        width: 220,
        height: 140,
        fill: "#C89B3C",
        cornerRadius: kind === "round" ? 24 : 0,
      };
    }
    setDesign((d) => ({ ...d, elements: [...d.elements, el] }));
    setSelectedIds([el.id]);
    setSaved(false);
  };

  const addTable = () => {
    const el: TableEl = {
      id: genId("table"),
      type: "table",
      x: 96,
      y: 430,
      width: 320,
      rowHeight: 36,
      fontSize: 18,
      fontFamily: "Montserrat",
      labelColor: "#1F1F1F",
      valueColor: "#1F1F1F",
      borderColor: "#C89B3C",
      borderWidth: 1,
      showOuter: false,
      showColLine: false,
      rows: (scheduleRows.length ? scheduleRows : DEFAULT_TABLE_ROWS).map((r) => ({
        ...r,
      })),
    };
    setDesign((d) => ({ ...d, elements: [...d.elements, el] }));
    setSelectedIds([el.id]);
    setSaved(false);
  };

  const addImageFromUrl = (src: string) => {
    const el = {
      id: genId("img"),
      type: "image" as const,
      x: A4.width / 2 - 100,
      y: 120,
      width: 200,
      height: 200,
      src,
    };
    setDesign((d) => ({ ...d, elements: [...d.elements, el] }));
    setSelectedIds([el.id]);
    setSaved(false);
  };

  const uploadLogo = async (file: File) => {
    setBusy("upload");
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "png";
      const path = `${businessId}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("business-assets")
        .upload(path, file, { upsert: true });
      if (error) {
        alert(t.uploadFailed + error.message);
        return;
      }
      const { data } = supabase.storage
        .from("business-assets")
        .getPublicUrl(path);
      addImageFromUrl(data.publicUrl);
    } finally {
      setBusy(null);
    }
  };

  const deleteSelected = () => {
    const ids = selIdsRef.current;
    if (ids.length === 0) return;
    setDesign((d) => ({
      ...d,
      elements: d.elements.filter((e) => !ids.includes(e.id)),
    }));
    ids.forEach((id) => nodeRefs.current.delete(id));
    setSelectedIds([]);
    setSaved(false);
  };

  const reorder = (dir: "up" | "down") => {
    const id = selectedIds[0];
    if (!id) return;
    setDesign((d) => {
      const idx = d.elements.findIndex((e) => e.id === id);
      if (idx < 0) return d;
      const target = dir === "up" ? idx + 1 : idx - 1;
      if (target < 0 || target >= d.elements.length) return d;
      const els = [...d.elements];
      [els[idx], els[target]] = [els[target], els[idx]];
      return { ...d, elements: els };
    });
    setSaved(false);
  };

  const applyPalette = (p: Palette) => {
    setDesign((d) => applyPaletteToDesign(d, p));
    setSaved(false);
  };

  // Rotate an element to an exact angle, keeping its centre fixed.
  const rotateElement = (id: string, deg: number) => {
    const el = designRef.current.elements.find((e) => e.id === id);
    const node = nodeRefs.current.get(id);
    if (!el) return;
    if (!node || el.type === "ellipse") {
      // Ellipse origin is already its centre
      update(id, { rotation: deg });
      return;
    }
    const w = node.width();
    const h = node.height();
    const r0 = ((node.rotation() || 0) * Math.PI) / 180;
    const x = node.x();
    const y = node.y();
    const cx = x + (w / 2) * Math.cos(r0) - (h / 2) * Math.sin(r0);
    const cy = y + (w / 2) * Math.sin(r0) + (h / 2) * Math.cos(r0);
    const r1 = (deg * Math.PI) / 180;
    const nx = cx - ((w / 2) * Math.cos(r1) - (h / 2) * Math.sin(r1));
    const ny = cy - ((w / 2) * Math.sin(r1) + (h / 2) * Math.cos(r1));
    update(id, { rotation: deg, x: nx, y: ny });
  };

  // ── Drag: group move + snapping guides ──
  const onElDragStart = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const id = e.target.id();
    let ids = selIdsRef.current;
    if (!ids.includes(id)) {
      ids = [id];
      setSelectedIds([id]);
    }
    if (ids.length > 1) {
      const positions = new Map<string, { x: number; y: number }>();
      ids.forEach((sid) => {
        const n = nodeRefs.current.get(sid);
        if (n) positions.set(sid, { x: n.x(), y: n.y() });
      });
      dragGroup.current = { id, positions };
    } else {
      dragGroup.current = null;
    }
  }, []);

  const onElDragMove = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const group = dragGroup.current;
    // Multi-select: move the whole group, no snapping
    if (group) {
      const start = group.positions.get(group.id);
      if (start) {
        const dx = node.x() - start.x;
        const dy = node.y() - start.y;
        group.positions.forEach((pos, sid) => {
          if (sid === group.id) return;
          const n = nodeRefs.current.get(sid);
          if (n) {
            n.x(pos.x + dx);
            n.y(pos.y + dy);
          }
        });
      }
      setGuides({ v: [], h: [] });
      return;
    }
    // Shift held → free move, no snapping
    if (e.evt?.shiftKey) {
      setGuides({ v: [], h: [] });
      return;
    }
    const layer = node.getLayer();
    if (!layer) return;
    const T = 6; // snap threshold (canvas px)
    const box = node.getClientRect({ relativeTo: layer });
    const vPts = [box.x, box.x + box.width / 2, box.x + box.width];
    const hPts = [box.y, box.y + box.height / 2, box.y + box.height];
    const vTargets = [0, A4.width / 2, A4.width];
    const hTargets = [0, A4.height / 2, A4.height];
    designRef.current.elements.forEach((el) => {
      if (el.id === node.id()) return;
      const n = nodeRefs.current.get(el.id);
      if (!n) return;
      const r = n.getClientRect({ relativeTo: layer });
      vTargets.push(r.x, r.x + r.width / 2, r.x + r.width);
      hTargets.push(r.y, r.y + r.height / 2, r.y + r.height);
    });
    let bestV: { d: number; line: number } | null = null;
    let bestH: { d: number; line: number } | null = null;
    vPts.forEach((pt) =>
      vTargets.forEach((t) => {
        const d = t - pt;
        if (Math.abs(d) <= T && (!bestV || Math.abs(d) < Math.abs(bestV.d)))
          bestV = { d, line: t };
      }),
    );
    hPts.forEach((pt) =>
      hTargets.forEach((t) => {
        const d = t - pt;
        if (Math.abs(d) <= T && (!bestH || Math.abs(d) < Math.abs(bestH.d)))
          bestH = { d, line: t };
      }),
    );
    if (bestV) node.x(node.x() + (bestV as { d: number }).d);
    if (bestH) node.y(node.y() + (bestH as { d: number }).d);
    setGuides({
      v: bestV ? [(bestV as { line: number }).line] : [],
      h: bestH ? [(bestH as { line: number }).line] : [],
    });
  }, []);

  const onElDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    setGuides({ v: [], h: [] });
    const group = dragGroup.current;
    if (group) {
      setDesign((d) => ({
        ...d,
        elements: d.elements.map((el) => {
          const n = nodeRefs.current.get(el.id);
          return group.positions.has(el.id) && n
            ? { ...el, x: n.x(), y: n.y() }
            : el;
        }),
      }));
      dragGroup.current = null;
    } else {
      const node = e.target;
      setDesign((d) => ({
        ...d,
        elements: d.elements.map((el) =>
          el.id === node.id() ? { ...el, x: node.x(), y: node.y() } : el,
        ),
      }));
    }
    setSaved(false);
  }, []);

  // ── Keyboard shortcuts (operate on all selected) ──
  const removeIds = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setDesign((d) => ({
      ...d,
      elements: d.elements.filter((e) => !ids.includes(e.id)),
    }));
    ids.forEach((id) => nodeRefs.current.delete(id));
    setSelectedIds([]);
    setSaved(false);
  }, []);

  const pasteElements = useCallback((srcs: AnyElement[]) => {
    if (srcs.length === 0) return;
    const clones = srcs.map(
      (src) =>
        ({ ...src, id: genId(src.type), x: src.x + 18, y: src.y + 18 }) as AnyElement,
    );
    setDesign((d) => ({ ...d, elements: [...d.elements, ...clones] }));
    setSelectedIds(clones.map((c) => c.id));
    setSaved(false);
  }, []);

  const moveMany = useCallback((ids: string[], dx: number, dy: number) => {
    setDesign((d) => ({
      ...d,
      elements: d.elements.map((e) =>
        ids.includes(e.id) ? { ...e, x: e.x + dx, y: e.y + dy } : e,
      ),
    }));
    setSaved(false);
  }, []);

  // ── Undo / Redo history ──
  useEffect(() => {
    if (timeTravel.current) {
      timeTravel.current = false;
      prevDesign.current = design;
      return;
    }
    if (design === prevDesign.current) return;
    history.current.push(prevDesign.current);
    if (history.current.length > 60) history.current.shift();
    future.current = []; // a new edit invalidates redo
    prevDesign.current = design;
  }, [design]);

  const undo = useCallback(() => {
    if (history.current.length === 0) return;
    const prev = history.current.pop()!;
    future.current.push(prevDesign.current);
    timeTravel.current = true;
    setSelectedIds([]);
    setDesign(prev);
    setSaved(false);
  }, []);

  const redo = useCallback(() => {
    if (future.current.length === 0) return;
    const next = future.current.pop()!;
    history.current.push(prevDesign.current);
    timeTravel.current = true;
    setSelectedIds([]);
    setDesign(next);
    setSaved(false);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        t?.isContentEditable
      )
        return;

      const mod = e.ctrlKey || e.metaKey;
      const ids = selIdsRef.current;
      const els = designRef.current.elements.filter((el) =>
        ids.includes(el.id),
      );
      const key = e.key.toLowerCase();

      if (mod && key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (mod && (key === "y" || (key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && ids.length) {
        e.preventDefault();
        removeIds(ids);
      } else if (mod && key === "c" && els.length) {
        clipboardRef.current = els;
      } else if (mod && key === "x" && els.length) {
        clipboardRef.current = els;
        removeIds(ids);
      } else if (mod && key === "v" && clipboardRef.current.length) {
        e.preventDefault();
        pasteElements(clipboardRef.current);
      } else if (mod && key === "d" && els.length) {
        e.preventDefault();
        pasteElements(els);
      } else if (e.key === "Escape") {
        setSelectedIds([]);
      } else if (
        ids.length &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        moveMany(ids, dx, dy);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [removeIds, pasteElements, moveMany, undo, redo]);

  // ── Rubber-band selection (drag on empty canvas) ──
  const toDesignCoords = () => {
    const stage = stageRef.current;
    const pos = stage?.getPointerPosition();
    if (!pos) return null;
    return { x: pos.x / SCALE, y: pos.y / SCALE };
  };

  const onStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target !== e.target.getStage()) return; // clicked an element
    const p = toDesignCoords();
    if (!p) return;
    rubberStart.current = p;
    setRubber({ x: p.x, y: p.y, w: 0, h: 0 });
    if (!e.evt.shiftKey) setSelectedIds([]);
  };

  const onStageMouseMove = () => {
    const s = rubberStart.current;
    if (!s) return;
    const p = toDesignCoords();
    if (!p) return;
    setRubber({
      x: Math.min(s.x, p.x),
      y: Math.min(s.y, p.y),
      w: Math.abs(p.x - s.x),
      h: Math.abs(p.y - s.y),
    });
  };

  const onStageMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const s = rubberStart.current;
    rubberStart.current = null;
    if (!s) return;
    const p = toDesignCoords();
    setRubber(null);
    if (!p) return;
    const r = {
      x: Math.min(s.x, p.x),
      y: Math.min(s.y, p.y),
      w: Math.abs(p.x - s.x),
      h: Math.abs(p.y - s.y),
    };
    if (r.w < 5 && r.h < 5) return; // just a click on empty space
    const layer = stageRef.current?.getChildren()[0] as Konva.Layer | undefined;
    const hits = designRef.current.elements
      .filter((el) => {
        const n = nodeRefs.current.get(el.id);
        if (!n || !layer) return false;
        const cr = n.getClientRect({ relativeTo: layer });
        return !(
          cr.x > r.x + r.w ||
          cr.x + cr.width < r.x ||
          cr.y > r.y + r.h ||
          cr.y + cr.height < r.y
        );
      })
      .map((el) => el.id);
    setSelectedIds((prev) =>
      e.evt.shiftKey ? Array.from(new Set([...prev, ...hits])) : hits,
    );
  };

  // ── Export helpers ──
  const getPng = (ratio: number): string | null => {
    const stage = stageRef.current;
    const tr = trRef.current;
    if (!stage) return null;
    const prev = tr?.nodes() ?? [];
    tr?.nodes([]);
    stage.draw();
    const url = stage.toDataURL({ pixelRatio: ratio, mimeType: "image/png" });
    tr?.nodes(prev as Konva.Node[]);
    stage.draw();
    return url;
  };

  const slug = bookingUrl.split("/").pop() || "qlick";

  const exportPng = () => {
    const url = getPng(EXPORT_RATIO);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-qr-poster.png`;
    a.click();
  };

  const exportPdf = () => {
    const url = getPng(EXPORT_RATIO);
    if (!url) return;
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    pdf.addImage(url, "PNG", 0, 0, 210, 297, undefined, "FAST");
    pdf.save(`${slug}-qr-poster.pdf`);
  };

  const save = async () => {
    setSaving(true);
    const res = await saveTemplate(
      locale,
      design as unknown as Record<string, unknown>,
    );
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      alert(dashErr(dErrors, res.error, t.saveFailed));
    }
  };

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface/40 px-6 py-3">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={addText}>
            <Type className="size-4" /> {t.text}
          </Button>
          <label>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadLogo(f);
                e.target.value = "";
              }}
            />
            <span className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground transition-[transform,background-color,border-color] duration-200 ease-[var(--ease-out)] hover:border-gold-soft hover:bg-surface-2 active:scale-[0.97]">
              {busy === "upload" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ImagePlus className="size-4" />
              )}
              {t.logoImage}
            </span>
          </label>

          {/* Icon picker */}
          <div className="relative">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIconPickerOpen((v) => !v)}
            >
              <Shapes className="size-4" /> {t.icon}
            </Button>
            {iconPickerOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIconPickerOpen(false)}
                />
                <div className="absolute left-0 top-11 z-20 grid w-64 grid-cols-5 gap-1.5 rounded-xl border border-border bg-surface-2 p-2 shadow-2xl shadow-black/60">
                  {ICON_KEYS.map((key) => (
                    <button
                      key={key}
                      onClick={() => {
                        addIcon(key);
                        setIconPickerOpen(false);
                      }}
                      title={key}
                      className="grid aspect-square place-items-center rounded-lg border border-border bg-surface p-1.5 transition-[transform,background-color,border-color] duration-200 ease-[var(--ease-out)] hover:border-gold hover:bg-gold/10 active:scale-95"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          "data:image/svg+xml," +
                          encodeURIComponent(
                            buildIconSvg(key, "#f5f5f4", "none", 48),
                          )
                        }
                        alt={key}
                        className="size-7"
                      />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Shape picker */}
          <div className="relative">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShapePickerOpen((v) => !v)}
            >
              <Square className="size-4" /> {t.shapes}
            </Button>
            {shapePickerOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShapePickerOpen(false)}
                />
                <div className="absolute left-0 top-11 z-20 flex w-44 flex-col gap-1 rounded-xl border border-border bg-surface-2 p-2 shadow-2xl shadow-black/60">
                  {[
                    { kind: "rect" as const, label: t.shapeRect, Icon: Square },
                    { kind: "round" as const, label: t.shapeRound, Icon: SquareDashedBottom },
                    { kind: "ellipse" as const, label: t.shapeCircle, Icon: Circle },
                    { kind: "line" as const, label: t.shapeLine, Icon: Minus },
                  ].map(({ kind, label, Icon }) => (
                    <button
                      key={kind}
                      onClick={() => {
                        addShape(kind);
                        setShapePickerOpen(false);
                      }}
                      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground transition-[transform,background-color,color] duration-200 ease-[var(--ease-out)] hover:bg-gold/10 hover:text-gold active:scale-[0.98]"
                    >
                      <Icon className="size-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <Button size="sm" variant="secondary" onClick={addTable}>
            <TableIcon className="size-4" /> {t.table}
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={addQr}
            disabled={design.elements.some((e) => e.type === "qr")}
            title={
              design.elements.some((e) => e.type === "qr")
                ? t.qrExists
                : t.qrAdd
            }
          >
            <QrCode className="size-4" /> QR
          </Button>

          {/* Help: why the poster can look different in some browsers */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setBrowserNoteOpen((v) => !v)}
              title={t.browserNoteTitle}
              aria-label={t.browserNoteTitle}
              className="grid size-9 place-items-center rounded-full border border-border bg-surface text-muted transition-[transform,background-color,border-color,color] duration-200 ease-[var(--ease-out)] hover:border-gold-soft hover:text-gold active:scale-95"
            >
              <Info className="size-4" />
            </button>
            {browserNoteOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setBrowserNoteOpen(false)}
                />
                <div className="absolute right-0 top-11 z-20 w-72 rounded-xl border border-border bg-surface-2 p-3.5 text-sm shadow-2xl shadow-black/60">
                  <p className="mb-1 font-medium text-foreground">
                    {t.browserNoteTitle}
                  </p>
                  <p className="leading-relaxed text-muted">
                    {t.browserNoteBody}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={exportPng}>
            <Download className="size-4" /> PNG
          </Button>
          <Button size="sm" variant="ghost" onClick={exportPdf}>
            <FileText className="size-4" /> PDF
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : saved ? (
              <Check className="size-4" />
            ) : (
              <Save className="size-4" />
            )}
            {saved ? t.saved : t.save}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas area — click on the empty grey area deselects */}
        <div
          className="flex flex-1 items-center justify-center overflow-auto bg-surface-2/30 p-6"
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).tagName !== "CANVAS")
              setSelectedIds([]);
          }}
        >
          <div className="shadow-2xl shadow-black/50 ring-1 ring-gold/15">
            <Stage
              ref={stageRef}
              width={A4.width * SCALE}
              height={A4.height * SCALE}
              scaleX={SCALE}
              scaleY={SCALE}
              onMouseDown={onStageMouseDown}
              onMouseMove={onStageMouseMove}
              onMouseUp={onStageMouseUp}
              onTouchStart={(e) => {
                if (e.target === e.target.getStage()) setSelectedIds([]);
              }}
            >
              <Layer>
                {/* Background (non-interactive so empty clicks hit the stage) */}
                <Rect
                  x={0}
                  y={0}
                  width={A4.width}
                  height={A4.height}
                  fill={design.background}
                  listening={false}
                />
                {design.elements.map((el) => {
                  const onSelect = (additive: boolean) =>
                    selectElement(el.id, additive);
                  const onClickSelect = (
                    ev: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
                  ) =>
                    selectElement(
                      el.id,
                      ev.evt.shiftKey || ev.evt.metaKey || ev.evt.ctrlKey,
                    );
                  const onChange = (attrs: {
                    x: number;
                    y: number;
                    rotation: number;
                    width?: number;
                    height?: number;
                  }) => {
                    if ((el.type === "qr" || el.type === "icon") && attrs.width)
                      update(el.id, { x: attrs.x, y: attrs.y, rotation: attrs.rotation, size: attrs.width });
                    else if (el.type === "table" && attrs.width) {
                      const oldH = tableHeight(el);
                      const ratio = attrs.height && oldH ? attrs.height / oldH : 1;
                      update(el.id, {
                        x: attrs.x,
                        y: attrs.y,
                        rotation: attrs.rotation,
                        width: attrs.width,
                        rowHeight: Math.max(14, Math.round(el.rowHeight * ratio)),
                        fontSize: Math.max(8, Math.round(el.fontSize * ratio)),
                      });
                    } else update(el.id, attrs as Partial<AnyElement>);
                  };

                  if (el.type === "rect") {
                    return (
                      <Rect
                        key={el.id}
                        id={el.id}
                        ref={(n) => registerRef(el.id, n)}
                        x={el.x}
                        y={el.y}
                        width={el.width}
                        height={el.height}
                        fill={el.fill ?? undefined}
                        stroke={el.stroke}
                        strokeWidth={el.strokeWidth}
                        strokeScaleEnabled={false}
                        cornerRadius={el.cornerRadius}
                        rotation={el.rotation ?? 0}
                        opacity={el.opacity ?? 1}
                        draggable
                        onClick={onClickSelect}
                        onTap={onClickSelect}
                        onDragStart={onElDragStart}
                        onDragMove={onElDragMove}
                        onDragEnd={onElDragEnd}
                        onTransformEnd={(e) => {
                          const n = e.target;
                          const sx = n.scaleX();
                          const sy = n.scaleY();
                          n.scaleX(1);
                          n.scaleY(1);
                          update(el.id, {
                            x: n.x(),
                            y: n.y(),
                            rotation: n.rotation(),
                            width: Math.max(10, el.width * sx),
                            height: Math.max(10, el.height * sy),
                          });
                        }}
                      />
                    );
                  }

                  if (el.type === "line") {
                    return (
                      <Line
                        key={el.id}
                        id={el.id}
                        ref={(n) => registerRef(el.id, n)}
                        x={el.x}
                        y={el.y}
                        points={el.points}
                        stroke={el.stroke}
                        strokeWidth={el.strokeWidth}
                        strokeScaleEnabled={false}
                        hitStrokeWidth={20}
                        rotation={el.rotation ?? 0}
                        draggable
                        onClick={onClickSelect}
                        onTap={onClickSelect}
                        onDragStart={onElDragStart}
                        onDragMove={onElDragMove}
                        onDragEnd={onElDragEnd}
                        onTransformEnd={(e) => {
                          const n = e.target;
                          const sx = n.scaleX();
                          const sy = n.scaleY();
                          n.scaleX(1);
                          n.scaleY(1);
                          update(el.id, {
                            x: n.x(),
                            y: n.y(),
                            rotation: n.rotation(),
                            points: el.points.map((p, i) =>
                              i % 2 === 0 ? p * sx : p * sy,
                            ),
                          });
                        }}
                      />
                    );
                  }

                  if (el.type === "ellipse") {
                    return (
                      <Ellipse
                        key={el.id}
                        id={el.id}
                        ref={(n) => registerRef(el.id, n)}
                        x={el.x}
                        y={el.y}
                        radiusX={el.radiusX}
                        radiusY={el.radiusY}
                        fill={el.fill ?? undefined}
                        stroke={el.stroke}
                        strokeWidth={el.strokeWidth}
                        strokeScaleEnabled={false}
                        rotation={el.rotation ?? 0}
                        opacity={el.opacity ?? 1}
                        draggable
                        onClick={onClickSelect}
                        onTap={onClickSelect}
                        onDragStart={onElDragStart}
                        onDragMove={onElDragMove}
                        onDragEnd={onElDragEnd}
                        onTransformEnd={(e) => {
                          const n = e.target;
                          const sx = n.scaleX();
                          const sy = n.scaleY();
                          n.scaleX(1);
                          n.scaleY(1);
                          update(el.id, {
                            x: n.x(),
                            y: n.y(),
                            rotation: n.rotation(),
                            radiusX: Math.max(5, el.radiusX * sx),
                            radiusY: Math.max(5, el.radiusY * sy),
                          });
                        }}
                      />
                    );
                  }

                  if (el.type === "text") {
                    return (
                      <Text
                        key={el.id}
                        id={el.id}
                        ref={(n) => registerRef(el.id, n)}
                        x={el.x}
                        y={el.y}
                        width={el.width}
                        text={el.text}
                        fontSize={el.fontSize}
                        fontFamily={el.fontFamily}
                        fontStyle={el.fontStyle}
                        fill={el.fill}
                        align={el.align}
                        lineHeight={el.lineHeight}
                        letterSpacing={el.letterSpacing ?? 0}
                        rotation={el.rotation ?? 0}
                        opacity={el.opacity ?? 1}
                        draggable
                        onClick={onClickSelect}
                        onTap={onClickSelect}
                        onDragStart={onElDragStart}
                        onDragMove={onElDragMove}
                        onDragEnd={onElDragEnd}
                        onTransformEnd={(e) => {
                          const n = e.target;
                          const sx = n.scaleX();
                          const sy = n.scaleY();
                          n.scaleX(1);
                          n.scaleY(1);
                          update(el.id, {
                            x: n.x(),
                            y: n.y(),
                            rotation: n.rotation(),
                            width: Math.max(40, (el.width ?? n.width()) * sx),
                            fontSize: Math.max(8, Math.round(el.fontSize * sy)),
                          });
                        }}
                      />
                    );
                  }

                  const sharedNodeProps = {
                    onSelect,
                    onChange,
                    onDragStart: onElDragStart,
                    onDragMove: onElDragMove,
                    onDragEnd: onElDragEnd,
                    registerRef,
                  };

                  if (el.type === "image") {
                    return (
                      <EditableImage
                        key={el.id}
                        el={el}
                        isDraggable
                        {...sharedNodeProps}
                      />
                    );
                  }

                  if (el.type === "qr") {
                    return (
                      <EditableQr
                        key={el.id}
                        el={el}
                        isDraggable
                        {...sharedNodeProps}
                      />
                    );
                  }

                  if (el.type === "icon") {
                    return (
                      <EditableIcon
                        key={el.id}
                        el={el}
                        isDraggable
                        {...sharedNodeProps}
                      />
                    );
                  }

                  if (el.type === "table") {
                    return (
                      <EditableTable
                        key={el.id}
                        el={el}
                        isDraggable
                        {...sharedNodeProps}
                      />
                    );
                  }
                  return null;
                })}

                {/* Alignment guides */}
                {guides.v.map((x, i) => (
                  <Line
                    key={`gv-${i}`}
                    points={[x, 0, x, A4.height]}
                    stroke="#22d3ee"
                    strokeWidth={1}
                    dash={[4, 4]}
                    listening={false}
                  />
                ))}
                {guides.h.map((y, i) => (
                  <Line
                    key={`gh-${i}`}
                    points={[0, y, A4.width, y]}
                    stroke="#22d3ee"
                    strokeWidth={1}
                    dash={[4, 4]}
                    listening={false}
                  />
                ))}

                {/* Rubber-band selection rectangle */}
                {rubber && (
                  <Rect
                    x={rubber.x}
                    y={rubber.y}
                    width={rubber.w}
                    height={rubber.h}
                    fill="rgba(34,211,238,0.12)"
                    stroke="#22d3ee"
                    strokeWidth={1}
                    listening={false}
                  />
                )}

                <Transformer
                  ref={trRef}
                  rotateEnabled
                  rotateAnchorOffset={28}
                  rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
                  padding={4}
                  keepRatio={false}
                  anchorStroke="#c9a35a"
                  anchorFill="#ffffff"
                  borderStroke="#c9a35a"
                  anchorSize={10}
                  boundBoxFunc={(oldBox, newBox) =>
                    Math.max(Math.abs(newBox.width), Math.abs(newBox.height)) < 5
                      ? oldBox
                      : newBox
                  }
                />
              </Layer>
            </Stage>
          </div>
        </div>

        {/* Properties panel */}
        <PropertiesPanel
          design={design}
          selected={selected}
          selectedCount={selectedEls.length}
          scheduleRows={scheduleRows}
          onUpdate={update}
          onRotate={rotateElement}
          onDelete={deleteSelected}
          onReorder={reorder}
          onBackground={(c) => {
            setDesign((d) => ({ ...d, background: c }));
            setSaved(false);
          }}
          onPalette={applyPalette}
        />
      </div>
    </div>
  );
}

/* ════════════════════ Properties panel ════════════════════ */

function PropertiesPanel({
  design,
  selected,
  selectedCount,
  scheduleRows,
  onUpdate,
  onRotate,
  onDelete,
  onReorder,
  onBackground,
  onPalette,
}: {
  design: QrDesign;
  selected: AnyElement | null;
  selectedCount: number;
  scheduleRows: TableRow[];
  onUpdate: (id: string, patch: Partial<AnyElement>) => void;
  onRotate: (id: string, deg: number) => void;
  onDelete: () => void;
  onReorder: (dir: "up" | "down") => void;
  onBackground: (color: string) => void;
  onPalette: (p: (typeof PALETTES)[number]) => void;
}) {
  const t = useDict().dashboard.qr;
  return (
    <aside className="w-72 shrink-0 space-y-5 overflow-y-auto border-l border-border bg-surface/40 p-4">
      {/* Palettes */}
      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-gold">
          <PaletteIcon className="size-3.5" /> {t.palettes}
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {PALETTES.map((p) => (
            <button
              key={p.name}
              onClick={() => onPalette(p)}
              title={p.name}
              className="flex h-10 overflow-hidden rounded-lg border border-border"
            >
              <span className="flex-1" style={{ background: p.bg }} />
              <span className="flex-1" style={{ background: p.primary }} />
              <span className="flex-1" style={{ background: p.accent }} />
            </button>
          ))}
        </div>
        <div className="mt-3">
          <Label>{t.background}</Label>
          <ColorInput value={design.background} onChange={onBackground} />
        </div>
      </div>

      <div className="h-px bg-border" />

      {selectedCount > 1 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">
              {selectedCount} {t.elementsSelected}
            </h3>
            <IconBtn
              title={t.deleteAll}
              onClick={onDelete}
              className="hover:bg-danger/10 hover:text-danger"
            >
              <Trash2 className="size-4" />
            </IconBtn>
          </div>
          <p className="text-sm text-muted">
            {t.multiHint1}{" "}
            <Kbd>Shift</Kbd> {t.multiHint2}
          </p>
        </div>
      ) : !selected ? (
        <div className="space-y-3 text-sm text-muted">
          <p>{t.noSelHint1}</p>
          <p>
            {t.noSelHint2a} <Kbd>Shift</Kbd> {t.noSelHint2b}
          </p>
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-gold">
              {t.shortcuts}
            </p>
            <ul className="space-y-1.5 text-xs text-muted">
              {[
                { label: t.scCopy, keys: "Ctrl + C" },
                { label: t.scCut, keys: "Ctrl + X" },
                { label: t.scPaste, keys: "Ctrl + V" },
                { label: t.scUndo, keys: "Ctrl + Z" },
                { label: t.scRedo, keys: "Ctrl + Y" },
                { label: t.scDuplicate, keys: "Ctrl + D" },
                { label: t.scDelete, keys: "Delete" },
                { label: t.scDeselect, keys: "Esc" },
                { label: t.scMove, keys: "↑ ↓ ← →" },
                { label: t.scNoMagnet, keys: "Shift + " + t.dragKey },
              ].map((s) => (
                <li key={s.label} className="flex items-center justify-between gap-2">
                  <span>{s.label}</span>
                  <Kbd>{s.keys}</Kbd>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">
              {labelForType(selected.type, t)}
            </h3>
            <div className="flex gap-1">
              <IconBtn title={t.front} onClick={() => onReorder("up")}>
                <ArrowUp className="size-4" />
              </IconBtn>
              <IconBtn title={t.back} onClick={() => onReorder("down")}>
                <ArrowDown className="size-4" />
              </IconBtn>
              <IconBtn
                title={t.delete}
                onClick={onDelete}
                className="hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 className="size-4" />
              </IconBtn>
            </div>
          </div>

          {selected.type === "text" && (
            <TextProps el={selected} onUpdate={onUpdate} />
          )}
          {selected.type === "rect" && (
            <RectProps el={selected} onUpdate={onUpdate} />
          )}
          {selected.type === "ellipse" && (
            <EllipseProps el={selected} onUpdate={onUpdate} />
          )}
          {selected.type === "line" && (
            <LineProps el={selected} onUpdate={onUpdate} />
          )}
          {selected.type === "table" && (
            <TableProps
              el={selected}
              onUpdate={onUpdate}
              scheduleRows={scheduleRows}
            />
          )}
          {selected.type === "qr" && (
            <QrProps el={selected} onUpdate={onUpdate} />
          )}
          {selected.type === "icon" && (
            <IconProps el={selected} onUpdate={onUpdate} />
          )}

          {/* Rotation (common) */}
          <div>
            <Label>{t.rotation}</Label>
            <div className="flex items-center gap-1.5">
              <NumberField
                value={Math.round(selected.rotation ?? 0)}
                onChange={(e) =>
                  onRotate(selected.id, Number(e.target.value) || 0)
                }
                className="h-9 w-20"
              />
              {[0, 45, 90, -90].map((a) => (
                <button
                  key={a}
                  onClick={() => onRotate(selected.id, a)}
                  className="h-9 flex-1 rounded-lg border border-border text-xs text-muted transition-[transform,background-color,border-color,color] duration-200 ease-[var(--ease-out)] hover:border-gold hover:text-gold active:scale-95"
                >
                  {a}°
                </button>
              ))}
            </div>
          </div>

          {/* Opacity (common) */}
          <div>
            <Label>{t.opacity}</Label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={selected.opacity ?? 1}
              onChange={(e) =>
                onUpdate(selected.id, { opacity: Number(e.target.value) })
              }
              className="w-full accent-[var(--gold)]"
            />
          </div>
        </div>
      )}
    </aside>
  );
}

function TextProps({
  el,
  onUpdate,
}: {
  el: TextEl;
  onUpdate: (id: string, patch: Partial<AnyElement>) => void;
}) {
  const t = useDict().dashboard.qr;
  const labels = weightLabels(t);
  const { weight, italic } = parseFontStyle(el.fontStyle);
  return (
    <div className="space-y-3">
      <div>
        <Label>{t.text}</Label>
        <textarea
          value={el.text}
          onChange={(e) => onUpdate(el.id, { text: e.target.value })}
          rows={3}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:border-gold focus-visible:outline-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>{t.size}</Label>
          <NumberField
            value={el.fontSize}
            min={8}
            onChange={(e) =>
              onUpdate(el.id, { fontSize: Number(e.target.value) })
            }
            className="h-9"
          />
        </div>
        <div>
          <Label>{t.color}</Label>
          <ColorInput
            value={el.fill}
            onChange={(c) => onUpdate(el.id, { fill: c })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>{t.font}</Label>
          <SelectMenu
            value={el.fontFamily}
            onChange={(v) => onUpdate(el.id, { fontFamily: v })}
            ariaLabel={t.font}
            triggerClassName="h-9 px-2.5"
            options={FONT_FAMILIES.map((f) => ({ value: f, label: f }))}
          />
        </div>
        <div>
          <Label>{t.weight}</Label>
          <SelectMenu
            value={String(weight)}
            onChange={(v) =>
              onUpdate(el.id, { fontStyle: composeFontStyle(v, italic) })
            }
            ariaLabel={t.weight}
            triggerClassName="h-9 px-2.5"
            options={WEIGHT_VALUES.map((v) => ({
              value: String(v),
              label: labels[v],
            }))}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ToggleBtn
          active={italic}
          onClick={() =>
            onUpdate(el.id, { fontStyle: composeFontStyle(weight, !italic) })
          }
        >
          <span className="italic">i</span>
        </ToggleBtn>
        <div className="ml-2 flex gap-1">
          {(["left", "center", "right"] as const).map((a) => (
            <ToggleBtn
              key={a}
              active={el.align === a}
              onClick={() => onUpdate(el.id, { align: a })}
            >
              {a === "left" ? "⬅" : a === "center" ? "⬌" : "➡"}
            </ToggleBtn>
          ))}
        </div>
      </div>
    </div>
  );
}

function RectProps({
  el,
  onUpdate,
}: {
  el: RectEl;
  onUpdate: (id: string, patch: Partial<AnyElement>) => void;
}) {
  const t = useDict().dashboard.qr;
  return (
    <div className="space-y-3">
      <div>
        <Label>{t.fill}</Label>
        <ColorInput
          value={el.fill ?? "#000000"}
          onChange={(c) => onUpdate(el.id, { fill: c })}
          allowNone
          isNone={el.fill === null}
          onNone={() => onUpdate(el.id, { fill: null })}
        />
      </div>
      <div>
        <Label>{t.stroke}</Label>
        <ColorInput
          value={el.stroke ?? "#000000"}
          onChange={(c) => onUpdate(el.id, { stroke: c })}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>{t.thickness}</Label>
          <NumberField
            value={el.strokeWidth ?? 0}
            min={0}
            onChange={(e) =>
              onUpdate(el.id, { strokeWidth: Number(e.target.value) })
            }
            className="h-9"
          />
        </div>
        <div>
          <Label>{t.cornerRadius}</Label>
          <NumberField
            value={el.cornerRadius ?? 0}
            min={0}
            onChange={(e) =>
              onUpdate(el.id, { cornerRadius: Number(e.target.value) })
            }
            className="h-9"
          />
        </div>
      </div>
    </div>
  );
}

function QrProps({
  el,
  onUpdate,
}: {
  el: QrEl;
  onUpdate: (id: string, patch: Partial<AnyElement>) => void;
}) {
  const t = useDict().dashboard.qr;
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">{t.qrLinkAuto}</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>{t.qrColor}</Label>
          <ColorInput value={el.fill} onChange={(c) => onUpdate(el.id, { fill: c })} />
        </div>
        <div>
          <Label>{t.qrBg}</Label>
          <ColorInput
            value={el.background}
            onChange={(c) => onUpdate(el.id, { background: c })}
          />
        </div>
      </div>
    </div>
  );
}

function EllipseProps({
  el,
  onUpdate,
}: {
  el: EllipseEl;
  onUpdate: (id: string, patch: Partial<AnyElement>) => void;
}) {
  const t = useDict().dashboard.qr;
  return (
    <div className="space-y-3">
      <div>
        <Label>{t.fill}</Label>
        <ColorInput
          value={el.fill ?? "#000000"}
          onChange={(c) => onUpdate(el.id, { fill: c })}
          allowNone
          isNone={el.fill === null}
          onNone={() => onUpdate(el.id, { fill: null })}
        />
      </div>
      <div>
        <Label>{t.stroke}</Label>
        <ColorInput
          value={el.stroke ?? "#111111"}
          onChange={(c) =>
            onUpdate(el.id, {
              stroke: c,
              strokeWidth: el.strokeWidth && el.strokeWidth > 0 ? el.strokeWidth : 3,
            })
          }
          allowNone
          isNone={!el.stroke || (el.strokeWidth ?? 0) === 0}
          onNone={() => onUpdate(el.id, { strokeWidth: 0 })}
        />
      </div>
      <div>
        <Label>{t.strokeThickness}</Label>
        <NumberField
          min={0}
          value={el.strokeWidth ?? 0}
          onChange={(e) =>
            onUpdate(el.id, { strokeWidth: Number(e.target.value) })
          }
          className="h-9"
        />
      </div>
    </div>
  );
}

function TableProps({
  el,
  onUpdate,
  scheduleRows,
}: {
  el: TableEl;
  onUpdate: (id: string, patch: Partial<AnyElement>) => void;
  scheduleRows: TableRow[];
}) {
  const t = useDict().dashboard.qr;
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  const setRows = (rows: TableRow[]) => onUpdate(el.id, { rows });
  const updateRow = (i: number, patch: Partial<TableRow>) =>
    setRows(el.rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () =>
    setRows([...el.rows, { label: t.dayRow, value: "09:00 - 18:00" }]);
  const removeRow = (i: number) =>
    setRows(el.rows.filter((_, idx) => idx !== i));
  const reorderRows = (from: number, to: number) => {
    if (from === to) return;
    const next = [...el.rows];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setRows(next);
  };

  return (
    <div className="space-y-3">
      {/* Load from settings */}
      <button
        type="button"
        onClick={() =>
          setRows(scheduleRows.length ? scheduleRows.map((r) => ({ ...r })) : el.rows)
        }
        disabled={scheduleRows.length === 0}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-xs font-medium text-gold transition-colors hover:bg-gold/20 disabled:opacity-40"
      >
        <RefreshCw className="size-3.5" /> {t.loadFromSettings}
      </button>

      {/* Rows */}
      <div>
        <Label>{t.tableRows}</Label>
        <p className="mb-2 text-[10px] text-muted-2">
          {t.tableRowsHint1} <GripVertical className="inline size-3" />{" "}
          {t.tableRowsHint2}
        </p>
        <div className="space-y-1.5">
          {el.rows.map((row, i) => (
            <div
              key={i}
              draggable
              onDragStart={() => setDragFrom(i)}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(i);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragFrom !== null) reorderRows(dragFrom, i);
                setDragFrom(null);
                setOver(null);
              }}
              onDragEnd={() => {
                setDragFrom(null);
                setOver(null);
              }}
              className={cn(
                "flex items-start gap-1 rounded-md border border-border bg-surface-2/40 p-1.5",
                dragFrom === i
                  ? "opacity-50"
                  : over === i
                  ? "ring-1 ring-gold-soft"
                  : "",
              )}
            >
              <span className="mt-1.5 cursor-grab text-muted-2 active:cursor-grabbing">
                <GripVertical className="size-3.5" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-1">
                  <input
                    value={row.label}
                    onChange={(e) => updateRow(i, { label: e.target.value })}
                    placeholder={t.dayPlaceholder}
                    className="h-8 min-w-0 flex-1 rounded-md border border-border bg-surface px-2 text-xs font-semibold text-foreground focus-visible:border-gold focus-visible:outline-none"
                  />
                  <button
                    type="button"
                    title={t.rowLineTitle}
                    onClick={() =>
                      updateRow(i, { lineBelow: row.lineBelow === false })
                    }
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-md border text-xs",
                      row.lineBelow === false
                        ? "border-border text-muted-2"
                        : "border-gold bg-gold/15 text-gold",
                    )}
                  >
                    {row.lineBelow === false ? "—" : "✓"}
                  </button>
                  <button
                    type="button"
                    title={t.deleteRow}
                    onClick={() => removeRow(i)}
                    className="grid size-8 shrink-0 place-items-center rounded-md text-muted hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <textarea
                  value={row.value}
                  onChange={(e) => updateRow(i, { value: e.target.value })}
                  placeholder={t.hoursPlaceholder}
                  rows={row.value.includes("\n") ? 2 : 1}
                  className="w-full resize-none rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-foreground focus-visible:border-gold focus-visible:outline-none"
                />
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addRow}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-gold hover:underline"
        >
          <Plus className="size-3.5" /> {t.addRow}
        </button>
      </div>

      {/* Border toggles */}
      <div className="flex flex-wrap gap-2">
        <ToggleBtn
          active={el.showOuter}
          onClick={() => onUpdate(el.id, { showOuter: !el.showOuter })}
        >
          {t.outerBorder}
        </ToggleBtn>
        <ToggleBtn
          active={el.showColLine}
          onClick={() => onUpdate(el.id, { showColLine: !el.showColLine })}
        >
          {t.colLine}
        </ToggleBtn>
      </div>

      {/* Colors */}
      <div>
        <Label>{t.dayColor}</Label>
        <ColorInput
          value={el.labelColor}
          onChange={(c) => onUpdate(el.id, { labelColor: c })}
        />
      </div>
      <div>
        <Label>{t.hoursColor}</Label>
        <ColorInput
          value={el.valueColor}
          onChange={(c) => onUpdate(el.id, { valueColor: c })}
        />
      </div>
      <div>
        <Label>{t.lineColor}</Label>
        <ColorInput
          value={el.borderColor}
          onChange={(c) => onUpdate(el.id, { borderColor: c })}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>{t.textSize}</Label>
          <NumberField
            min={8}
            value={el.fontSize}
            onChange={(e) =>
              onUpdate(el.id, { fontSize: Number(e.target.value) })
            }
            className="h-9"
          />
        </div>
        <div>
          <Label>{t.rowHeight}</Label>
          <NumberField
            min={14}
            value={el.rowHeight}
            onChange={(e) =>
              onUpdate(el.id, { rowHeight: Number(e.target.value) })
            }
            className="h-9"
          />
        </div>
      </div>
      <div>
        <Label>{t.font}</Label>
        <SelectMenu
          value={el.fontFamily}
          onChange={(v) => onUpdate(el.id, { fontFamily: v })}
          ariaLabel={t.font}
          triggerClassName="h-9 px-2.5"
          options={FONT_FAMILIES.map((f) => ({ value: f, label: f }))}
        />
      </div>
    </div>
  );
}

function LineProps({
  el,
  onUpdate,
}: {
  el: LineEl;
  onUpdate: (id: string, patch: Partial<AnyElement>) => void;
}) {
  const t = useDict().dashboard.qr;
  return (
    <div className="space-y-3">
      <div>
        <Label>{t.lineColorLabel}</Label>
        <ColorInput
          value={el.stroke}
          onChange={(c) => onUpdate(el.id, { stroke: c })}
        />
      </div>
      <div>
        <Label>{t.thickness}</Label>
        <NumberField
          min={1}
          value={el.strokeWidth}
          onChange={(e) =>
            onUpdate(el.id, { strokeWidth: Number(e.target.value) })
          }
          className="h-9"
        />
      </div>
    </div>
  );
}

function IconProps({
  el,
  onUpdate,
}: {
  el: IconEl;
  onUpdate: (id: string, patch: Partial<AnyElement>) => void;
}) {
  const t = useDict().dashboard.qr;
  return (
    <div className="space-y-3">
      <div>
        <Label>{t.iconColor}</Label>
        <ColorInput
          value={el.color}
          onChange={(c) => onUpdate(el.id, { color: c })}
        />
      </div>
      <div>
        <Label>{t.circleBg}</Label>
        <ColorInput
          value={el.bg === "none" ? "#111111" : el.bg}
          onChange={(c) => onUpdate(el.id, { bg: c })}
          allowNone
          isNone={el.bg === "none"}
          onNone={() => onUpdate(el.id, { bg: "none" })}
        />
      </div>
      <div>
        <Label>{t.borderColorLabel}</Label>
        <ColorInput
          value={
            !el.borderColor || el.borderColor === "none"
              ? "#C89B3C"
              : el.borderColor
          }
          onChange={(c) =>
            onUpdate(el.id, {
              borderColor: c,
              borderWidth:
                el.borderWidth && el.borderWidth > 0 ? el.borderWidth : 1.5,
            })
          }
          allowNone
          isNone={!el.borderColor || el.borderColor === "none"}
          onNone={() => onUpdate(el.id, { borderColor: "none" })}
        />
      </div>
      <div>
        <Label>{t.strokeThickness}</Label>
        <NumberField
          min={0}
          max={6}
          step={0.5}
          value={el.borderWidth ?? 0}
          onChange={(e) =>
            onUpdate(el.id, { borderWidth: Number(e.target.value) })
          }
          className="h-9"
        />
      </div>
      {/* Swap icon */}
      <div>
        <Label>{t.changeIcon}</Label>
        <div className="grid grid-cols-5 gap-1.5">
          {ICON_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => onUpdate(el.id, { iconKey: key })}
              title={key}
              className={cn(
                "grid aspect-square place-items-center rounded-lg border p-1 transition-colors",
                el.iconKey === key
                  ? "border-gold bg-gold/15"
                  : "border-border bg-surface hover:border-gold-soft",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  "data:image/svg+xml," +
                  encodeURIComponent(buildIconSvg(key, "#a3a3a3", "none", 40))
                }
                alt={key}
                className="size-5"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── small UI helpers ── */
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-foreground">
      {children}
    </kbd>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-[11px] font-medium text-muted">
      {children}
    </label>
  );
}

function ColorInput({
  value,
  onChange,
  allowNone,
  isNone,
  onNone,
}: {
  value: string;
  onChange: (c: string) => void;
  allowNone?: boolean;
  isNone?: boolean;
  onNone?: () => void;
}) {
  const t = useDict().dashboard.qr;
  const [edSupported, setEdSupported] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    setEdSupported(typeof window !== "undefined" && "EyeDropper" in window);
  }, []);

  const pickColor = async () => {
    const ED = (
      window as unknown as {
        EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> };
      }
    ).EyeDropper;
    if (!ED) return;
    try {
      const res = await new ED().open();
      onChange(res.sRGBHex);
      try {
        await navigator.clipboard.writeText(res.sRGBHex);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        /* clipboard blocked — color still applied */
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-10 cursor-pointer rounded border border-border bg-surface"
      />
      <input
        type="text"
        value={isNone ? "—" : value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-surface px-2 text-xs text-foreground focus-visible:border-gold focus-visible:outline-none"
      />
      {edSupported && (
        <button
          type="button"
          onClick={pickColor}
          title={t.eyedropper}
          aria-label={t.eyedropperAria}
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition-colors",
            copied
              ? "border-gold bg-gold/15 text-gold"
              : "border-border text-muted hover:border-gold hover:text-gold",
          )}
        >
          {copied ? <Check className="size-4" /> : <Pipette className="size-4" />}
        </button>
      )}
      {allowNone && (
        <button
          onClick={() => (isNone ? onChange(value) : onNone?.())}
          title={isNone ? t.enableColor : t.noColor}
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-xs transition-colors",
            isNone
              ? "border-gold bg-gold/15 text-gold"
              : "border-border text-muted hover:text-foreground",
          )}
        >
          ∅
        </button>
      )}
    </div>
  );
}

function IconBtn({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

function ToggleBtn({
  active,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      {...props}
      className={cn(
        "grid h-9 min-w-9 place-items-center rounded-lg border px-2 text-sm font-bold transition-colors",
        active
          ? "border-gold bg-gold/15 text-gold"
          : "border-border text-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function labelForType(type: string, t: QrT) {
  return type === "text"
    ? t.typeText
    : type === "rect"
    ? t.typeShape
    : type === "qr"
    ? "QR Code"
    : type === "image"
    ? t.typeImage
    : type === "icon"
    ? t.typeIcon
    : type === "ellipse"
    ? t.typeCircle
    : type === "line"
    ? t.typeLine
    : type === "table"
    ? t.typeTable
    : t.typeElement;
}
