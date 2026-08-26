// Per-line station lists for the countdown page's single-line route map.
//
// These come from lib/metroNetworkData.ts, which holds the whole network —
// both lines, split into dated segments — so the countdown page and the
// network map cannot drift apart on where a station is or what it
// interchanges with. Every coordinate here is indicative (hand-placed, not
// surveyed) — see the header comment in metroNetworkData.ts.

import { lineById, type NetworkStation } from './metroNetworkData'

export type RouteStation = NetworkStation

export const RED_LINE_STATIONS: RouteStation[] = lineById('red').stations
export const BLUE_LINE_STATIONS: RouteStation[] = lineById('blue').stations
