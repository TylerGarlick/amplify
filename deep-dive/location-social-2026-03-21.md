# Amplify: Location & Social Deep Dive

**Date:** 2026-03-21  
**Task:** BL-2026-0320-016  
**Focus:** Foursquare Places API, H3 Hexagonal Spatial Indexing, Stop Detection

---

## 1. Foursquare Places API

### Overview
Foursquare's Places API provides venue search, details, and recommendations. It's the industry standard for venue data with 90M+ venues globally.

### Pricing Tiers (as of 2024-2025)

| Tier | Price | Monthly Quota | Key Features |
|------|-------|---------------|--------------|
| **Free** | $0 | 500 requests/day, 1 req/sec | Basic search, place details |
| **Starter** | $50/mo | 50,000 requests/mo | Higher rate limits, nearby search |
| **Pro** | $200/mo | 200,000 requests/mo | Full API access, photos, tips |
| **Enterprise** | Custom | Unlimited | SLA, dedicated support, bulk data |

### Key Endpoints for Amplify

```typescript
// Search venues near location
GET /v3/places/search
  ?ll=40.7484,-73.9857
  &query=music+venue
  &radius=5000
  &categoryId=10003,10004  // Music venues

// Get venue details
GET /v3/places/{fsq_id}

// Get popular venues
GET /v3/places/search
  ?ll=40.7484,-73.9857
  &sortByPopularity=1
```

### Amplify Recommendations
- **Free tier** is sufficient for MVP (500 req/day ≈ 15,000/mo)
- Use caching aggressively — venue data changes rarely
- Store venue metadata in local DB, refresh only on user action
- Rate limit enforced at 1 req/sec on free tier

### Limitations & Gotchas
- No real-time availability (for shows/events)
- Photos require paid tier
- Category IDs differ from other providers
- No user-generated content (tips) on free tier

---

## 2. H3 Hexagonal Spatial Indexing

### Overview
H3 is Uber's hexagonal hierarchical spatial index. It discretizes the world into hexagons at varying resolutions (0-15), enabling efficient spatial queries.

### Why H3 for Amplify?

| Problem | H3 Solution |
|---------|-------------|
| "Find nearby stages" | `latLngToCell()` → query cells at res 7 |
| "Am I at this venue?" | `getResolution(cell)` ≈ venue boundary |
| "Group venues by area" | `gridDisk(cells, k)` for k-ring neighborhoods |
| "Cluster markers" | Aggregate by H3 cell at appropriate resolution |

### Resolution Guide

| Resolution | Hex Edge Length | Use Case |
|------------|-----------------|----------|
| 4 | ~65 km | Country/region |
| 7 | ~1.8 km | Neighborhood/district |
| 9 | ~200 m | City block |
| 12 | ~5 m | Building/parking lot |
| 15 | ~0.6 m | Precise location |

### Key Code Patterns

```typescript
import { latLngToCell, cellToLatLng, gridDisk, gridRing } from 'h3-js';

// Convert GPS to H3 cell at resolution 9 (~200m hexes)
const cell = latLngToCell(lat, lng, 9);

// Get all cells within 2km radius (k=3 at res 9)
const nearbyCells = gridDisk(cell, 3);

// Query: "What stages are within 2km?"
const nearbyStages = stages.filter(s => 
  gridDisk(stageH3Cell, 3).includes(latLngToCell(s.lat, s.lng, 9))
);

// Check if user is "at" a venue (same cell or adjacent)
const userCell = latLngToCell(userLat, userLng, 10);  // finer resolution
const venueCell = latLngToCell(venueLat, venueLng, 10);
const isAtVenue = gridRing(venueCell, 1).includes(userCell);  // 1-ring = ~60m
```

### Amplify Storage Strategy

```typescript
// Store venues with H3 index
interface Venue {
  id: string;
  name: string;
  h3Index: string;  // latLngToCell(lat, lng, 9)
  lat: number;
  lng: number;
  category: string;
}

// Query optimization:
// Instead of Haversine distance calculations on every query,
// index by h3Index and use gridDisk for range queries
```

### Benefits
- **Fast lookups**: O(1) index vs O(n) distance scans
- **Consistent boundary**: No edge-case lat/lng issues
- **Hierarchical**: Different zoom levels = different cells
- **Vendor neutral**: Works with any GPS data

---

## 3. Stop Detection Algorithms

### Problem
Detect when a user has "visited" or "stopped at" a venue vs. just walking/driving past it.

### Core Algorithm: Dwell Time Detection

