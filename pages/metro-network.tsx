import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Head from 'next/head'
import Link from 'next/link'
import Container from '../components/container'
import Layout from '../components/layout'
import Header from '../components/header'
import NetworkTimeline from '../components/network-timeline'
import {
  MILESTONES,
  NETWORK,
  formatDay,
  monthEnd,
  monthIndex,
  totalsAt,
  type NetworkLine,
} from '../lib/metroNetworkData'

const MetroNetworkMap = dynamic(() => import('../components/MetroNetworkMap'), { ssr: false })

type Mode = NetworkLine['mode']

/**
 * Today in IST, derived from the current instant rather than from local
 * calendar fields, so a visitor outside India still sees Lucknow's date.
 */
function istToday(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

const MODE_LABEL: Record<Mode, string> = {
  metro: 'Lucknow Metro',
  suburban: 'Suburban rail',
}

/**
 * The page prerenders to static HTML, so "today" cannot be resolved during
 * render — the build date would be baked into the markup and served for
 * months, silently mis-stating what is open. It is resolved on mount instead,
 * and the explorer below only exists once there is a real date to anchor it
 * to. The map is client-only anyway, so this costs no extra paint.
 */
export default function MetroNetworkPage() {
  const [today, setToday] = useState<string | null>(null)
  useEffect(() => setToday(istToday()), [])

  return (
    <Layout preview={false}>
      <Head>
        <title>Lucknow rail network, month by month | Lucknow Metro &amp; Suburban Rail</title>
        <meta
          name="description"
          content="Every Lucknow Metro and Lucknow Suburban Rail line on one map, with a timeline you can drag from the first 2011 section to the full planned network."
        />
      </Head>
      <Container>
        <Header headerText="Rail network timeline" headerLink="/metro-network" />
        <article className="mb-24">
          <p className="max-w-3xl text-base md:text-lg text-ink-600 mb-6">
            Every Lucknow Metro line and every Lucknow Suburban Rail corridor on one map — what is carrying passengers,
            what is being built, and what is only approved. Drag the timeline to any month between October 2011 and the
            end of the announced programme and the map redraws to that date.
          </p>
          {today ? <NetworkExplorer today={today} /> : <ExplorerSkeleton />}
        </article>
      </Container>
    </Layout>
  )
}

function ExplorerSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="h-24 bg-ink-50 border border-ink-200 rounded-lg mb-6" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2.15fr)_minmax(0,1fr)]">
        <div className="h-[clamp(420px,68vh,760px)] bg-ink-50 border border-ink-200 rounded-lg" />
        <div className="hidden xl:block bg-ink-50 border border-ink-200 rounded-lg" />
      </div>
    </div>
  )
}

