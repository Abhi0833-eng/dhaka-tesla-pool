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

export function calculateDistanceKm(zoneA: string, zoneB: string): number {
  const src = DHAKA_ZONES[zoneA] || DHAKA_ZONES['Banani'];
  const dst = DHAKA_ZONES[zoneB] || DHAKA_ZONES['Mohakhali'];

  if (zoneA === zoneB) return 1.0;

  const R = 6371;
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

  return Math.round(distance * 10) / 10;
}

export const BASE_FARE_POYSHA = 5000;
export const RATE_PER_KM_POYSHA = 1500;
export const POOL_DISCOUNT_POYSHA = 2000;

export function calculateFare(
  pickupZone: string,
  destinationZone: string,
  isPooled: boolean = true
) {
  const distanceKm = calculateDistanceKm(pickupZone, destinationZone);
  const baseFarePoysha = BASE_FARE_POYSHA;
  const distanceFarePoysha = Math.round(distanceKm * RATE_PER_KM_POYSHA);
  const poolDiscountPoysha = isPooled ? POOL_DISCOUNT_POYSHA : 0;

  const finalFarePoysha = Math.max(
    2000,
    baseFarePoysha + distanceFarePoysha - poolDiscountPoysha
  );

  return {
    pickupZone,
    destinationZone,
    distanceKm,
    baseFarePoysha,
    distanceFarePoysha,
    poolDiscountPoysha,
    finalFarePoysha,
    fareBDT: finalFarePoysha / 100,
  };
}
