/**
 * Tiny module-scoped observer store for the visitor's location, shared between
 * the "Find Your Scene" search module and the marketplace rail so both stay in
 * sync without threading React context through the whole landing page.
 *
 * Write from FindYourScene (via setLocation), read from MarketplaceRail (via
 * useLocationState hook). Persists across the landing page session only — not
 * stored anywhere; cleared on full page reload.
 */

export interface VisitorCoords {
  lat: number | null
  lng: number | null
  radius_km: number
}

type Listener = (coords: VisitorCoords) => void

let state: VisitorCoords = { lat: null, lng: null, radius_km: 25 }
const listeners = new Set<Listener>()

export function setLocation(coords: Partial<VisitorCoords>): void {
  state = { ...state, ...coords }
  for (const l of listeners) l(state)
}

export function getLocation(): VisitorCoords {
  return state
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  listener(state)
  return () => {
    listeners.delete(listener)
  }
}