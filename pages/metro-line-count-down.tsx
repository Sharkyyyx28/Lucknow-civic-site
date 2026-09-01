import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import Container from '../components/container';
import Layout from '../components/layout';
import Header from '../components/header';
import { RED_LINE_STATIONS, BLUE_LINE_STATIONS, type RouteStation } from '../lib/metroRouteData';

const MetroLineRouteMap = dynamic(() => import('../components/MetroLineRouteMap'), { ssr: false });

type MetroLine = {
  id: 'red' | 'blue';
  name: string;
  targetDate: Date;
  targetDateLabel: string;
  provisional: boolean;
  note: string;
};

// Red Line: operational since 9 March 2019 (full 23 km line, CCS Airport to
// Munshi Pulia) — the countdown below is decorative for this line since it
// has already opened, kept only so the picker/route-map UI works the same
// way for both lines.
//
// Blue Line: East-West Corridor, Charbagh–Vasant Kunj (11.1 km, 12 stations).
// Approved by the state government in January 2024 and cleared by the Union
// Cabinet in August 2025 at roughly ₹5,881 crore. No CMRS-cleared opening
// date exists yet — sources disagree between 2027 (several metro-tracking
// sites) and 2029 (reporting around the Cabinet approval). The date below is
// an unofficial placeholder, not a commitment from Lucknow Metro Rail
// Corporation.
const METRO_LINES: MetroLine[] = [
  {
    id: 'red',
    name: 'Red Line',
    targetDate: new Date('2019-03-08T00:00:00+05:30'),
    targetDateLabel: 'March 9th, 2019',
    provisional: false,
    note: 'The Red Line has been fully operational since March 2019 — the priority section (Transport Nagar–Charbagh) opened first, in September 2017. This countdown page exists mainly for the Blue Line; the Red Line is shown here for comparison.',
  },
  {
    id: 'blue',
    name: 'Blue Line',
    targetDate: new Date('2029-12-31T00:00:00+05:30'),
    targetDateLabel: 'end of 2029 (unofficial estimate)',
    provisional: true,
    note: 'East-West Corridor connecting Charbagh to Vasant Kunj via old Lucknow. Approved by the Union Cabinet in August 2025. No CMRS-cleared opening date exists — some sources estimate 2027, others (closer to the Cabinet approval reporting) point to 2029. This date is an unofficial placeholder, not a confirmed commitment.',
  },
];

const LINE_THEME: Record<MetroLine['id'], { chipActive: string; chipHover: string; box: string; accentText: string; hex: string }> = {
  red: {
    chipActive: 'bg-red-600 text-white border-red-600',
    chipHover: 'hover:border-red-600 hover:text-red-600',
    box: 'bg-red-600',
    accentText: 'text-red-600',
    hex: '#dc2626',
  },
  blue: {
    chipActive: 'bg-blue-600 text-white border-blue-600',
    chipHover: 'hover:border-blue-600 hover:text-blue-600',
    box: 'bg-blue-600',
    accentText: 'text-blue-600',
    hex: '#2563eb',
  },
};

const ROUTE_STATIONS: Record<MetroLine['id'], RouteStation[]> = {
  red: RED_LINE_STATIONS,
  blue: BLUE_LINE_STATIONS,
};

const useCountdown = (targetDate: Date) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return timeLeft;
};

