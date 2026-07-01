import { useSyncExternalStore } from 'react'
import { getLocation, subscribe, type VisitorCoords } from './visitorLocation'

export function useVisitorLocation(): VisitorCoords {
  return useSyncExternalStore(subscribe, getLocation, getLocation)
}