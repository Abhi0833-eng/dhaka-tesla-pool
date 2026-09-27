import { calculateDistanceKm } from '../constants/zones.js';

export interface FareCalculationResult {
  pickupZone: string;
  destinationZone: string;
  distanceKm: number;
  baseFarePoysha: number;
  distanceFarePoysha: number;
  poolDiscountPoysha: number;
  finalFarePoysha: number;
  fareBDT: number;
}

export const BASE_FARE_POYSHA = 5000; // 50.00 BDT
export const RATE_PER_KM_POYSHA = 1500; // 15.00 BDT per km
export const POOL_DISCOUNT_POYSHA = 2000; // 20.00 BDT pool discount when sharing Tesla

/**
 * Calculates fare in integer Poysha (100 Poysha = 1 BDT)
 * passengerFare = baseFare + distanceCharge - poolDiscount
 */
export function calculateFare(
  pickupZone: string,
  destinationZone: string,
  isPooled: boolean = true
): FareCalculationResult {
  const distanceKm = calculateDistanceKm(pickupZone, destinationZone);

  const baseFarePoysha = BASE_FARE_POYSHA;
  const distanceFarePoysha = Math.round(distanceKm * RATE_PER_KM_POYSHA);
  const poolDiscountPoysha = isPooled ? POOL_DISCOUNT_POYSHA : 0;

  const finalFarePoysha = Math.max(
    2000, // Minimum fare threshold: 20 BDT
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
