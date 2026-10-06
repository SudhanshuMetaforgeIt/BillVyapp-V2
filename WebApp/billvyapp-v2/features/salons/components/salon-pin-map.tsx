'use client';

import { useEffect, useRef } from 'react';
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';

type Coordinates = { latitude: number; longitude: number };

function pinIcon(L: typeof import('leaflet')) {
  return L.divIcon({
    className: '',
    html: '<span aria-hidden="true" style="display:block;width:24px;height:24px;border:4px solid white;background:#c49f63;border-radius:50%;box-shadow:0 0 0 2px #493b2b,0 4px 12px #0006"></span>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export function SalonPinMap({ position, onChange }: {
  position: Coordinates | null;
  onChange: (position: Coordinates) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<LeafletMarker | null>(null);
  const leaflet = useRef<typeof import('leaflet') | null>(null);
  const onChangeRef = useRef(onChange);
  const positionRef = useRef(position);

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { positionRef.current = position; }, [position]);

  useEffect(() => {
    let cancelled = false;
    void import('leaflet').then((L) => {
      if (cancelled || !container.current) return;
      leaflet.current = L;
      const initial = positionRef.current;
      const center: [number, number] = initial
        ? [initial.latitude, initial.longitude]
        : [22.5937, 78.9629];
      const instance = L.map(container.current, { scrollWheelZoom: false }).setView(center, initial ? 18 : 5);
      map.current = instance;
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(instance);
      const placePin = (latitude: number, longitude: number) => {
        if (marker.current) marker.current.setLatLng([latitude, longitude]);
        else {
          marker.current = L.marker([latitude, longitude], {
            draggable: true,
            autoPan: true,
            icon: pinIcon(L),
            title: 'Shop entrance; drag to adjust',
          }).addTo(instance);
          marker.current.on('dragend', () => {
            const point = marker.current?.getLatLng();
            if (point) onChangeRef.current({ latitude: point.lat, longitude: point.lng });
          });
        }
      };
      if (initial) placePin(initial.latitude, initial.longitude);
      instance.on('click', (event) => {
        placePin(event.latlng.lat, event.latlng.lng);
        onChangeRef.current({ latitude: event.latlng.lat, longitude: event.latlng.lng });
      });
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      marker.current = null;
      leaflet.current = null;
    };
    // The parent keys this component by salon, so map setup runs once per salon.
  }, []);

  useEffect(() => {
    if (!position || !map.current || !leaflet.current) return;
    const point: [number, number] = [position.latitude, position.longitude];
    if (marker.current) {
      marker.current.setLatLng(point);
      map.current.panTo(point);
    } else {
      marker.current = leaflet.current.marker(point, {
        draggable: true,
        autoPan: true,
        icon: pinIcon(leaflet.current),
        title: 'Shop entrance; drag to adjust',
      }).addTo(map.current);
      marker.current.on('dragend', () => {
        const moved = marker.current?.getLatLng();
        if (moved) onChangeRef.current({ latitude: moved.lat, longitude: moved.lng });
      });
      map.current.setView(point, 18);
    }
  }, [position]);

  return <div ref={container} role="application" aria-label="Shop entrance map; click to place the pin or drag it to the entrance" className="relative isolate z-0 h-[420px] w-full overflow-hidden rounded-xl border border-border" />;
}
