'use client';

import React, { useState, useEffect } from 'react';
import {
  Car,
  MapPin,
  Users,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Tag,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface PassengerViewProps {
  currentUser: any;
  zones: string[];
  activeRide: any;
  rideHistory: any[];
  onRequestRide: (data: {
    pickupZone: string;
    destinationZone: string;
    seatsRequested: number;
    isPooled: boolean;
  }) => Promise<void>;
  onCancelRide: (rideId: string) => Promise<void>;
  loading: boolean;
}

export default function PassengerView({
  currentUser,
  zones,
  activeRide,
  rideHistory,
  onRequestRide,
  onCancelRide,
  loading,
}: PassengerViewProps) {
  // Preset defaults according to Banani story cast defaults
  const isNusrat = currentUser?.email === 'nusrat@dhaka.com';
  const isRafiq = currentUser?.email === 'rafiq@dhaka.com';

  const [pickupZone, setPickupZone] = useState('Banani');
  const [destinationZone, setDestinationZone] = useState(
    isRafiq ? 'Gulshan 1' : 'Mohakhali'
  );
  const [seatsRequested, setSeatsRequested] = useState(1);
  const [isPooled, setIsPooled] = useState(true);
  const [fareEstimate, setFareEstimate] = useState<any>(null);

  // Update default destination when user changes
  useEffect(() => {
    if (currentUser?.email === 'rafiq@dhaka.com') {
      setDestinationZone('Gulshan 1');
    } else {
      setDestinationZone('Mohakhali');
    }
  }, [currentUser]);

  // Fetch fare estimate when inputs change
  useEffect(() => {
    async function getEstimate() {
      try {
        const res = await fetch('/api/rides/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pickupZone, destinationZone, isPooled }),
        });
        const data = await res.json();
        if (data.fare) {
          setFareEstimate(data.fare);
        }
      } catch (err) {
        console.error('Failed to get fare estimate', err);
      }
    }
    getEstimate();
  }, [pickupZone, destinationZone, isPooled]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onRequestRide({ pickupZone, destinationZone, seatsRequested, isPooled });
  };

  // Lifecycle steps indicator
  const STEPS = ['MATCHED', 'DRIVER_ARRIVED', 'STARTED', 'COMPLETED'];
  const currentStepIndex = activeRide ? STEPS.indexOf(activeRide.status) : -1;

  return (
    <div className="space-y-6">
      {/* Top Banner & Wallet */}
      <div className="glass-panel rounded-2xl p-5 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-2xl font-bold glow-cyan">
            {currentUser?.name === 'Nusrat' ? '👩‍💼' : currentUser?.name === 'Rafiq' ? '👨‍💻' : '👩‍🎨'}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Welcome back, {currentUser?.name}!
            </h2>
            <p className="text-xs text-gray-400">
              {currentUser?.email === 'nusrat@dhaka.com' && 'Story Role: Passenger 1 (Banani → Mohakhali)'}
              {currentUser?.email === 'rafiq@dhaka.com' && 'Story Role: Passenger 2 (Banani → Gulshan 1)'}
              {currentUser?.email === 'shirin@dhaka.com' && 'Story Role: Passenger 3 (Banani → Mohakhali)'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-black/40 px-4 py-2.5 rounded-xl border border-white/10">
          <CreditCard className="w-5 h-5 text-emerald-400" />
          <div>
            <span className="text-[10px] text-gray-400 uppercase tracking-wider block">
              TeslaPay Balance
            </span>
            <span className="text-base font-extrabold text-emerald-400 font-mono">
              ৳{(currentUser?.walletBalanceBDT || 0).toFixed(2)} BDT
            </span>
          </div>
        </div>
      </div>

      {/* Active Ride Card (If ride is active) */}
      {activeRide ? (
        <div className="glass-panel rounded-2xl p-6 border border-tesla-cyan/30 glow-cyan relative overflow-hidden">
          <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-tesla-cyan animate-ping"></span>
              <h3 className="font-bold text-white text-base">Active Tesla Ride Status</h3>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-tesla-cyan/20 text-tesla-cyan border border-tesla-cyan/40">
              {activeRide.status}
            </span>
          </div>

          {/* Stepper Progress */}
          <div className="my-6">
            <div className="grid grid-cols-4 gap-2 relative">
              {STEPS.map((step, idx) => {
                const isPassed = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                return (
                  <div key={step} className="flex flex-col items-center text-center z-10">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        isCurrent
                          ? 'bg-tesla-cyan text-black ring-4 ring-tesla-cyan/30 scale-110 glow-cyan'
                          : isPassed
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-800 text-gray-500 border border-white/10'
                      }`}
                    >
                      {isPassed ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                    </div>
                    <span
                      className={`text-[11px] font-semibold mt-2 ${
                        isCurrent ? 'text-tesla-cyan' : isPassed ? 'text-emerald-400' : 'text-gray-500'
                      }`}
                    >
                      {step.replace('_', ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ride Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-black/40 p-4 rounded-xl border border-white/5 my-4 text-xs">
            <div>
              <span className="text-gray-400 block mb-1">Route & Seats</span>
              <p className="font-bold text-white">
                {activeRide.pickupZone} → {activeRide.destinationZone}
              </p>
              <p className="text-gray-400">{activeRide.seatsRequested} Seat(s) Booked</p>
            </div>

            <div>
              <span className="text-gray-400 block mb-1">Tesla & Driver</span>
              <p className="font-bold text-tesla-cyan">
                {activeRide.pool?.vehicle?.model || 'Bullet (3-seat Tesla)'}
              </p>
              <p className="text-gray-300">
                Driver: {activeRide.pool?.vehicle?.driver?.name || 'Jashim'}
              </p>
            </div>

            <div>
              <span className="text-gray-400 block mb-1">Individual Pooled Fare</span>
              <p className="font-extrabold text-emerald-400 text-sm font-mono">
                ৳{activeRide.finalFareBDT?.toFixed(2)} BDT
              </p>
              {activeRide.isPooled && (
                <span className="text-[10px] text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                  Pool Discount Applied
                </span>
              )}
            </div>
          </div>

          {/* Cancel button if eligible */}
          {['REQUESTED', 'MATCHED'].includes(activeRide.status) && (
            <div className="flex justify-end pt-2">
              <button
                onClick={() => onCancelRide(activeRide.id)}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 flex items-center gap-1.5 transition-all"
              >
                <XCircle className="w-4 h-4" /> Cancel Ride Request
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Ride Request Form */
        <div className="glass-panel rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-3">
            <Car className="w-5 h-5 text-tesla-red" />
            <h3 className="font-bold text-white text-base">Request Tesla Pool Ride</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pickup Zone */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Pickup Zone (Dhaka)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-emerald-400 absolute left-3 top-3" />
                  <select
                    value={pickupZone}
                    onChange={(e) => setPickupZone(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-tesla-cyan"
                  >
                    {zones.map((z) => (
                      <option key={z} value={z} className="bg-gray-900 text-white">
                        {z}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Destination Zone */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Destination Zone
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-tesla-red absolute left-3 top-3" />
                  <select
                    value={destinationZone}
                    onChange={(e) => setDestinationZone(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-tesla-cyan"
                  >
                    {zones.map((z) => (
                      <option key={z} value={z} className="bg-gray-900 text-white">
                        {z}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Seats & Pool Toggle */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Requested Seats (Bullet Capacity: 3)
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 text-amber-400 absolute left-3 top-3" />
                  <select
                    value={seatsRequested}
                    onChange={(e) => setSeatsRequested(Number(e.target.value))}
                    className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-tesla-cyan"
                  >
                    <option value={1}>1 Seat (Standard)</option>
                    <option value={2}>2 Seats</option>
                    <option value={3}>3 Seats (Entire Bullet)</option>
                  </select>
                </div>
              </div>

              {/* Pool Option */}
              <div className="flex items-center justify-between bg-black/40 px-4 py-3 rounded-xl border border-white/10">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="text-xs font-bold text-white block">Share Tesla Pool</span>
                    <span className="text-[10px] text-emerald-400">Save ৳20.00 BDT pool discount</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isPooled}
                  onChange={(e) => setIsPooled(e.target.checked)}
                  className="w-5 h-5 accent-tesla-cyan cursor-pointer"
                />
              </div>
            </div>

            {/* Fare Breakdown Card */}
            {fareEstimate && (
              <div className="bg-black/50 p-4 rounded-xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Base Fare:</span>
                  <span>৳{(fareEstimate.baseFarePoysha / 100).toFixed(2)} BDT</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Distance ({fareEstimate.distanceKm} km):</span>
                  <span>৳{(fareEstimate.distanceFarePoysha / 100).toFixed(2)} BDT</span>
                </div>
                {isPooled && (
                  <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                    <span>Pool Share Discount:</span>
                    <span>- ৳{(fareEstimate.poolDiscountPoysha / 100).toFixed(2)} BDT</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm font-extrabold text-white pt-2 border-t border-white/10">
                  <span>Total Estimated Fare:</span>
                  <span className="text-emerald-400 font-mono text-base">
                    ৳{fareEstimate.fareBDT.toFixed(2)} BDT
                  </span>
                </div>
              </div>
            )}

            {/* Submit Request Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-tesla-red via-red-600 to-amber-600 hover:from-tesla-red hover:to-red-500 text-white glow-red flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
            >
              {loading ? (
                <span>Requesting Ride...</span>
              ) : (
                <>
                  <span>Confirm & Request Tesla Ride</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Ride History */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10">
        <h3 className="font-bold text-white text-base mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-tesla-cyan" /> Ride History ({rideHistory.length})
        </h3>

        {rideHistory.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">No past rides recorded.</p>
        ) : (
          <div className="space-y-3">
            {rideHistory.map((r) => (
              <div
                key={r.id}
                className="bg-black/40 p-3.5 rounded-xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">
                      {r.pickupZone} → {r.destinationZone}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-white/10 text-gray-300 font-mono">
                      {r.status}
                    </span>
                  </div>
                  <span className="text-gray-400 text-[11px] block mt-0.5">
                    {new Date(r.createdAt).toLocaleString()} • {r.seatsRequested} Seat(s)
                  </span>
                </div>

                <div className="text-right font-mono font-bold text-emerald-400 text-sm">
                  ৳{r.finalFareBDT?.toFixed(2)} BDT
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
