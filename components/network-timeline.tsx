import { useEffect, useMemo, useRef } from 'react'
import {
  FIRST_MONTH,
  LAST_MONTH,
  MILESTONES,
  formatDay,
  formatMonth,
  monthIndex,
  type Milestone,
} from '../lib/metroNetworkData'

// A month-stepping scrubber over the whole network history and its announced
// future, with every opening event marked as a point on the scale. Months are
// the step unit rather than days: openings are announced by month, and 235
// months is a comfortable drag range where 7,000 days would not be.

const SPAN = LAST_MONTH - FIRST_MONTH

export function pctForMonth(month: number): number {
  return ((month - FIRST_MONTH) / SPAN) * 100
}

export type MonthGroup = {
  month: number
  pct: number
  milestones: Milestone[]
  /** True once every milestone in the group is a recorded opening. */
  historic: boolean
}

/**
 * Milestones collapsed by month. Several openings share a date — the two
 * Purple Line segments of 9 October 2023, all three Phase 3 lines at the
 * May 2031 horizon — and drawn individually they would sit on top of each
 * other as one indistinguishable tick.
 */
export const MONTH_GROUPS: MonthGroup[] = (() => {
  const byMonth = new Map<number, Milestone[]>()
  for (const m of MILESTONES) {
    const key = monthIndex(m.date)
    const list = byMonth.get(key)
    list ? list.push(m) : byMonth.set(key, [m])
  }
  return Array.from(byMonth.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([month, milestones]) => ({
      month,
      pct: pctForMonth(month),
      milestones,
      historic: milestones.every((m) => m.dateKind === 'actual'),
    }))
})()

/** Every January that falls inside the scale, for the year rule beneath it. */
const YEARS: Array<{ year: number; pct: number }> = (() => {
  const out: Array<{ year: number; pct: number }> = []
  const firstYear = Math.ceil(FIRST_MONTH / 12)
  const lastYear = Math.floor(LAST_MONTH / 12)
  for (let year = firstYear; year <= lastYear; year++) {
    out.push({ year, pct: pctForMonth(year * 12) })
  }
  return out
})()

