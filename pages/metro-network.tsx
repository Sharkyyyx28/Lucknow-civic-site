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
          <p className="max-w-3xl text-base md:text-lg text-gray-600 mb-6">
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
      <div className="h-24 bg-gray-50 border border-gray-200 rounded-lg mb-6" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2.15fr)_minmax(0,1fr)]">
        <div className="h-[clamp(420px,68vh,760px)] bg-gray-50 border border-gray-200 rounded-lg" />
        <div className="hidden xl:block bg-gray-50 border border-gray-200 rounded-lg" />
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
            <p className="text-sm text-gray-600">
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
                    : 'bg-white text-gray-500 border-gray-300 hover:border-black hover:text-black'
                }`}
              >
                {MODE_LABEL[mode]}
              </button>
            ))}
            {focus && (
              <button
                type="button"
                onClick={() => setFocus(null)}
                className="px-3 py-1.5 rounded-full text-sm font-medium border border-gray-300 bg-white text-black hover:border-black transition-colors"
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
                  <span className={openOnDate ? 'text-gray-900' : 'text-gray-400'}>{line.name}</span>
                  {openOnDate && !fullyOpen && <span className="text-xs text-gray-400">part</span>}
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
            <p className="text-sm text-gray-500">Nothing had opened yet on this date.</p>
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
            <p className="text-sm text-gray-500">
              Nothing further is announced. This is the whole programme as it currently stands.
            </p>
          )}
        </section>
      </div>

      {/* Provenance — what this map can and cannot be trusted for. Full width
          now, with the prose in columns so it fills the row without any single
          line running the whole 1500px. */}
      <details className="border border-gray-200 rounded-lg p-4">
        <summary className="cursor-pointer font-semibold">Where this data comes from, and what it is not</summary>
        <div className="mt-3 text-sm text-gray-600 grid gap-x-10 gap-y-3 md:grid-cols-2 xl:grid-cols-3">
              <p>
                <strong>Operational lines</strong> — Purple, Green and Yellow station positions come from
                OpenStreetMap route relations, so they are real surveyed locations. Their opening dates are recorded
                events.
              </p>
              <p>
                <strong>Suburban rail</strong> corridors run on existing Indian Railways alignments, so those station
                positions are real too — but only the major stations are shown. BSRP adds halts between them that have
                no published position yet.
              </p>
              <p>
                <strong>Unbuilt metro lines</strong> — Pink, Blue, Red, Orange and Grey — are drawn from BMRCL&rsquo;s
                published station names placed by landmark along the announced corridor. No detailed alignment survey
                is public, so treat the shape as &ldquo;roughly here&rdquo;, not as an engineering drawing.
              </p>
              <p>
                <strong>Future dates are claims, not facts.</strong> Only the two Pink Line stretches and the Blue
                Line&rsquo;s ORR section carry an operator target — everything else is a press or analyst figure, and
                several of those sources disagree with each other. Where they do, the disagreement is written onto the
                milestone rather than quietly resolved. Nothing here has a CMRS clearance behind it except the lines
                already running, and the Pink Line alone has already slipped from May to July to August to September
                2026.
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
    <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 md:py-4 text-center">
      <div className="text-2xl md:text-4xl font-bold leading-none">{value}</div>
      <div className="text-xs md:text-sm uppercase tracking-wide text-gray-500 mt-1">{label}</div>
    </div>
  )
}

function SectionHeading({ title, aside }: { title: string; aside?: string }) {
  return (
    <h3 className="text-lg font-semibold mb-3 flex flex-wrap items-baseline gap-x-2">
      {title}
      {aside && <span className="text-sm font-normal text-gray-400">{aside}</span>}
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
        <div className="text-xs text-gray-500 mt-0.5">
          {milestone.lineName} · {milestone.stationCount} station{milestone.stationCount === 1 ? '' : 's'}
          {milestone.lengthKm ? ` · ${milestone.lengthKm} km` : ''}
        </div>
        {milestone.note && <p className="text-xs text-gray-400 leading-snug mt-1">{milestone.note}</p>}
      </div>
    </li>
  )
}

function DateStack({ day, mon, year }: { day: string; mon: string; year: string }) {
  return (
    <>
      <span className="block text-sm font-medium tabular-nums leading-tight text-gray-700">
        {day} {mon}
      </span>
      <span className="block text-xs tabular-nums leading-tight text-gray-400">{year}</span>
    </>
  )
}
