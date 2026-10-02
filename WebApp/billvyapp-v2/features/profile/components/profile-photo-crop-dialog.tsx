'use client';

import { useEffect, useId, useRef, useState, type PointerEvent } from 'react';
import { LoaderCircle, RotateCw, Undo2 } from 'lucide-react';
import { Modal } from '@/components/data/modal';
import { Button } from '@/components/ui/button';
import { cropGeometry, DEFAULT_CROP, drawProfileCrop, exportProfileCrop, type CropAdjustment } from '../lib/profile-photo-crop';

type Props = { file: File; busy: boolean; onClose: () => void; onSave: (file: File) => Promise<void> };

export function ProfilePhotoCropDialog({ file, busy, onClose, onSave }: Props) {
  const [image, setImage] = useState<ImageBitmap | null>(null);
  const [crop, setCrop] = useState<CropAdjustment>(DEFAULT_CROP);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const controls = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; crop: CropAdjustment } | null>(null);
  const id = useId();
  const locked = busy || preparing;

  useEffect(() => {
    let cancelled = false;
    let decoded: ImageBitmap | undefined;
    void createImageBitmap(file).then((bitmap) => {
      decoded = bitmap;
      if (cancelled) bitmap.close();
      else setImage(bitmap);
    }).catch(() => { if (!cancelled) setError('This image could not be opened. Please choose another photo.'); });
    return () => { cancelled = true; decoded?.close(); };
  }, [file]);

  useEffect(() => {
    if (canvas.current && image) drawProfileCrop(canvas.current, image, crop);
  }, [image, crop]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const root = controls.current?.closest('[role="dialog"]');
    const focusable = () => Array.from(root?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)') ?? []);
    focusable()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) { event.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !root?.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !root?.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', trap);
    return () => { document.removeEventListener('keydown', trap); previous?.focus(); };
  }, []);

  function move(event: PointerEvent<HTMLCanvasElement>) {
    if (!drag.current || !image || locked) return;
    const start = drag.current;
    const g = cropGeometry(image.width, image.height, start.crop);
    const width = event.currentTarget.getBoundingClientRect().width;
    const travelX = (g.width - g.side) / g.side * width / 2;
    const travelY = (g.height - g.side) / g.side * width / 2;
    const clamp = (value: number) => Math.max(-1, Math.min(1, value));
    setCrop({ ...start.crop, x: travelX ? clamp(start.crop.x - (event.clientX - start.x) / travelX) : 0, y: travelY ? clamp(start.crop.y - (event.clientY - start.y) / travelY) : 0 });
  }

  async function save() {
    if (!image || locked) return;
    setPreparing(true);
    setError(null);
    try {
      const cropped = await exportProfileCrop(image, crop, file.name);
      await onSave(cropped);
    } catch {
      setError('Your photo could not be saved. Your adjustments are kept; please try again.');
    } finally { setPreparing(false); }
  }

  return (
    <Modal open onClose={onClose} busy={locked} title="Make it yours" description="Frame your photo exactly how you like it." className="max-w-md motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-300">
      <div ref={controls} className="space-y-5">
        <div className="relative mx-auto aspect-square w-full max-w-72 overflow-hidden rounded-2xl bg-charcoal shadow-inner">
          <canvas ref={canvas} width={512} height={512} aria-label="Crop preview. Drag to reposition, or use the sliders below." className="size-full touch-none cursor-grab active:cursor-grabbing" onPointerDown={(event) => {
            if (locked || !image) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = { x: event.clientX, y: event.clientY, crop };
          }} onPointerMove={move} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }} />
          <div aria-hidden className="pointer-events-none absolute inset-0 rounded-full border border-white/80 shadow-[0_0_0_80px_rgba(0,0,0,0.5)]" />
          {(!image && !error) || locked ? <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-charcoal/60 text-white backdrop-blur-sm" role="status"><LoaderCircle className="size-7 text-champagne motion-safe:animate-spin" /><span className="text-sm">{busy ? 'Saving your photo…' : preparing ? 'Preparing your crop…' : 'Opening your photo…'}</span></div> : null}
        </div>
        <p className="text-center text-xs text-text-secondary">Drag to reposition · the circle is your avatar preview</p>
        <fieldset disabled={locked || !image} className="space-y-3">
          <legend className="sr-only">Crop adjustments</legend>
          {([{ key: 'zoom', label: 'Zoom', min: 1, max: 3, step: 0.01 }, { key: 'x', label: 'Horizontal position', min: -1, max: 1, step: 0.01 }, { key: 'y', label: 'Vertical position', min: -1, max: 1, step: 0.01 }] as const).map(({ key, label, min, max, step }) => (
            <div key={key} className="space-y-1.5">
              <label htmlFor={`${id}-${key}`} className="flex justify-between text-xs font-medium text-text-secondary">{label}{key === 'zoom' ? <span>{crop.zoom.toFixed(1)}×</span> : null}</label>
              <input id={`${id}-${key}`} type="range" min={min} max={max} step={step} value={crop[key]} onChange={(event) => setCrop((value) => ({ ...value, [key]: Number(event.target.value) }))} className="block w-full cursor-pointer accent-champagne disabled:opacity-40" />
            </div>
          ))}
          <div className="flex justify-between">
            <Button type="button" variant="ghost" size="sm" onClick={() => setCrop((value) => ({ ...value, rotation: (value.rotation + 90) % 360, x: 0, y: 0 }))}><RotateCw className="size-3.5" />Rotate 90°</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setCrop(DEFAULT_CROP)}><Undo2 className="size-3.5" />Reset</Button>
          </div>
        </fieldset>
        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" disabled={locked} onClick={onClose}>Cancel</Button>
          <Button type="button" disabled={locked || !image} onClick={() => void save()}>{locked ? <LoaderCircle className="size-4 motion-safe:animate-spin" /> : null}{locked ? 'Saving…' : 'Save photo'}</Button>
        </div>
      </div>
    </Modal>
  );
}