function NetworkExplorer({ today }: { today: string }) {
  const todayMonth = useMemo(() => monthIndex(today), [today])

  const [month, setMonth] = useState(todayMonth)
  const [playing, setPlaying] = useState(false)
  const [modes, setModes] = useState<Set<Mode>>(new Set<Mode>(['metro', 'suburban']))
  const [focus, setFocus] = useState<string | null>(null)

  // On the "today" step the real date is used, so a line opening later this
  // month is not counted as already running. Every other step takes the whole
  // month, which is the granularity the dates are announced at anyway.
  const asOf = month === todayMonth ? today : monthEnd(month)
  const isToday = month === todayMonth
  const totals = useMemo(() => totalsAt(asOf, modes), [asOf, modes])

  const toggleMode = (mode: Mode) =>
    setModes((prev) => {
      const next = new Set(prev)
      // Never let both come off — an empty map is a dead end, not a filter.
      if (next.has(mode) && next.size > 1) next.delete(mode)
      else next.add(mode)
      return next
    })

  const visibleLines = NETWORK.filter((l) => modes.has(l.mode))

  const past = MILESTONES.filter((m) => m.date <= asOf && modes.has(m.mode))
  const upcoming = MILESTONES.filter((m) => m.date > asOf && modes.has(m.mode)).slice(0, 5)
  const recent = past.slice(-4).reverse()
  const nextIsHistory = upcoming.length > 0 && upcoming.every((m) => m.dateKind === 'actual')

  return (
    <>
      {/* Timeline, full width — the scale carries 235 months and 25 ticks, so
          it is the element that gains most from a wide viewport. */}
      <div className="mb-6">
        <NetworkTimeline
          month={month}
          onMonthChange={setMonth}
          todayMonth={todayMonth}
          playing={playing}
          onPlayingChange={setPlaying}
        />
      </div>

      {/* Map and its readouts side by side once there is room for both. Below
          xl the rail drops underneath, where it reads as a normal stack. */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,2.15fr)_minmax(0,1fr)] xl:items-start mb-8">
        <MetroNetworkMap
          asOf={asOf}
          modes={modes}
          highlightLineId={focus}
          height="clamp(420px, 68vh, 760px)"
        />

        <aside className="flex flex-col gap-4">
          {/* What that date adds up to */}
          <div className="grid grid-cols-3 gap-2 md:gap-3">
            <Stat value={totals.lines} label="lines" />
            <Stat value={totals.openStations + totals.projectedStations} label="stations" />
            <Stat value={`${(totals.openKm + totals.projectedKm).toFixed(1)}`} label="route km" />
          </div>
          {totals.projectedKm > 0 && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <strong>{totals.projectedKm.toFixed(1)} km and {totals.projectedStations} stations of that have not
              opened.</strong>{' '}
              They are drawn dashed because the only thing that has happened is an announcement. Actually carrying
              passengers on this date: {totals.openKm.toFixed(1)} km, {totals.openStations} stations.
            </p>
          )}
          {isToday && totals.projectedKm === 0 && (
            <p className="text-sm text-ink-600">
              Solid lines are open and running as of {formatDay(today)}. Faint dashes are corridors that exist only on
              paper — drag the timeline forward to see when each is meant to arrive.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(MODE_LABEL) as Mode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => toggleMode(mode)}
                aria-pressed={modes.has(mode)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  modes.has(mode)
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-ink-500 border-ink-300 hover:border-black hover:text-black'
                }`}
              >
                {MODE_LABEL[mode]}
              </button>
            ))}
            {focus && (
              <button
                type="button"
                onClick={() => setFocus(null)}
                className="px-3 py-1.5 rounded-full text-sm font-medium border border-ink-300 bg-white text-black hover:border-black transition-colors"
              >
                Clear highlight
              </button>
            )}
          </div>

          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-2 gap-x-4 gap-y-1">
          {visibleLines.map((line) => {
            const openOnDate = line.segments.some((s) => s.date <= asOf)
            const fullyOpen = line.segments.every((s) => s.date <= asOf)
            return (
              <li key={line.id}>
                <button
                  type="button"
                  onClick={() => setFocus(focus === line.id ? null : line.id)}
                  aria-pressed={focus === line.id}
                  className={`w-full flex items-center gap-2 text-left text-sm py-1 rounded transition-opacity ${
                    focus && focus !== line.id ? 'opacity-40' : ''
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="shrink-0 rounded-sm"
                    style={{
                      width: 16,
                      height: 4,
                      background: line.color,
                      opacity: openOnDate ? 1 : 0.35,
                    }}
                  />
                  <span className={openOnDate ? 'text-ink-900' : 'text-ink-400'}>{line.name}</span>
                  {openOnDate && !fullyOpen && <span className="text-xs text-ink-400">part</span>}
                </button>
              </li>
            )
          })}
          </ul>
        </aside>
      </div>

      {/* The two lists are a before/after pair around the selected date, so
          they get a column each and nothing else shares the row — a collapsed
          panel sitting in a third column just left a band of the page empty. */}
      <div className="grid md:grid-cols-2 gap-8 md:gap-12 mb-8">
        <section>
          <SectionHeading
            title="Most recent openings"
            aside={isToday ? 'as of today' : `as of ${formatDay(asOf)}`}
          />
          {recent.length > 0 ? (
            <ol className="space-y-3">
              {recent.map((m) => (
                <MilestoneRow key={m.id} milestone={m} onFocus={() => setFocus(m.lineId)} />
              ))}
            </ol>
          ) : (
            <p className="text-sm text-ink-500">Nothing had opened yet on this date.</p>
          )}
        </section>

        <section>
          {/* Scrubbed into the past, everything ahead of the cursor is recorded
              history, and calling it "announced" would be nonsense. */}
          <SectionHeading
            title={nextIsHistory ? 'What came next' : 'Next, if the announced dates hold'}
            aside={nextIsHistory ? 'already happened' : undefined}
          />
          {upcoming.length > 0 ? (
            <ol className="space-y-3">
              {upcoming.map((m) => (
                <MilestoneRow
                  key={m.id}
                  milestone={m}
                  onFocus={() => setFocus(m.lineId)}
                  onJump={() => {
                    setPlaying(false)
                    setMonth(monthIndex(m.date))
                  }}
                />
              ))}
            </ol>
          ) : (
            <p className="text-sm text-ink-500">
              Nothing further is announced. This is the whole programme as it currently stands.
            </p>
          )}
        </section>
      </div>

      <MetroRoutePlanner />

      {/* Provenance — what this map can and cannot be trusted for. Full width
          now, with the prose in columns so it fills the row without any single
          line running the whole 1500px. */}
      <details className="border border-ink-200 rounded-lg p-4">
        <summary className="cursor-pointer font-semibold">Where this data comes from, and what it is not</summary>
        <div className="mt-3 text-sm text-ink-600 grid gap-x-10 gap-y-3 md:grid-cols-2 xl:grid-cols-3">
              <p>
                <strong>Operational Red Line</strong> — North-South corridor from CCS Airport to Munshi Pulia (23 km, 21 stations), operating daily since March 2019 under UPMRC.


              </p>
              <p>
                <strong>East-West Blue Line</strong> — 11.1 km corridor connecting Charbagh to Vasant Kunj across 12 stations, approved by Union Cabinet.


              </p>
              <p>
                <strong>Station coordinates</strong> — Station positions are indicative, placed along known corridors and landmarks.


              </p>
              <p>
                <strong>Service Timings</strong> — Trains operate daily from 06:00 AM to 10:00 PM with 5–7 min peak frequency.





              </p>
              <p>
                For a single upcoming line with its countdown and official updates, see the{' '}
                <Link href="/metro-line-count-down" className="underline hover:text-black">
                  metro line countdown
                </Link>
            .
          </p>
        </div>
      </details>
    </>
  )
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="bg-ink-50 border border-ink-200 rounded-lg px-3 py-3 md:py-4 text-center">
      <div className="text-2xl md:text-4xl font-bold leading-none">{value}</div>
      <div className="text-xs md:text-sm uppercase tracking-wide text-ink-500 mt-1">{label}</div>
    </div>
  )
}

