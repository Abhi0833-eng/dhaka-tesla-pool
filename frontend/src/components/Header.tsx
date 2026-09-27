'use client';

import React from 'react';
import { Car, UserCheck, ShieldCheck, Zap, RefreshCw } from 'lucide-react';

interface HeaderProps {
  currentUser: any;
  onSelectStoryCast: (email: string) => void;
  onOpenConcurrencySim: () => void;
  onRefresh: () => void;
  loading: boolean;
}

export const STORY_CAST = [
  { name: 'Nusrat', role: 'PASSENGER', email: 'nusrat@dhaka.com', route: 'Banani → Mohakhali', avatar: '👩‍💼' },
  { name: 'Rafiq', role: 'PASSENGER', email: 'rafiq@dhaka.com', route: 'Banani → Gulshan 1', avatar: '👨‍💻' },
  { name: 'Shirin', role: 'PASSENGER', email: 'shirin@dhaka.com', route: 'Banani → Mohakhali', avatar: '👩‍🎨' },
  { name: 'Jashim', role: 'DRIVER', email: 'jashim@dhaka.com', route: 'Bullet (3 Seats)', avatar: '🚕⚡' },
];

export default function Header({
  currentUser,
  onSelectStoryCast,
  onOpenConcurrencySim,
  onRefresh,
  loading,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-white/10 px-4 lg:px-8 py-3.5 mb-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-tesla-red via-red-500 to-amber-500 flex items-center justify-center glow-red">
            <Car className="w-6 h-6 text-white animate-pulse-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                Dhaka<span className="text-tesla-red">Tesla</span>Pool
              </h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-tesla-red/20 text-tesla-red border border-tesla-red/30">
                MVP v1.0.0
              </span>
            </div>
            <p className="text-xs text-gray-400 font-medium">
              Share a seat. Split the fare. Survive Dhaka traffic.
            </p>
          </div>
        </div>

        {/* Story Cast Switcher */}
        <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/10 overflow-x-auto max-w-full">
          <span className="text-xs font-semibold text-gray-400 px-2 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-tesla-cyan" /> Cast:
          </span>
          {STORY_CAST.map((cast) => {
            const isActive = currentUser?.email === cast.email;
            return (
              <button
                key={cast.email}
                onClick={() => onSelectStoryCast(cast.email)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-tesla-red to-red-600 text-white shadow-lg shadow-tesla-red/30 scale-105'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/5'
                }`}
              >
                <span>{cast.avatar}</span>
                <span>{cast.name}</span>
                <span className="text-[10px] opacity-75">({cast.role === 'DRIVER' ? 'Driver' : 'Rider'})</span>
              </button>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenConcurrencySim}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white flex items-center gap-1.5 glow-cyan transition-all shadow-md active:scale-95"
          >
            <Zap className="w-4 h-4" />
            <span>Rush-Hour Race Sim</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all active:scale-95"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-tesla-cyan' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
}
