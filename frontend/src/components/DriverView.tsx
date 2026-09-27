'use client';

import React, { useState } from 'react';
import {
  Car,
  Power,
  Users,
  CheckCircle,
  MapPin,
  Play,
  Check,
  ShieldCheck,
  Clock,
  Navigation,
} from 'lucide-react';

interface DriverViewProps {
  currentUser: any;
  driverData: any;
  zones: string[];
  onToggleOnline: (isOnline: boolean, currentZone: string) => Promise<void>;
  onUpdateRideStatus: (rideId: string, targetStatus: string) => Promise<void>;
  loading: boolean;
}

export default function DriverView({
  currentUser,
  driverData,
  zones,
  onToggleOnline,
  onUpdateRideStatus,
  loading,
}: DriverViewProps) {
  const vehicle = driverData?.vehicle;
  const currentPool = driverData?.currentPool;
  const rides = currentPool?.rideRequests || [];

  const [currentZone, setCurrentZone] = useState(vehicle?.currentZone || 'Banani');

  const handleOnlineToggle = async () => {
    await onToggleOnline(!vehicle?.isOnline, currentZone);
  };

  return (
    <div className="space-y-6">
      {/* Driver & Vehicle Status Cockpit Card */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-tesla-red to-red-600 flex items-center justify-center text-3xl glow-red">
            🚕⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">{vehicle?.model || 'Bullet (Tesla)'}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {vehicle?.licensePlate || 'DHAKA-METRO-T-11'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Driver: <strong className="text-white">Jashim</strong> • Fixed Seat Capacity:{' '}
              <strong className="text-tesla-cyan">{vehicle?.capacity || 3} Seats</strong>
            </p>
          </div>
        </div>

        {/* Online / Offline Switch */}
        <div className="flex items-center gap-4 bg-black/40 p-2.5 rounded-xl border border-white/10">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-tesla-cyan" />
            <select
              value={currentZone}
              onChange={(e) => setCurrentZone(e.target.value)}
              className="bg-black/60 border border-white/10 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-tesla-cyan"
            >
              {zones.map((z) => (
                <option key={z} value={z} className="bg-gray-900 text-white">
                  {z}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleOnlineToggle}
            disabled={loading}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              vehicle?.isOnline
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white glow-emerald'
                : 'bg-gray-800 hover:bg-gray-700 text-gray-400 border border-white/10'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{vehicle?.isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          </button>
        </div>
      </div>

      {/* Seat Capacity Visual Widget */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-tesla-cyan" />
            <h3 className="font-bold text-white text-base">
              Bullet Occupied Seat Capacity
            </h3>
          </div>
          <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-black/60 text-tesla-cyan border border-tesla-cyan/30">
            {currentPool?.occupiedSeats || 0} / {vehicle?.capacity || 3} Occupied
          </span>
        </div>

        {/* 3 Seat Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
          {[0, 1, 2].map((seatIndex) => {
            const passengerRide = rides[seatIndex];
            const isOccupied = Boolean(passengerRide);

            return (
              <div
                key={seatIndex}
                className={`p-4 rounded-xl border transition-all ${
                  isOccupied
                    ? 'bg-tesla-cyan/10 border-tesla-cyan/40 glow-cyan'
                    : 'bg-black/30 border-white/5 border-dashed text-gray-500'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Seat #{seatIndex + 1}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      isOccupied ? 'bg-tesla-cyan/20 text-tesla-cyan' : 'bg-gray-800 text-gray-500'
                    }`}
                  >
                    {isOccupied ? 'OCCUPIED' : 'AVAILABLE'}
                  </span>
                </div>

                {isOccupied ? (
                  <div>
                    <h4 className="font-bold text-white text-sm">
                      {passengerRide.passenger?.name || 'Passenger'}
                    </h4>
                    <p className="text-xs text-gray-400">
                      {passengerRide.pickupZone} → {passengerRide.destinationZone}
                    </p>
                    <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
                      <span className="text-[11px] text-emerald-400 font-mono font-bold">
                        ৳{passengerRide.finalFareBDT?.toFixed(2)} BDT
                      </span>
                      <span className="text-[10px] text-tesla-cyan font-bold">
                        {passengerRide.status}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="py-3 text-center">
                    <p className="text-xs text-gray-500">Ready for next rider</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Rides Management Section */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10">
        <h3 className="font-bold text-white text-base mb-4 flex items-center gap-2">
          <Navigation className="w-5 h-5 text-amber-400" /> Driver Trip Controls ({rides.length})
        </h3>

        {rides.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">
            No active ride requests currently matched with Bullet.
          </p>
        ) : (
          <div className="space-y-4">
            {rides.map((ride: any) => {
              return (
                <div
                  key={ride.id}
                  className="bg-black/50 p-4 rounded-xl border border-white/10 space-y-3"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">
                          {ride.passenger?.name} ({ride.seatsRequested} seat)
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-tesla-cyan/20 text-tesla-cyan border border-tesla-cyan/30">
                          {ride.status}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        Route: {ride.pickupZone} → {ride.destinationZone} ({ride.distanceKm} km)
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-gray-400 block">Individual Fare</span>
                      <span className="text-base font-extrabold text-emerald-400 font-mono">
                        ৳{ride.finalFareBDT?.toFixed(2)} BDT
                      </span>
                    </div>
                  </div>

                  {/* Lifecycle Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {ride.status === 'MATCHED' && (
                      <button
                        onClick={() => onUpdateRideStatus(ride.id, 'DRIVER_ARRIVED')}
                        disabled={loading}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black flex items-center gap-1.5 transition-all shadow-md"
                      >
                        <MapPin className="w-4 h-4" /> Mark Driver Arrived
                      </button>
                    )}

                    {ride.status === 'DRIVER_ARRIVED' && (
                      <button
                        onClick={() => onUpdateRideStatus(ride.id, 'STARTED')}
                        disabled={loading}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-600 text-black flex items-center gap-1.5 transition-all shadow-md"
                      >
                        <Play className="w-4 h-4" /> Start Trip (Passengers Onboard)
                      </button>
                    )}

                    {ride.status === 'STARTED' && (
                      <button
                        onClick={() => onUpdateRideStatus(ride.id, 'COMPLETED')}
                        disabled={loading}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1.5 transition-all glow-emerald shadow-md"
                      >
                        <Check className="w-4 h-4" /> Complete Trip & Collect Fare
                      </button>
                    )}

                    {ride.status === 'COMPLETED' && (
                      <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> Trip Completed & Fare Settled
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
