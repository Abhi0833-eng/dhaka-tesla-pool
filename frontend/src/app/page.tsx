'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Header, { STORY_CAST } from '@/components/Header';
import DhakaMap from '@/components/DhakaMap';
import PassengerView from '@/components/PassengerView';
import DriverView from '@/components/DriverView';
import ConcurrencySimulatorModal from '@/components/ConcurrencySimulatorModal';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authToken, setAuthToken] = useState<string>('');
  const [zones, setZones] = useState<string[]>([
    'Banani',
    'Gulshan 1',
    'Gulshan 2',
    'Mohakhali',
    'Dhanmondi',
    'Mirpur',
    'Uttara',
    'Farmgate',
    'Bashundhara',
  ]);

  // Passenger data state
  const [passengerRides, setPassengerRides] = useState<any[]>([]);
  const [activeRide, setActiveRide] = useState<any>(null);

  // Driver data state
  const [driverData, setDriverData] = useState<any>(null);

  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showSimModal, setShowSimModal] = useState<boolean>(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Switch Story Cast user login
  const handleSelectStoryCast = async (email: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' }),
      });
      const data = await res.json();

      if (res.ok) {
        setAuthToken(data.token);
        setCurrentUser(data.user);
        showToast(`Logged in as ${data.user.name} (${data.user.role})`);
      } else {
        showToast(data.error || 'Failed to switch story cast', 'error');
      }
    } catch (err) {
      showToast('Error connecting to Dhaka Tesla Pool API', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch current user data (Rides or Driver cockpit)
  const loadUserData = useCallback(async () => {
    if (!authToken || !currentUser) return;

    try {
      if (currentUser.role === 'DRIVER') {
        const res = await fetch('/api/driver/pool', {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const data = await res.json();
        if (res.ok) {
          setDriverData(data);
        }
      } else {
        const res = await fetch('/api/rides/my-rides', {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const data = await res.json();
        if (res.ok && data.rides) {
          setPassengerRides(data.rides);
          const active = data.rides.find((r: any) =>
            ['REQUESTED', 'MATCHED', 'DRIVER_ARRIVED', 'STARTED'].includes(r.status)
          );
          setActiveRide(active || null);
        }
      }

      // Also refresh user balance
      const meRes = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const meData = await meRes.json();
      if (meRes.ok && meData.user) {
        setCurrentUser(meData.user);
      }
    } catch (err) {
      console.error('Failed to load user data', err);
    }
  }, [authToken, currentUser]);

  // Initial load: log in Nusrat by default
  useEffect(() => {
    handleSelectStoryCast('nusrat@dhaka.com');
  }, []);

  // Poll / Refresh data when token/user changes
  useEffect(() => {
    if (authToken && currentUser) {
      loadUserData();
    }
  }, [authToken, currentUser?.email, loadUserData]);

  // Handle passenger ride request
  const handleRequestRide = async (bookingData: {
    pickupZone: string;
    destinationZone: string;
    seatsRequested: number;
    isPooled: boolean;
  }) => {
    setLoading(true);
    try {
      const res = await fetch('/api/rides/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(bookingData),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Ride requested successfully!');
        await loadUserData();
      } else {
        showToast(data.error || 'Failed to request ride', 'error');
      }
    } catch (err) {
      showToast('Error requesting ride.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle passenger ride cancellation
  const handleCancelRide = async (rideId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rides/${rideId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Ride cancelled successfully.');
        await loadUserData();
      } else {
        showToast(data.error || 'Failed to cancel ride.', 'error');
      }
    } catch (err) {
      showToast('Error cancelling ride.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle driver status toggle
  const handleToggleOnline = async (isOnline: boolean, currentZone: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/driver/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ isOnline, currentZone }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message);
        await loadUserData();
      } else {
        showToast(data.error || 'Failed to toggle status.', 'error');
      }
    } catch (err) {
      showToast('Error updating driver status.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle driver updating ride status
  const handleUpdateRideStatus = async (rideId: string, targetStatus: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/driver/ride/${rideId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ targetStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `Status updated to ${targetStatus}`);
        await loadUserData();
      } else {
        showToast(data.error || 'Failed to update ride status.', 'error');
      }
    } catch (err) {
      showToast('Error updating ride status.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <Header
        currentUser={currentUser}
        onSelectStoryCast={handleSelectStoryCast}
        onOpenConcurrencySim={() => setShowSimModal(true)}
        onRefresh={loadUserData}
        loading={loading}
      />

      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-xl shadow-2xl text-xs font-bold border backdrop-blur-md flex items-center gap-2 ${
              notification.type === 'error'
                ? 'bg-red-500/90 text-white border-red-400'
                : 'bg-emerald-500/90 text-white border-emerald-400'
            }`}
          >
            <span>{notification.type === 'error' ? '⚠️' : '✅'}</span>
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 space-y-6">
        {/* Map Visualizer */}
        <DhakaMap
          pickupZone={activeRide?.pickupZone || 'Banani'}
          destinationZone={activeRide?.destinationZone || 'Mohakhali'}
          activePool={driverData?.currentPool || activeRide?.pool}
          currentZone={driverData?.vehicle?.currentZone || 'Banani'}
        />

        {/* View Switcher based on current role */}
        {currentUser?.role === 'DRIVER' ? (
          <DriverView
            currentUser={currentUser}
            driverData={driverData}
            zones={zones}
            onToggleOnline={handleToggleOnline}
            onUpdateRideStatus={handleUpdateRideStatus}
            loading={loading}
          />
        ) : (
          <PassengerView
            currentUser={currentUser}
            zones={zones}
            activeRide={activeRide}
            rideHistory={passengerRides}
            onRequestRide={handleRequestRide}
            onCancelRide={handleCancelRide}
            loading={loading}
          />
        )}
      </main>

      {/* Concurrency Simulator Modal */}
      <ConcurrencySimulatorModal
        isOpen={showSimModal}
        onClose={() => setShowSimModal(false)}
        onRefreshAll={loadUserData}
      />
    </div>
  );
}