function MetroRoutePlanner() {
  const redStations = NETWORK.find(l => l.id === 'red')?.stations ?? []
  const [from, setFrom] = useState('CCS International Airport')
  const [to, setTo] = useState('Hazratganj')

  const fromIdx = redStations.findIndex(s => s.name === from)
  const toIdx = redStations.findIndex(s => s.name === to)
  const stationCount = fromIdx !== -1 && toIdx !== -1 ? Math.abs(toIdx - fromIdx) : 0

  // Official UPMRC fare calculation slabs
  const calculateFare = (stops: number) => {
    if (stops === 0) return 0
    if (stops === 1) return 10
    if (stops === 2) return 15
    if (stops <= 6) return 20
    if (stops <= 9) return 30
    if (stops <= 13) return 40
    if (stops <= 17) return 50
    return 60
  }

  const fare = calculateFare(stationCount)
  const discountedFare = Math.round(fare * 0.9)
  const estMinutes = Math.round(stationCount * 2.25)

  const routeStations =
    fromIdx !== -1 && toIdx !== -1
      ? fromIdx <= toIdx
        ? redStations.slice(fromIdx, toIdx + 1)
        : redStations.slice(toIdx, fromIdx + 1).reverse()
      : []

  const swap = () => {
    setFrom(to)
    setTo(from)
  }

  return (
    <section className="mt-8 mb-8 rounded-xl border border-ink-200 bg-white p-6 md:p-8 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-red-700 bg-red-50 px-2.5 py-1 rounded">
          UPMRC Transit Planner
        </span>
        <span className="text-xs text-ink-500 font-mono">Service: 06:00 AM – 10:00 PM</span>
      </div>
      <h2 className="font-display text-2xl md:text-3xl font-bold text-ink-900 mb-2">
        Lucknow Metro Route & Fare Calculator
      </h2>
      <p className="text-ink-600 text-sm md:text-base mb-6 leading-relaxed">
        Select any two stations on the operational Red Line (North-South Corridor) to calculate fare, travel duration, and station stops.
      </p>

      {/* Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-3 mb-6 bg-ink-50/70 p-4 rounded-lg border border-ink-200">
        <div>
          <label className="block text-xs font-semibold uppercase text-ink-500 mb-1">
            Origin Station
          </label>
          <select
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="w-full rounded-md border border-ink-300 bg-white p-2.5 text-sm font-semibold text-ink-800 shadow-sm focus:border-red-600 focus:outline-none"
          >
            {redStations.map(s => (
              <option key={`from-${s.name}`} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={swap}
          title="Swap stations"
          className="self-center mt-3 md:mt-4 p-2 rounded-full border border-ink-300 bg-white text-ink-600 hover:bg-ink-100 transition-colors shadow-sm"
        >
          ⇄
        </button>

        <div>
          <label className="block text-xs font-semibold uppercase text-ink-500 mb-1">
            Destination Station
          </label>
          <select
            value={to}
            onChange={e => setTo(e.target.value)}
            className="w-full rounded-md border border-ink-300 bg-white p-2.5 text-sm font-semibold text-ink-800 shadow-sm focus:border-red-600 focus:outline-none"
          >
            {redStations.map(s => (
              <option key={`to-${s.name}`} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {from === to ? (
        <div className="p-4 bg-ink-50 rounded-lg text-sm text-ink-500 text-center">
          Please select two different stations to calculate fare and route.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="rounded-lg border border-red-100 bg-red-50/50 p-4 text-center">
            <span className="block text-xs uppercase text-red-700 font-semibold tracking-wide">
              Token Fare
            </span>
            <span className="block text-3xl font-display font-bold text-red-700 mt-1">
              ₹{fare}
            </span>
            <span className="text-[11px] text-red-600">Standard single journey</span>
          </div>

          <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-4 text-center">
            <span className="block text-xs uppercase text-emerald-700 font-semibold tracking-wide">
              GoSmart Card
            </span>
            <span className="block text-3xl font-display font-bold text-emerald-700 mt-1">
              ₹{discountedFare}
            </span>
            <span className="text-[11px] text-emerald-600">10% smart card discount</span>
          </div>

          <div className="rounded-lg border border-ink-200 bg-ink-50/60 p-4 text-center">
            <span className="block text-xs uppercase text-ink-500 font-semibold tracking-wide">
              Est. Travel Time
            </span>
            <span className="block text-3xl font-display font-bold text-ink-900 mt-1">
              ~{estMinutes} min
            </span>
            <span className="text-[11px] text-ink-500">Average dwell included</span>
          </div>

          <div className="rounded-lg border border-ink-200 bg-ink-50/60 p-4 text-center">
            <span className="block text-xs uppercase text-ink-500 font-semibold tracking-wide">
              Station Stops
            </span>
            <span className="block text-3xl font-display font-bold text-ink-900 mt-1">
              {stationCount}
            </span>
            <span className="text-[11px] text-ink-500">Red Line direct corridor</span>
          </div>
        </div>
      )}

      {/* Route stations timeline display */}
      {routeStations.length > 0 && from !== to && (
        <div className="mt-4 pt-4 border-t border-ink-200">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-3">
            Route Stops ({routeStations.length} stations)
          </h4>
          <div className="flex flex-wrap items-center gap-2">
            {routeStations.map((st, i) => (
              <span key={st.name} className="inline-flex items-center text-xs">
                <span
                  className={`px-2.5 py-1 rounded font-medium ${
                    i === 0 || i === routeStations.length - 1
                      ? 'bg-red-700 text-white font-bold'
                      : 'bg-ink-100 text-ink-800'
                  }`}
                >
                  {st.name}
                  {st.interchange && <span className="ml-1 text-[10px] opacity-80">⇄</span>}
                </span>
                {i < routeStations.length - 1 && (
                  <span className="mx-1 text-ink-400">→</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function SectionHeading({ title, aside }: { title: string; aside?: string }) {
  return (
    <h3 className="text-lg font-semibold mb-3 flex flex-wrap items-baseline gap-x-2">
      {title}
      {aside && <span className="text-sm font-normal text-ink-400">{aside}</span>}
    </h3>
  )
}

/**
 * One opening event. The date moves into a fixed gutter and the line colour
 * becomes a spine down the side, which does two things: dates line up so the
 * list can be scanned vertically, and the four stacked text blocks stop
 * competing at the same weight — date, then title, then a single dim meta
 * line, then the caveat.
 */
function MilestoneRow({
  milestone,
  onFocus,
  onJump,
}: {
  milestone: (typeof MILESTONES)[number]
  onFocus: () => void
  onJump?: () => void
}) {
  const provisional = milestone.dateKind !== 'actual'
  const [day, mon, year] = formatDay(milestone.date).split(' ')

  return (
    <li className="grid grid-cols-[3.5rem_1fr] gap-x-3">
      <div className="text-right pt-0.5">
        {onJump ? (
          <button
            type="button"
            onClick={onJump}
            className="block w-full text-right leading-tight hover:text-black"
            title={`Jump the timeline to ${formatDay(milestone.date)}`}
          >
            <DateStack day={day} mon={mon} year={year} />
          </button>
        ) : (
          <DateStack day={day} mon={mon} year={year} />
        )}
        {provisional && (
          <span className="block text-[10px] leading-tight text-amber-700 mt-0.5">
            {milestone.dateKind === 'target' ? 'target' : 'estimate'}
          </span>
        )}
      </div>

      <div className="min-w-0 border-l-2 pl-3 pb-0.5" style={{ borderColor: milestone.lineColor }}>
        <button
          type="button"
          onClick={onFocus}
          className="text-left font-medium leading-snug hover:underline"
          title={`Highlight the ${milestone.lineName} on the map`}
        >
          {milestone.label}
        </button>
        <div className="text-xs text-ink-500 mt-0.5">
          {milestone.lineName} · {milestone.stationCount} station{milestone.stationCount === 1 ? '' : 's'}
          {milestone.lengthKm ? ` · ${milestone.lengthKm} km` : ''}
        </div>
        {milestone.note && <p className="text-xs text-ink-400 leading-snug mt-1">{milestone.note}</p>}
      </div>
    </li>
  )
}

function DateStack({ day, mon, year }: { day: string; mon: string; year: string }) {
  return (
    <>
      <span className="block text-sm font-medium tabular-nums leading-tight text-ink-700">
        {day} {mon}
      </span>
      <span className="block text-xs tabular-nums leading-tight text-ink-400">{year}</span>
    </>
  )
}