const CountdownTimer = ({ line }: { line: MetroLine }) => {
  const timeLeft = useCountdown(line.targetDate);
  const theme = LINE_THEME[line.id];
  const isPast = line.targetDate.getTime() <= Date.now();

  return (
    <div className="text-center my-6 md:my-10">
      <h2 className={`text-2xl md:text-3xl font-bold mb-4 md:mb-8 ${theme.accentText}`}>
        {isPast ? `${line.name} — Already Open` : `Countdown to ${line.name} Opening`}
      </h2>
      {!isPast && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 max-w-xs sm:max-w-md md:max-w-3xl mx-auto">
          <div className={`${theme.box} text-white p-3 md:p-6 rounded-lg shadow-lg`}>
            <div className="text-3xl md:text-5xl font-bold">{timeLeft.days}</div>
            <div className="text-xs md:text-sm uppercase tracking-wide mt-1 md:mt-2">Days</div>
          </div>
          <div className={`${theme.box} text-white p-3 md:p-6 rounded-lg shadow-lg`}>
            <div className="text-3xl md:text-5xl font-bold">{timeLeft.hours}</div>
            <div className="text-xs md:text-sm uppercase tracking-wide mt-1 md:mt-2">Hours</div>
          </div>
          <div className={`${theme.box} text-white p-3 md:p-6 rounded-lg shadow-lg`}>
            <div className="text-3xl md:text-5xl font-bold">{timeLeft.minutes}</div>
            <div className="text-xs md:text-sm uppercase tracking-wide mt-1 md:mt-2">Minutes</div>
          </div>
          <div className={`${theme.box} text-white p-3 md:p-6 rounded-lg shadow-lg`}>
            <div className="text-3xl md:text-5xl font-bold">{timeLeft.seconds}</div>
            <div className="text-xs md:text-sm uppercase tracking-wide mt-1 md:mt-2">Seconds</div>
          </div>
        </div>
      )}
      <p className="text-base md:text-lg mt-3 md:mt-4 text-ink-600">
        {isPast ? `Opened ${line.targetDateLabel}` : `Until ${line.targetDateLabel}`}
        {line.provisional && (
          <span className="block text-xs md:text-sm text-ink-400 mt-1">Unofficial estimate — not a confirmed LMRC date</span>
        )}
      </p>
      <p className="text-sm md:text-base mt-3 md:mt-4 max-w-2xl mx-auto text-ink-600">{line.note}</p>
    </div>
  );
};

const MetroLineCountdown = () => {
  const [activeLineId, setActiveLineId] = useState<MetroLine['id']>('blue');
  const activeLine = METRO_LINES.find((line) => line.id === activeLineId) ?? METRO_LINES[0];

  return (
    <Layout preview={false}>
      <Head>
        <title>Red &amp; Blue Line Metro Countdown | Lucknow</title>
      </Head>
      <Container>
        <Header headerText="Metro Line Countdown" headerLink="/metro-line-count-down" />
        <article className="mb-32">
          {/* Line picker */}
          <div className="flex justify-center gap-3 mb-6 md:mb-10">
            {METRO_LINES.map((line) => {
              const theme = LINE_THEME[line.id];
              return (
                <button
                  key={line.id}
                  type="button"
                  onClick={() => setActiveLineId(line.id)}
                  className={`px-4 py-2 rounded-full text-sm md:text-base font-medium border transition-colors ${
                    activeLineId === line.id
                      ? theme.chipActive
                      : `bg-white text-black border-ink-300 ${theme.chipHover}`
                  }`}
                >
                  {line.name}
                </button>
              );
            })}
          </div>

          {/* Countdown Timer */}
          <div className="max-w-4xl mx-auto mb-8 md:mb-16">
            <CountdownTimer line={activeLine} />
          </div>

          {/* Route Map */}
          <div className="max-w-4xl mx-auto px-3 md:px-0 mb-8 md:mb-16">
            <h3 className="text-lg md:text-xl font-semibold mb-2 text-center">{activeLine.name} Route</h3>
            <p className="text-sm md:text-base text-center text-ink-500 max-w-2xl mx-auto mb-4">
              Click a station marker to see its name and any interchange. Positions are hand-placed
              along the known corridor, not a surveyed alignment — see the map page for the full caveat.
            </p>
            <MetroLineRouteMap
              key={activeLine.id}
              stations={ROUTE_STATIONS[activeLine.id]}
              color={LINE_THEME[activeLine.id].hex}
            />
            <details className="mt-4 max-w-2xl mx-auto">
              <summary className={`cursor-pointer text-sm md:text-base text-center text-ink-600 ${LINE_THEME[activeLine.id].chipHover}`}>
                View all {ROUTE_STATIONS[activeLine.id].length} stations
              </summary>
              <ol className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-sm text-ink-600 list-decimal list-inside">
                {ROUTE_STATIONS[activeLine.id].map((station) => (
                  <li key={station.name}>
                    {station.name}
                    {station.interchange && <span className="text-ink-400"> ({station.interchange})</span>}
                  </li>
                ))}
              </ol>
            </details>
          </div>
        </article>
      </Container>
    </Layout>
  );
};

export default MetroLineCountdown;
