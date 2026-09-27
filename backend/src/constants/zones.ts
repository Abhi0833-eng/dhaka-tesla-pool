export interface Zone {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export const DHAKA_ZONES: Record<string, Zone> = {
  Banani: { id: 'Banani', name: 'Banani', lat: 23.7937, lng: 90.4066 },
  'Gulshan 1': { id: 'Gulshan 1', name: 'Gulshan 1', lat: 23.7807, lng: 90.4168 },
  'Gulshan 2': { id: 'Gulshan 2', name: 'Gulshan 2', lat: 23.7949, lng: 90.4143 },
  Mohakhali: { id: 'Mohakhali', name: 'Mohakhali', lat: 23.7778, lng: 90.4055 },
  Dhanmondi: { id: 'Dhanmondi', name: 'Dhanmondi', lat: 23.7461, lng: 90.3742 },
  Mirpur: { id: 'Mirpur', name: 'Mirpur', lat: 23.8069, lng: 90.3687 },
  Uttara: { id: 'Uttara', name: 'Uttara', lat: 23.8759, lng: 90.3795 },
  Farmgate: { id: 'Farmgate', name: 'Farmgate', lat: 23.7561, lng: 90.3872 },
  Bashundhara: { id: 'Bashundhara', name: 'Bashundhara', lat: 23.8161, lng: 90.4261 },
};

// Calculate Haversine distance in Km between two zones
export function calculateDistanceKm(zoneA: string, zoneB: string): number {
  const src = DHAKA_ZONES[zoneA] || DHAKA_ZONES['Banani'];
  const dst = DHAKA_ZONES[zoneB] || DHAKA_ZONES['Mohakhali'];

  if (zoneA === zoneB) return 1.0; // Minimum 1km inside zone

  const R = 6371; // Earth radius km
  const dLat = ((dst.lat - src.lat) * Math.PI) / 180;
  const dLng = ((dst.lng - src.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((src.lat * Math.PI) / 180) *
      Math.cos((dst.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}
