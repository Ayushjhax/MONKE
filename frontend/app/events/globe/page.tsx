'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

type CryptoEvent = {
  id: string;
  event_name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  start_date: string;
  end_date?: string;
  expected_attendees?: number;
  blockchain?: string;
  official_website?: string;
  deal_count?: number | string;
};

const INITIAL_CENTER: [number, number] = [0, 20];
const INITIAL_ZOOM = 1.2;

export default function EventsGlobePage() {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [center, setCenter] = useState<[number, number]>(INITIAL_CENTER);
  const [zoom, setZoom] = useState<number>(INITIAL_ZOOM);

  useEffect(() => {
    const accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!accessToken) {
      // Fail softly if token is missing to avoid runtime confusion
      // eslint-disable-next-line no-console
      console.error('Missing NEXT_PUBLIC_MAPBOX_TOKEN. See frontend/MAPBOX_SETUP.md');
      return;
    }

    mapboxgl.accessToken = accessToken;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current as HTMLDivElement,
      style: 'mapbox://styles/mapbox/dark-v11',
      projection: 'globe',
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
      pitch: 25,
      bearing: 0,
      antialias: true,
    });
    mapRef.current = map;

    map.on('style.load', () => {
      // Add atmospheric fog for globe
      map.setFog({
        range: [0.8, 8],
        color: 'rgb(186, 210, 235)',
        'high-color': 'rgb(36, 92, 223)',
        'space-color': 'rgb(11, 11, 25)',
        'horizon-blend': 0.02,
      } as any);
    });

    map.on('move', () => {
      const c = map.getCenter();
      setCenter([c.lng, c.lat]);
      setZoom(map.getZoom());
    });

    // Load events and add markers
    const abortController = new AbortController();
    fetch('/api/events?filter=all', { signal: abortController.signal })
      .then(async (res) => res.json())
      .then((payload) => {
        const events: CryptoEvent[] = payload?.events || [];
        events
          .filter((e) =>
            typeof e.latitude === 'number' &&
            typeof e.longitude === 'number' &&
            !Number.isNaN(e.latitude) &&
            !Number.isNaN(e.longitude)
          )
          .forEach((event) => {
            const popupHtml = `
              <div style="min-width:220px;color:#000">
                <div style="font-weight:700;margin-bottom:4px">${event.event_name}</div>
                <div style="opacity:.8;margin-bottom:6px">${event.city}, ${event.country}</div>
                <div style="font-size:12px;opacity:.8;margin-bottom:6px">${new Date(event.start_date).toLocaleDateString()}${event.end_date ? ' - ' + new Date(event.end_date).toLocaleDateString() : ''}</div>
                <div style="font-size:12px;opacity:.8;margin-bottom:6px">${event.blockchain || 'Multi-chain'} · ${event.expected_attendees ? event.expected_attendees.toLocaleString() + ' expected' : 'TBD'}</div>
                ${event.official_website ? `<a href="${event.official_website}" target="_blank" rel="noreferrer" style="color:#1d4ed8;font-size:12px">Website</a>` : ''}
              </div>
            `;

            const marker = new mapboxgl.Marker({ color: '#22d3ee' })
              .setLngLat([event.longitude, event.latitude])
              .setPopup(new mapboxgl.Popup({ offset: 12 }).setHTML(popupHtml))
              .addTo(map);

            // Fly on marker click for nice UX
            marker.getElement().addEventListener('click', () => {
              map.flyTo({ center: [event.longitude, event.latitude], zoom: Math.max(map.getZoom(), 3.5), speed: 0.8 });
            });
          });

        // Add manual, curated events (ensures they appear even if DB lacks coords)
        const manualEvents: Array<Omit<CryptoEvent, 'id' | 'start_date'>> = [
          { event_name: 'Solana Breakpoint 2025', city: 'Abu Dhabi', country: 'UAE', latitude: 24.4539, longitude: 54.3773, blockchain: 'Solana' },
          { event_name: 'TOKEN2049 Dubai', city: 'Dubai', country: 'UAE', latitude: 25.2048, longitude: 55.2708, blockchain: 'Multi-chain' },
          { event_name: 'TOKEN2049 Singapore', city: 'Singapore', country: 'Singapore', latitude: 1.3521, longitude: 103.8198, blockchain: 'Multi-chain' },
          { event_name: 'Devcon', city: 'Bangkok', country: 'Thailand', latitude: 13.7563, longitude: 100.5018, blockchain: 'Ethereum' },
          { event_name: 'Solana APEX', city: 'Mumbai', country: 'India', latitude: 19.076, longitude: 72.8777, blockchain: 'Solana' },
          { event_name: 'Solana Accelerate', city: 'New York City', country: 'USA', latitude: 40.7128, longitude: -74.006, blockchain: 'Solana' },
          { event_name: 'Solana Accelerate', city: 'Shanghai', country: 'China', latitude: 31.2304, longitude: 121.4737, blockchain: 'Solana' },
          { event_name: 'ETHDenver', city: 'Denver', country: 'USA', latitude: 39.7392, longitude: -104.9903, blockchain: 'Ethereum' },
          { event_name: 'NFT LA 2026', city: 'Los Angeles', country: 'USA', latitude: 34.0522, longitude: -118.2437, blockchain: 'NFT' },
          { event_name: 'APEX Stablecoin', city: 'Abuja', country: 'Nigeria', latitude: 9.0765, longitude: 7.3986, blockchain: 'Stablecoins' },
        ];

        manualEvents.forEach((event) => {
          const popupHtml = `
            <div style="min-width:220px;color:#000">
              <div style="font-weight:700;margin-bottom:4px">${event.event_name}</div>
              <div style="opacity:.8;margin-bottom:6px">${event.city}, ${event.country}</div>
              <div style="font-size:12px;opacity:.8;margin-bottom:6px">${event.blockchain || 'Multi-chain'}</div>
            </div>
          `;

          const marker = new mapboxgl.Marker({ color: '#a78bfa' }) // violet for manual set
            .setLngLat([event.longitude, event.latitude])
            .setPopup(new mapboxgl.Popup({ offset: 12 }).setHTML(popupHtml))
            .addTo(map);

          marker.getElement().addEventListener('click', () => {
            map.flyTo({ center: [event.longitude, event.latitude], zoom: Math.max(map.getZoom(), 3.5), speed: 0.8 });
          });
        });
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') {
          // eslint-disable-next-line no-console
          console.error('Failed to load events for globe', err);
        }
      });

    return () => {
      abortController.abort();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const handleReset = () => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({ center: INITIAL_CENTER, zoom: INITIAL_ZOOM, speed: 0.8 });
  };

  return (
    <div className="relative" style={{ height: '100vh', width: '100%' }}>
      <div
        className="absolute left-3 top-3 z-50 rounded-md px-3 py-2 text-xs font-mono text-white"
        style={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)' }}
      >
        Longitude: {center[0].toFixed(4)} | Latitude: {center[1].toFixed(4)} | Zoom: {zoom.toFixed(2)}
      </div>
      <button
        onClick={handleReset}
        className="absolute left-3 top-14 z-50 rounded-lg px-3 py-1 text-sm text-white hover:opacity-90"
        style={{ backgroundColor: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.15)' }}
      >
        Reset
      </button>
      <Link
        href="/"
        className="absolute right-3 top-3 z-50 rounded-lg px-3 py-1 text-sm text-white hover:opacity-90"
        style={{ backgroundColor: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.15)' }}
      >
        Home
      </Link>
      <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}


