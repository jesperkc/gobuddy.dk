/**
 * SSR-safe utilities for browser APIs and client-only functionality
 */
import React from "react";

/**
 * Check if we're running in the browser (client-side)
 */
export const isBrowser = typeof window !== "undefined";

/**
 * Check if we're running on the server (server-side)
 */
export const isServer = !isBrowser;

/**
 * SSR-safe wrapper for accessing window object
 */
export const safeWindow = isBrowser ? window : undefined;

/**
 * SSR-safe wrapper for accessing navigator object
 */
export const safeNavigator = isBrowser ? navigator : undefined;

/**
 * SSR-safe wrapper for accessing document object
 */
export const safeDocument = isBrowser ? document : undefined;

/**
 * SSR-safe wrapper for setTimeout
 */
export const safeSetTimeout = (callback: () => void, delay: number): number | undefined => {
  if (isBrowser && window.setTimeout) {
    return window.setTimeout(callback, delay);
  }
  return undefined;
};

/**
 * SSR-safe wrapper for clearTimeout
 */
export const safeClearTimeout = (timeoutId: number | undefined): void => {
  if (isBrowser && window.clearTimeout && timeoutId !== undefined) {
    window.clearTimeout(timeoutId);
  }
};

/**
 * SSR-safe wrapper for localStorage
 */
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (isBrowser && window.localStorage) {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        console.warn("localStorage.getItem failed:", e);
        return null;
      }
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    if (isBrowser && window.localStorage) {
      try {
        window.localStorage.setItem(key, value);
      } catch (e) {
        console.warn("localStorage.setItem failed:", e);
      }
    }
  },
  removeItem: (key: string): void => {
    if (isBrowser && window.localStorage) {
      try {
        window.localStorage.removeItem(key);
      } catch (e) {
        console.warn("localStorage.removeItem failed:", e);
      }
    }
  },
};

/**
 * SSR-safe wrapper for sessionStorage
 */
export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    if (isBrowser && window.sessionStorage) {
      try {
        return window.sessionStorage.getItem(key);
      } catch (e) {
        console.warn("sessionStorage.getItem failed:", e);
        return null;
      }
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    if (isBrowser && window.sessionStorage) {
      try {
        window.sessionStorage.setItem(key, value);
      } catch (e) {
        console.warn("sessionStorage.setItem failed:", e);
      }
    }
  },
  removeItem: (key: string): void => {
    if (isBrowser && window.sessionStorage) {
      try {
        window.sessionStorage.removeItem(key);
      } catch (e) {
        console.warn("sessionStorage.removeItem failed:", e);
      }
    }
  },
};

/**
 * SSR-safe geolocation API wrapper
 */
export const safeGeolocation = {
  getCurrentPosition: (successCallback: PositionCallback, errorCallback?: PositionErrorCallback, options?: PositionOptions): void => {
    if (isBrowser && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
    } else if (errorCallback) {
      // Call error callback with a mock error if we're on server or geolocation is not available
      const mockError: GeolocationPositionError = {
        code: 1, // PERMISSION_DENIED
        message: "Geolocation is not available in this environment",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };
      errorCallback(mockError);
    }
  },
  watchPosition: (successCallback: PositionCallback, errorCallback?: PositionErrorCallback, options?: PositionOptions): number | null => {
    if (isBrowser && "geolocation" in navigator) {
      return navigator.geolocation.watchPosition(successCallback, errorCallback, options);
    }
    return null;
  },
  clearWatch: (watchId: number): void => {
    if (isBrowser && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchId);
    }
  },
};

/**
 * SSR-safe date/time functions that prevent hydration mismatches
 */
export const safeDate = {
  /**
   * Get current time in a way that's consistent between server and client
   * Returns null on server to prevent hydration mismatches
   */
  getCurrentTime: (): Date | null => {
    if (isBrowser) {
      return new Date();
    }
    return null;
  },

  /**
   * Get greeting based on time of day, with fallback for SSR
   */
  getGreeting: (fallback: string = "Hej"): string => {
    if (isBrowser) {
      const hour = new Date().getHours();
      if (hour < 12) return "God morgen";
      if (hour < 18) return "God eftermiddag";
      return "God aften";
    }
    return fallback;
  },
};

/**
 * Hook for client-only effects
 * Prevents running effects during SSR
 */
export const useClientEffect = (effect: () => void | (() => void), deps?: React.DependencyList) => {
  React.useEffect(() => {
    if (isBrowser) {
      return effect();
    }
  }, deps);
};

/**
 * Component wrapper for client-only rendering
 * Renders children only on the client, shows fallback on server
 */
export const ClientOnly: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback = null }) => {
  const [hasMounted, setHasMounted] = React.useState(false);

  React.useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return React.createElement(React.Fragment, null, fallback);
  }

  return React.createElement(React.Fragment, null, children);
};

/**
 * SSR-safe fetch wrapper that can handle server/client differences
 */
export const safeFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response | null> => {
  try {
    // On server, we might want to use a different base URL or handle differently
    if (isServer) {
      // For now, just return null on server, but this could be enhanced
      // to make actual server-side requests with proper URLs
      return null;
    }

    return await fetch(input, init);
  } catch (error) {
    console.error("safeFetch error:", error);
    return null;
  }
};

/**
 * SSR-safe URL constructor
 */
export const safeURL = (url: string, base?: string | URL): URL | null => {
  try {
    if (isBrowser || (isServer && typeof URL !== "undefined")) {
      return new URL(url, base);
    }
    return null;
  } catch (error) {
    console.error("safeURL error:", error);
    return null;
  }
};
