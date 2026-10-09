// The things a visitor can actually do on this site. Both the landing page's
// "what brings you here" picker and its tool directory read from this list, so
// a new tool only has to be described once.
//
// Two tools from the Bengaluru build were cut for Lucknow rather than kept
// broken: the pincode↔ward lookup (needs a ward-to-pincode CSV Lucknow has no
// equivalent of) and the road data browser (needs a ward-level road register
// Lucknow has no equivalent of). See BUILD-NOTES.md.

export type Tool = {
  id: string
  name: string
  href: string
  blurb: string
  cta: string
}

export const TOOLS: Tool[] = [
  {
    id: 'map',
    name: 'Map explorer',
    href: '/map',
    blurb:
      'An interactive map with the Lucknow Municipal Corporation boundary. Ward-level boundaries are not yet available — see the "Where this comes from" notes on the map page. It can also locate you.',
    cta: 'Open the map',
  },
  {
    id: 'officials',
    name: 'Officials directory',
    href: '/officials',
    blurb:
      'Who represents Lucknow — the MLA for each of the 9 assembly constituencies, and the Mayor.',
    cta: 'Find a representative',
  },
  {
    id: 'find-my-ward',
    name: 'Find my ward & corporator',
    href: '/find-my-ward',
    blurb:
      'Enter any Lucknow address, locality or landmark to instantly discover your municipal ward, elected corporator, MLA constituency and civic details.',
    cta: 'Look up your ward',
  },
  {
    id: 'rail-network',
    name: 'Rail network timeline',
    href: '/metro-network',
    blurb:
      'Lucknow Metro on one map, with a timeline you can drag — from the 2017 opening of the Red Line to what is announced for the Blue Line.',
    cta: 'Open the timeline',
  },
  {
    id: 'neighbourhood',
    name: 'Your neighbourhood',
    href: '/profile',
    blurb:
      'Save the places you care about and see the hospitals, parks, schools and police or fire stations closest to each one. Needs a sign-in.',
    cta: 'Set up your places',
  },
  {
    id: 'community',
    name: 'Community posts',
    href: '/community',
    blurb:
      'What residents are reporting about their streets — a road that needs repair, a park worth visiting, a footpath that finally got fixed.',
    cta: 'Read the feed',
  },
  {
    id: 'social-handles',
    name: 'Social handles directory',
    href: '/social-handles',
    blurb:
      'Government accounts, NGOs, civic voices and media actively working on Lucknow — who to follow for transit, waste and civic governance.',
    cta: 'Browse the directory',
  },
  {
    id: 'about',
    name: 'About this project',
    href: '/posts/about-lucknow',
    blurb:
      'What this site is, why it exists, and which datasets sit behind each tool — including what was cut going from the Bengaluru original to this Lucknow build.',
    cta: 'Read the background',
  },
]

export type NavLink = { label: string; href: string }
export type NavGroup = { label: string; items: NavLink[] }
export type NavEntry = NavLink | NavGroup

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return 'items' in entry
}

export const NAV_LINKS: NavEntry[] = [
  { label: 'Map', href: '/map' },
  { label: 'Find My Ward', href: '/find-my-ward' },
  { label: 'Community', href: '/community' },
  { label: 'Officials', href: '/officials' },
  {
    label: 'Data',
    items: [{ label: 'Social handles', href: '/social-handles' }],
  },
  {
    label: 'Transit',
    items: [
      { label: 'Rail network', href: '/metro-network' },
      { label: 'Metro Countdown', href: '/metro-line-count-down' },
    ],
  },
]

export type Intent = {
  id: string
  label: string
  answer: string
  primary: string
  secondary?: string
}

export const INTENTS: Intent[] = [
  {
    id: 'find-my-ward',
    label: 'I want to know which ward I live in',
    answer:
      'Look up any Lucknow address or landmark to instantly find your municipal ward, corporator, and Vidhan Sabha MLA.',
    primary: 'find-my-ward',
    secondary: 'officials',
  },
  {
    id: 'where-am-i',
    label: 'I want to see where I am on the map',
    answer:
      'Open the map and use "Locate me" — it will centre on your position within the Lucknow Municipal Corporation boundary.',
    primary: 'map',
    secondary: 'officials',
  },
  {
    id: 'complain',
    label: 'I need to reach my representative',
    answer:
      'The officials directory lists the MLA for each of Lucknow\'s 9 assembly constituencies, and the Mayor.',
    primary: 'officials',
    secondary: 'map',
  },
  {
    id: 'neighbourhood',
    label: 'I want to keep track of my neighbourhood',
    answer:
      'Save a home or office pin and the site will keep the nearby hospitals, parks, schools and safety services alongside it.',
    primary: 'neighbourhood',
    secondary: 'map',
  },
  {
    id: 'rail',
    label: 'I want to know about the metro',
    answer:
      'The rail network timeline shows the Red Line (operational since 2017) and the Blue Line (under construction), with what each announced date would add.',
    primary: 'rail-network',
    secondary: 'map',
  },
  {
    id: 'community',
    label: 'I want to report or read about something local',
    answer:
      'The community feed carries posts pinned to a spot on the map — read what your area is reporting, or write your own.',
    primary: 'community',
    secondary: 'neighbourhood',
  },
  {
    id: 'browsing',
    label: 'Just having a look around',
    answer:
      'Start with the background on what this project is and what data it has for Lucknow so far — or jump straight onto the map.',
    primary: 'about',
    secondary: 'map',
  },
]

export function toolById(id: string): Tool {
  const tool = TOOLS.find(t => t.id === id)
  if (!tool) throw new Error(`Unknown tool id: ${id}`)
  return tool
}
