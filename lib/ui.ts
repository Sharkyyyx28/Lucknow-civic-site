// Shared field/button styling for the site's forms: square corners, neutral
// borders, black primary action. Mirrors what pages/profile.tsx uses inline.

export const INPUT =
  'w-full border border-neutral-300 px-3 py-2 duration-200 transition-colors focus:outline-none focus:border-black'
export const PRIMARY_BTN =
  'bg-black hover:bg-white hover:text-black border border-black text-white font-bold py-2 px-6 duration-200 transition-colors disabled:opacity-40 disabled:pointer-events-none'
export const SMALL_BTN =
  'bg-black hover:bg-white hover:text-black border border-black text-white text-sm font-bold py-1.5 px-4 duration-200 transition-colors disabled:opacity-40 disabled:pointer-events-none'
export const QUIET_BTN = 'text-sm text-neutral-500 hover:text-black hover:underline'
export const INLINE_BTN =
  'shrink-0 flex items-center gap-1 text-xs text-neutral-600 hover:text-black hover:underline disabled:opacity-40 whitespace-nowrap'
