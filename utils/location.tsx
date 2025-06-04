import { createContext, useContext, useEffect, useState } from "react";
import * as Location from "expo-location";
import { LocationMetadata } from "./dataTypes";
import { storage } from "./mmkv";

const LOCATION_PERMISSION_KEY = "locationPermissionStatus";
const CACHED_LOCATION_KEY = "cachedLocation";
const LOCATION_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

interface LocationContextType {
  getLocationMetadata: () => Promise<LocationMetadata | null>;
  cachedLocation: LocationMetadata | null;
}

export const LocationContext = createContext<LocationContextType>({
  getLocationMetadata: async () => null,
  cachedLocation: null,
});

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [cachedLocation, setCachedLocation] = useState<LocationMetadata | null>(
    () => {
      try {
        const cached = storage.getString(CACHED_LOCATION_KEY);
        if (!cached) return null;

        const data = JSON.parse(cached);
        if (
          !data ||
          !data.location ||
          !data.timestamp ||
          typeof data.timestamp !== "number"
        ) {
          storage.delete(CACHED_LOCATION_KEY);
          return null;
        }

        if (Date.now() - data.timestamp < LOCATION_CACHE_DURATION) {
          return data.location;
        }

        storage.delete(CACHED_LOCATION_KEY);
        return null;
      } catch (err) {
        console.warn("[Location] Error initializing location cache:", err);
        storage.delete(CACHED_LOCATION_KEY);
        return null;
      }
    }
  );

  // Check for existing permission and cache location on startup if we have it
  useEffect(() => {
    async function initializeLocation() {
      try {
        // Only proceed if we don't have a valid cached location
        if (cachedLocation) return;

        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== "granted") return;

        // We have permission and no cache, get the location
        await getLocationMetadata();
      } catch (err) {
        console.warn("[Location] Error in initial location fetch:", err);
      }
    }

    initializeLocation();
  }, []);

  const getLocationMetadata = async (): Promise<LocationMetadata | null> => {
    try {
      if (cachedLocation) {
        return cachedLocation;
      }

      const savedPermissionStatus = storage.getString(LOCATION_PERMISSION_KEY);
      if (savedPermissionStatus === "denied") {
        return null;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      storage.set(LOCATION_PERMISSION_KEY, status);

      if (status !== "granted") {
        return null;
      }

      const location = await Location.getCurrentPositionAsync();
      const { latitude, longitude } = location.coords;

      const results = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      const locationData = results[0];

      const newLocation: LocationMetadata = {
        latitude,
        longitude,
        name: locationData.name || undefined,
        street: locationData.street || undefined,
        city: locationData.city || undefined,
        region: locationData.region || undefined,
        country: locationData.country || undefined,
      };

      try {
        storage.set(
          CACHED_LOCATION_KEY,
          JSON.stringify({
            location: newLocation,
            timestamp: Date.now(),
          })
        );
        setCachedLocation(newLocation);
      } catch (err) {
        console.warn("[Location] Error caching location:", err);
      }

      return newLocation;
    } catch (err) {
      console.warn("[Location] Error getting location:", err);
      return null;
    }
  };

  return (
    <LocationContext.Provider value={{ getLocationMetadata, cachedLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return useContext(LocationContext);
}
