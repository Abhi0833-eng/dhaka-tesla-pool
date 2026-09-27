'use client';

import React from 'react';
import { MapPin, Navigation, Car } from 'lucide-react';

interface ZonePos {
  name: string;
  x: number;
  y: number;
}

const ZONES_MAP: Record<string, ZonePos> = {
  Uttara: { name: 'Uttara', x: 45, y: 15 },
  Mirpur: { name: 'Mirpur', x: 25, y: 35 },
  Banani: { name: 'Banani', x: 50, y: 40 },
  'Gulshan 2': { name: 'Gulshan 2', x: 65, y: 38 },
  'Gulshan 1': { name: 'Gulshan 1', x: 65, y: 52 },
  Mohakhali: { name: 'Mohakhali', x: 48, y: 58 },
  Farmgate: { name: 'Farmgate', x: 38, y: 70 },
  Dhanmondi: { name: 'Dhanmondi', x: 25, y: 80 },
  Bashundhara: { name: 'Bashundhara', x: 80, y: 30 },
};

interface DhakaMapProps {
  pickupZone?: string;
  destinationZone?: string;
  activePool?: any;
  currentZone?: string;
}

export default function DhakaMap({
  pickupZone = 'Banani',
  destinationZone = 'Mohakhali',
  activePool,
  currentZone = 'Banani',
}: DhakaMapProps) {
  const pickup = ZONES_MAP[pickupZone] || ZONES_MAP['Banani'];
  const dest = ZONES_MAP[destinationZone] || ZONES_MAP['Mohakhali'];
  const driverPos = ZONES_MAP[currentZone] || ZONES_MAP['Banani'];

  return (
    <div className="glass-panel rounded-2xl p-5 border border-white/10 relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Navigation className="w-5 h-5 text-tesla-cyan" />
          <h3 className="font-bold text-white text-sm uppercase tracking-wider">
            Dhaka Zone Network Visualizer
          </h3>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Pickup
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-tesla-red inline-block"></span> Destination
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block animate-ping"></span> Tesla Bullet
          </span>
        </div>
      </div>

      {/* SVG Canvas Map */}
      <div className="relative w-full h-[280px] bg-gradient-to-b from-[#0b0f19] to-[#121824] rounded-xl border border-white/5 overflow-hidden flex items-center justify-center">
        {/* Subtle Map Grid lines */}
        <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none">
          <defs>
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Active Route Path Line */}
          <line
            x1={`${pickup.x}%`}
            y1={`${pickup.y}%`}
            x2={`${dest.x}%`}
            y2={`${dest.y}%`}
            stroke="#00f2fe"
            strokeWidth="3"
            strokeDasharray="6 4"
            className="animate-pulse"
          />
        </svg>

        {/* Render Zones as Nodes */}
        {Object.entries(ZONES_MAP).map(([key, zone]) => {
          const isPickup = key === pickupZone;
          const isDest = key === destinationZone;
          const isDriver = key === currentZone;

          return (
            <div
              key={key}
              style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer transition-all duration-300"
            >
              {/* Node Marker */}
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                  isPickup
                    ? 'bg-emerald-500 ring-4 ring-emerald-500/30 scale-125 glow-emerald'
                    : isDest
                    ? 'bg-tesla-red ring-4 ring-tesla-red/30 scale-125 glow-red'
                    : 'bg-gray-600/60 border border-white/20 hover:bg-gray-400'
                }`}
              >
                {isPickup && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                {isDest && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
              </div>

              {/* Tesla Car Icon if Driver at Zone */}
              {isDriver && (
                <div className="absolute -top-7 bg-cyan-500 text-black p-1 rounded-full shadow-lg shadow-cyan-500/50 animate-bounce">
                  <Car className="w-3.5 h-3.5" />
                </div>
              )}

              {/* Zone Label */}
              <span
                className={`text-[10px] font-semibold mt-1 px-1.5 py-0.5 rounded backdrop-blur-md transition-all ${
                  isPickup
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : isDest
                    ? 'bg-tesla-red/20 text-tesla-red border border-tesla-red/40'
                    : 'bg-black/60 text-gray-400 group-hover:text-white'
                }`}
              >
                {zone.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Active Pool Info Bar */}
      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-300">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-tesla-red" />
          <span>Active Trip: <strong className="text-white">{pickupZone}</strong> → <strong className="text-white">{destinationZone}</strong></span>
        </div>
        <div>
          {activePool ? (
            <span className="text-tesla-cyan font-mono bg-tesla-cyan/10 px-2 py-0.5 rounded border border-tesla-cyan/20">
              Pool #{activePool.id.substring(0, 8)} ({activePool.occupiedSeats}/{activePool.totalSeats} seats booked)
            </span>
          ) : (
            <span className="text-gray-500 font-mono">No active pool</span>
          )}
        </div>
      </div>
    </div>
  );
}
