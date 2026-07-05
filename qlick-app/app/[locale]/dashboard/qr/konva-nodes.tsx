"use client";

import { useEffect, useState } from "react";
import { Image as KonvaImage } from "react-konva";
import QRCode from "qrcode";
import type Konva from "konva";
import {
  buildIconSvg,
  buildTableSvg,
  tableHeight,
  type ImageEl,
  type QrEl,
  type IconEl,
  type TableEl,
} from "@/lib/qr-template";

type DragEvt = Konva.KonvaEventObject<DragEvent>;
type ClickEvt = Konva.KonvaEventObject<MouseEvent | TouchEvent>;

type SharedHandlers = {
  onSelect: (additive: boolean) => void;
  onChange: (attrs: { x: number; y: number; rotation: number; width?: number; height?: number }) => void;
  onDragStart: (e: DragEvt) => void;
  onDragMove: (e: DragEvt) => void;
  onDragEnd: (e: DragEvt) => void;
  registerRef: (id: string, node: Konva.Node | null) => void;
};

function clickAdditive(e: ClickEvt): boolean {
  const ev = e.evt as MouseEvent;
  return !!(ev.shiftKey || ev.metaKey || ev.ctrlKey);
}

function useImageFromSrc(src: string | null) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) {
      setImg(null);
      return;
    }
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.src = src;
    image.onload = () => setImg(image);
    return () => {
      image.onload = null;
    };
  }, [src]);
  return img;
}

export function EditableImage({
  el,
  isDraggable,
  onSelect,
  onChange,
  onDragStart,
  onDragMove,
  onDragEnd,
  registerRef,
}: {
  el: ImageEl;
  isDraggable: boolean;
} & SharedHandlers) {
  const img = useImageFromSrc(el.src);
  if (!img) return null;
  return (
    <KonvaImage
      id={el.id}
      ref={(n) => registerRef(el.id, n)}
      image={img}
      x={el.x}
      y={el.y}
      width={el.width}
      height={el.height}
      rotation={el.rotation ?? 0}
      opacity={el.opacity ?? 1}
      draggable={isDraggable}
      onClick={(e) => onSelect(clickAdditive(e))}
      onTap={(e) => onSelect(clickAdditive(e))}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onTransformEnd={(e) => {
        const node = e.target;
        const sx = node.scaleX();
        const sy = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        onChange({
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          width: Math.max(20, el.width * sx),
          height: Math.max(20, el.height * sy),
        });
      }}
    />
  );
}

export function EditableQr({
  el,
  isDraggable,
  onSelect,
  onChange,
  onDragStart,
  onDragMove,
  onDragEnd,
  registerRef,
}: {
  el: QrEl;
  isDraggable: boolean;
} & SharedHandlers) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(el.data || " ", {
      margin: 1,
      width: 600,
      errorCorrectionLevel: "H",
      color: { dark: el.fill, light: el.background },
    })
      .then((url) => active && setDataUrl(url))
      .catch(() => active && setDataUrl(null));
    return () => {
      active = false;
    };
  }, [el.data, el.fill, el.background]);

  const img = useImageFromSrc(dataUrl);
  if (!img) return null;

  return (
    <KonvaImage
      id={el.id}
      ref={(n) => registerRef(el.id, n)}
      image={img}
      x={el.x}
      y={el.y}
      width={el.size}
      height={el.size}
      rotation={el.rotation ?? 0}
      opacity={el.opacity ?? 1}
      draggable={isDraggable}
      onClick={(e) => onSelect(clickAdditive(e))}
      onTap={(e) => onSelect(clickAdditive(e))}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onTransformEnd={(e) => {
        const node = e.target;
        const s = Math.max(node.scaleX(), node.scaleY());
        node.scaleX(1);
        node.scaleY(1);
        onChange({
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          width: Math.max(40, el.size * s),
        });
      }}
    />
  );
}

export function EditableIcon({
  el,
  isDraggable,
  onSelect,
  onChange,
  onDragStart,
  onDragMove,
  onDragEnd,
  registerRef,
}: {
  el: IconEl;
  isDraggable: boolean;
} & SharedHandlers) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const svg = buildIconSvg(
      el.iconKey,
      el.color,
      el.bg,
      256,
      el.borderColor ?? "none",
      el.borderWidth ?? 0,
    );
    setDataUrl("data:image/svg+xml," + encodeURIComponent(svg));
  }, [el.iconKey, el.color, el.bg, el.borderColor, el.borderWidth]);

  const img = useImageFromSrc(dataUrl);
  if (!img) return null;

  return (
    <KonvaImage
      id={el.id}
      ref={(n) => registerRef(el.id, n)}
      image={img}
      x={el.x}
      y={el.y}
      width={el.size}
      height={el.size}
      rotation={el.rotation ?? 0}
      opacity={el.opacity ?? 1}
      draggable={isDraggable}
      onClick={(e) => onSelect(clickAdditive(e))}
      onTap={(e) => onSelect(clickAdditive(e))}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onTransformEnd={(e) => {
        const node = e.target;
        const s = Math.max(node.scaleX(), node.scaleY());
        node.scaleX(1);
        node.scaleY(1);
        onChange({
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          width: Math.max(24, el.size * s),
        });
      }}
    />
  );
}

export function EditableTable({
  el,
  isDraggable,
  onSelect,
  onChange,
  onDragStart,
  onDragMove,
  onDragEnd,
  registerRef,
}: {
  el: TableEl;
  isDraggable: boolean;
} & SharedHandlers) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const h = tableHeight(el);

  useEffect(() => {
    const svg = buildTableSvg(el);
    setDataUrl("data:image/svg+xml," + encodeURIComponent(svg));
  }, [el]);

  const img = useImageFromSrc(dataUrl);
  if (!img) return null;

  return (
    <KonvaImage
      id={el.id}
      ref={(n) => registerRef(el.id, n)}
      image={img}
      x={el.x}
      y={el.y}
      width={el.width}
      height={h}
      rotation={el.rotation ?? 0}
      opacity={el.opacity ?? 1}
      draggable={isDraggable}
      onClick={(e) => onSelect(clickAdditive(e))}
      onTap={(e) => onSelect(clickAdditive(e))}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onTransformEnd={(e) => {
        const node = e.target;
        const sx = node.scaleX();
        const sy = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        onChange({
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          width: Math.max(80, el.width * sx),
          height: Math.max(20, h * sy),
        });
      }}
    />
  );
}
