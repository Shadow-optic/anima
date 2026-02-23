/**
 * ANIMA Environment Monitor Service
 * 
 * Background service that fetches environmental risk data
 * based on user location. Runs when app opens or periodically.
 */

import * as Location from "expo-location";
import {api} from "../config/api";

interface LocationData {
  lat: number;
  lng: number;
  locality?: string;
}

/**
 * Request location permission and get current coordinates.
 */
export async function getCurrentLocation(): Promise<LocationData | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") return null;

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  // Reverse geocode for locality name
  let locality: string | undefined;
  try {
    const [geo] = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });
    locality = geo ? `${geo.city || geo.subregion}, ${geo.region}` : undefined;
  } catch {}

  return {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    locality,
  };
}

/**
 * Fetch environmental risks for a pet at current location.
 */
export async function fetchEnvironmentRisks(petId: string): Promise<any> {
  const location = await getCurrentLocation();
  if (!location) {
    throw new Error("Location access required for environmental risk assessment");
  }

  return api.get(`/pets/${petId}/environment`, {
    lat: String(location.lat),
    lng: String(location.lng),
  });
}

/**
 * Register background location task for periodic risk updates.
 * In production, this uses expo-task-manager for background fetch.
 */
export async function registerBackgroundMonitoring(): Promise<boolean> {
  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
  if (bgStatus !== "granted") return false;

  // Would use TaskManager.defineTask + Location.startLocationUpdatesAsync
  // For MVP: rely on foreground fetch when app opens
  return true;
}
