/**
 * Map Tile Configuration
 *
 * Provides configurable tile providers for the StageMap component.
 * Supports multiple tile sources with proper attribution.
 *
 * PRIVACY NOTE:
 * - OSM (OpenStreetMap) is the default only for development without API keys.
 *   It sends tile requests FROM user's IP, which can leak approximate location.
 * - Stadia Maps is the recommended privacy-friendly default for production.
 *   It does not require user GPS to serve tiles and has a generous free tier.
 * - MapTiler and Mapbox require API keys and may log tile request IPs.
 *
 * Tile Provider Priority (for production):
 *  1. MapTiler  — best quality, requires API key (has free tier)
 *  2. Mapbox    — good quality, requires API key (has free tier)
 *  3. Stadia    — privacy-friendly, no API key needed (recommended for production without paid providers)
 *  4. OSM       — development only, rate-limited, sends IP to OSM servers
 */

export type TileProvider = "osm" | "maptiler" | "stadia" | "mapbox";

export interface TileProviderConfig {
  id: TileProvider;
  name: string;
  /** URL template; {apiKey} is substituted from environment variables */
  url: string;
  /** Full HTML attribution string for display on map */
  attribution: string;
  maxZoom: number;
  requiresApiKey: boolean;
  /** Privacy tier: lower = more privacy-preserving (no IP logging for tiles) */
  privacyTier: number;
}

export const TILE_PROVIDERS: Record<TileProvider, TileProviderConfig> = {
  osm: {
    id: "osm",
    name: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    requiresApiKey: false,
    privacyTier: 4, // Sends IP to OSM servers — development only
  },
  stadia: {
    id: "stadia",
    name: "Stadia Maps",
    url: "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 20,
    requiresApiKey: false,
    privacyTier: 2, // Privacy-friendly: no API key, generous free tier
  },
  maptiler: {
    id: "maptiler",
    name: "MapTiler",
    url: "https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key={apiKey}",
    attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
    requiresApiKey: true,
    privacyTier: 3, // Logs tile request IPs
  },
  mapbox: {
    id: "mapbox",
    name: "Mapbox",
    url: "https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token={apiKey}",
    attribution: '&copy; <a href="https://www.mapbox.com/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
    requiresApiKey: true,
    privacyTier: 3, // Logs tile request IPs
  },
};

// Environment variable names for API keys
export const API_KEY_ENV_VARS: Record<string, TileProvider> = {
  "NEXT_PUBLIC_MAPTILER_API_KEY": "maptiler",
  "NEXT_PUBLIC_MAPBOX_API_KEY": "mapbox",
};

/**
 * Check if an API key looks valid (non-empty and not a placeholder).
 * Prevents accidentally using placeholder values like "your_key_here".
 */
export function isValidApiKey(key: string | undefined): boolean {
  if (!key) return false;
  // Reject common placeholder patterns
  if (key === "your_maptiler_api_key_here" || key === "your_mapbox_api_key_here") return false;
  if (key.length < 10) return false;
  return true;
}

/**
 * Get the best available tile provider from environment variables.
 *
 * Privacy-aware priority:
 *  1. MapTiler  — if NEXT_PUBLIC_MAPTILER_API_KEY is valid
 *  2. Mapbox    — if NEXT_PUBLIC_MAPBOX_API_KEY is valid
 *  3. Stadia    — privacy-friendly, no API key (PRODUCTION DEFAULT)
 *  4. OSM       — development fallback only (rate-limited, not for production)
 *
 * Set NEXT_PUBLIC_TILE_PROVIDER to override (e.g. "stadia", "maptiler", "mapbox").
 */
export function getConfiguredTileProvider(): TileProvider {
  // Allow explicit override for any provider
  const override = process.env.NEXT_PUBLIC_TILE_PROVIDER;
  if (override && override in TILE_PROVIDERS) {
    return override as TileProvider;
  }

  // Priority 1: MapTiler with a valid API key
  if (isValidApiKey(process.env.NEXT_PUBLIC_MAPTILER_API_KEY)) return "maptiler";

  // Priority 2: Mapbox with a valid API key
  if (isValidApiKey(process.env.NEXT_PUBLIC_MAPBOX_API_KEY)) return "mapbox";

  // Priority 3: Stadia — privacy-friendly production default (no API key needed)
  // Stadia Maps was acquired by Smarty and rebranded; tiles.stadiamaps.com still works
  // as of 2025 with generous free tier (no API key required)
  return "stadia";

  // NOTE: OSM is deliberately excluded from auto-selection.
  // It is rate-limited and sends user IPs to openstreetmap.org — not suitable for production.
  // To use OSM explicitly for development, set NEXT_PUBLIC_TILE_PROVIDER=osm
}

/**
 * Get the URL for a tile provider, substituting API key if needed.
 */
export function getTileUrl(provider: TileProvider, apiKey?: string): string {
  const config = TILE_PROVIDERS[provider];
  if (config.requiresApiKey && apiKey) {
    return config.url.replace("{apiKey}", encodeURIComponent(apiKey));
  }
  return config.url;
}

/**
 * Get API key for a provider from environment variables.
 */
export function getApiKey(provider: TileProvider): string | undefined {
  switch (provider) {
    case "maptiler":
      return process.env.NEXT_PUBLIC_MAPTILER_API_KEY;
    case "mapbox":
      return process.env.NEXT_PUBLIC_MAPBOX_API_KEY;
    default:
      return undefined;
  }
}

/**
 * Validate tile provider configuration and warn about issues.
 * Call this in development to help catch misconfiguration.
 */
export function validateTileConfig(): void {
  if (process.env.NODE_ENV !== "development") return;

  const provider = getConfiguredTileProvider();
  const config = TILE_PROVIDERS[provider];

  if (provider === "osm") {
    console.warn(
      "[Amplify Map] WARNING: Using OSM tiles in development. " +
      "OSM is rate-limited and not suitable for production. " +
      "For production, set NEXT_PUBLIC_MAPTILER_API_KEY or NEXT_PUBLIC_MAPBOX_API_KEY, " +
      "or ensure NEXT_PUBLIC_TILE_PROVIDER is not set to 'osm'."
    );
  }

  if (config.requiresApiKey && !isValidApiKey(getApiKey(provider))) {
    console.error(
      `[Amplify Map] ERROR: Provider '${provider}' requires a valid API key ` +
      `but NEXT_PUBLIC_${provider.toUpperCase()}_API_KEY is missing or invalid. ` +
      `Falling back to Stadia Maps.`
    );
  }
}