export default function NetworkTimeline({
  month,
  onMonthChange,
  todayMonth,
  playing,
  onPlayingChange,
}: {
  month: number
  onMonthChange: (month: number) => void
  todayMonth: number
  playing: boolean
  onPlayingChange: (playing: boolean) => void
}) {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  // Playback walks the scale a month at a time and stops at the end rather
  // than looping, so it finishes on the full built-out network.
  useEffect(() => {
    if (!playing) return
    timer.current = setInterval(() => {
      onMonthChange(month >= LAST_MONTH ? LAST_MONTH : month + 1)
    }, 110)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [playing, month, onMonthChange])

  useEffect(() => {
    if (month >= LAST_MONTH && playing) onPlayingChange(false)
  }, [month, playing, onPlayingChange])

  const todayPct = useMemo(() => pctForMonth(todayMonth), [todayMonth])
  const nearest = useMemo(
    () =>
      MONTH_GROUPS.reduce((best, g) =>
        Math.abs(g.month - month) < Math.abs(best.month - month) ? g : best,
      ),
    [month],
  )

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button
          type="button"
          onClick={() => {
            onPlayingChange(false)
            onMonthChange(todayMonth)
          }}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            month === todayMonth
              ? 'bg-black text-white border-black'
              : 'bg-white text-black border-ink-300 hover:border-black'
          }`}
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => {
            if (month >= LAST_MONTH) onMonthChange(FIRST_MONTH)
            onPlayingChange(!playing)
          }}
          className="px-3 py-1.5 rounded-full text-sm font-medium border border-ink-300 bg-white text-black hover:border-black transition-colors"
          aria-label={playing ? 'Pause the timeline' : 'Play the timeline from here'}
        >
          {playing ? '❙❙ Pause' : '▶ Play'}
        </button>
        <button
          type="button"
          onClick={() => {
            onPlayingChange(false)
            onMonthChange(FIRST_MONTH)
          }}
          className="px-3 py-1.5 rounded-full text-sm font-medium border border-ink-300 bg-white text-black hover:border-black transition-colors"
        >
          ⏮ 2011
        </button>

        {/* Reserved to fit the longest month label ("September 2031") at both
            font sizes. Without a stable width here, playback swings between
            e.g. "May 2031" and "September 2023" every tick, which nudges this
            row across the flex-wrap threshold on narrow phones and makes the
            whole page hop as it flips between one line and two. */}
        <div className="ml-auto text-right min-w-[160px] md:min-w-[210px]">
          <div className="text-lg md:text-2xl font-bold leading-tight">{formatMonth(monthLabel(month))}</div>
          <div className="text-xs text-ink-500">
            {month === todayMonth ? 'the network as it stands today' : month < todayMonth ? 'looking back' : 'looking ahead'}
          </div>
        </div>
      </div>

      {/* Scale. The tick strip sits above the input rather than inside it, so
          native range behaviour (keyboard, touch drag) is left untouched. */}
      <div className="relative pt-6 pb-1">
        <div className="absolute inset-x-0 top-0 h-6" aria-hidden="true">
          {MONTH_GROUPS.map((g) => (
            <button
              key={g.month}
              type="button"
              tabIndex={-1}
              onClick={() => {
                onPlayingChange(false)
                onMonthChange(g.month)
              }}
              title={g.milestones.map((m) => `${m.lineName}: ${m.label} (${formatDay(m.date)})`).join('\n')}
              className="absolute bottom-0 -translate-x-1/2 cursor-pointer"
              style={{ left: `${g.pct}%` }}
            >
              <span
                className="block rounded-sm"
                style={{
                  width: 3,
                  height: g.milestones.length > 1 ? 18 : 12,
                  background: g.milestones[0].lineColor,
                  opacity: g.month <= month ? 1 : 0.4,
                }}
              />
            </button>
          ))}
          {/* Where "now" falls on the scale, so the past/future split is visible. */}
          <span
            className="absolute bottom-0 -translate-x-1/2 border-l-2 border-dashed border-ink-900"
            style={{ left: `${todayPct}%`, height: 24 }}
          />
          <span
            className="absolute -translate-x-1/2 text-[10px] font-semibold text-ink-900"
            style={{ left: `${todayPct}%`, top: -2 }}
          >
            now
          </span>
        </div>

        <input
          type="range"
          min={FIRST_MONTH}
          max={LAST_MONTH}
          step={1}
          value={month}
          onChange={(e) => {
            onPlayingChange(false)
            onMonthChange(Number(e.target.value))
          }}
          className="w-full accent-black cursor-pointer"
          aria-label="Show the network as it stood, or is expected to stand, in this month"
          aria-valuetext={formatMonth(monthLabel(month))}
        />

        {/* Year scale. Every year gets a rule; five-year marks are always
            labelled and the rest fill in once the viewport is wide enough to
            hold them without the labels colliding. */}
        <div className="relative h-8 mt-1" aria-hidden="true">
          {YEARS.map(({ year, pct }) => (
            <span key={year} className="absolute top-0 -translate-x-1/2" style={{ left: `${pct}%` }}>
              <span
                className="block mx-auto bg-ink-300"
                style={{ width: 1, height: year % 5 === 0 ? 8 : 4 }}
              />
              <span
                className={`block text-[10px] leading-none mt-0.5 ${
                  year % 5 === 0 ? 'text-ink-600 font-medium' : 'text-ink-400 hidden xl:block'
                }`}
              >
                {year % 5 === 0 ? year : `’${String(year).slice(2)}`}
              </span>
            </span>
          ))}
        </div>
      </div>

      <p className="text-xs text-ink-500 mt-1">
        Each tick is an opening. Taller ticks are months where more than one stretch opens. Drag past{' '}
        <span className="font-semibold text-ink-700">now</span> and the map switches to what has been announced — dates
        no one has yet delivered.{' '}
        <span className="whitespace-nowrap">
          Nearest event: {nearest.milestones[0].lineName}, {formatDay(nearest.milestones[0].date)}.
        </span>
      </p>
    </div>
  )
}

/** Month index -> an ISO-ish string the formatters accept. */
function monthLabel(month: number): string {
  const y = Math.floor(month / 12)
  const m = (month % 12) + 1
  return `${y}-${String(m).padStart(2, '0')}-01`
}