```typescript
interface LocationPoint {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy: number;
}

interface StopEvent {
  venueId?: string;
  startTime: number;
  endTime: number;
  duration: number;
  centroid: { lat: number; lng: number };
}

function detectStops(
  points: LocationPoint[],
  minDwellTimeMs: number = 300000,  // 5 minutes
  maxDistanceKm: number = 0.050      // 50 meters
): StopEvent[] {
  const stops: StopEvent[] = [];
  
  let clusterStart: LocationPoint | null = null;
  let clusterPoints: LocationPoint[] = [];
  
  for (const point of points) {
    if (!clusterStart) {
      clusterStart = point;
      clusterPoints = [point];
      continue;
    }
    
    const distance = haversine(
      clusterStart.lat, clusterStart.lng,
      point.lat, point.lng
    );
    
    if (distance <= maxDistanceKm) {
      // Still in same cluster
      clusterPoints.push(point);
    } else {
      // Check if cluster qualifies as a stop
      const duration = point.timestamp - clusterPoints[0].timestamp;
      if (duration >= minDwellTimeMs) {
        stops.push({
          startTime: clusterPoints[0].timestamp,
          endTime: point.timestamp,
          duration,
          centroid: centroid(clusterPoints)
        });
      }
      // Start new cluster
      clusterStart = point;
      clusterPoints = [point];
    }
  }
  
  return stops;
}

function centroid(points: LocationPoint[]): { lat: number; lng: number } {
  return {
    lat: points.reduce((s, p) => s + p.lat, 0) / points.length,
    lng: points.reduce((s, p) => s + p.lng, 0) / points.length
  };
}
```

### GPS Filtering

```typescript
// Filter out inaccurate points
function filterAccurate(points: LocationPoint[], minAccuracy: number = 50): LocationPoint[] {
  return points.filter(p => p.accuracy <= minAccuracy);
}

// Apply Kalman filter for smoother trajectory
// (Consider using 'kalman-filter' or 'earthjs' libraries)
```

### Venue Matching

```typescript
function matchStopToVenue(
  stop: StopEvent,
  venues: Venue[],
  maxDistanceKm: number = 0.100  // 100m
): Venue | null {
  let closest: Venue | null = null;
  let closestDist = Infinity;
  
  for (const venue of venues) {
    const dist = haversine(
      stop.centroid.lat, stop.centroid.lng,
      venue.lat, venue.lng
    );
    if (dist < closestDist && dist <= maxDistanceKm) {
      closest = venue;
      closestDist = dist;
    }
  }
  
  return closest;
}
```

### Edge Cases & Gotchas

| Issue | Solution |
|-------|----------|
| GPS drift when stationary | Use accuracy filter + max distance threshold |
| Battery drain | Reduce sampling rate (every 30s vs every 5s) |
| False positives (traffic jam) | Require minimum 5-min dwell |
| Multiple venues close together | Match to closest within threshold |
| User walks then returns | Treat as single stop if gap < 5 min |

### Alternative: Geofence-Based (Simpler)

```typescript
// For each venue, define geofence radius
const VENUE_GEOFENCE_RADIUS_M = 50;

function checkGeofence(
  userLat: number,
  userLng: number,
  venue: Venue
): 'enter' | 'exit' | 'outside' {
  const dist = haversine(userLat, userLng, venue.lat, venue.lng);
  if (dist <= VENUE_GEOFENCE_RADIUS_M) return 'enter';
  // Need state tracking for exit detection
  return 'outside';
}
```

---

## Architecture Recommendations for Amplify

### Data Layer
```
venues table:
  - id, name, description, lat, lng
  - h3_index (res 9)
  - foursquare_id (optional)
  - category, tags
  - created_at, updated_at

user_visits table:
  - id, user_id, venue_id
  - entered_at, exited_at, dwell_time_ms
  - method: 'detected' | 'checked_in' | 'geofence'
```

### Query Flow: "Nearby Stages"

```typescript
async function getNearbyStages(lat: number, lng: number, radiusKm: number = 5) {
  // 1. Get H3 cell and k-ring
  const userCell = latLngToCell(lat, lng, 9);
  const k = Math.ceil(radiusKm / 1.8);  // ~1.8km per cell at res 9
  const searchCells = gridDisk(userCell, k);
  
  // 2. Query venues by H3 cells (indexed)
  const stages = await db.query(`
    SELECT * FROM venues 
    WHERE h3_index IN ($1)
    AND category = 'stage'
  `, [searchCells]);
  
  // 3. Re-rank by actual distance
  return stages.sort((a, b) => 
    haversine(lat, lng, a.lat, a.lng) - 
    haversine(lat, lng, b.lat, b.lng)
  );
}
```

### Visit Detection Flow

```
1. Background location every 30s
2. If within 50m of known venue → start/improve cluster
3. If cluster spans 5+ minutes → check against venue list
4. If matched → create visit record
5. Sync to server on connectivity
```

---

## Summary

| Technology | Recommendation | Priority |
|------------|---------------|----------|
| Venue Data | Foursquare free tier + local cache | P1 |
| Spatial Indexing | H3 (res 9 for venues, res 12-15 for precise) | P1 |
| Stop Detection | Dwell time algorithm (5min, 50m threshold) | P2 |
| Geofencing | Supplement to stop detection for "checked in" states | P2 |

Next steps: Build venue sync pipeline, implement H3 indexing on existing venue data, integrate stop detection into location tracking hook.
