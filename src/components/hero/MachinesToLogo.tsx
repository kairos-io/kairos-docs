import type {CSSProperties, ReactNode} from 'react';
import {useEffect, useRef} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';

import styles from './MachinesToLogo.module.css';

// Coordinates are those of static/img/kairos-horizontal-dark.svg (355 x 132).
// The stage adds room above and below it for the machines to start in.
const VIEW_BOX = '0 -62 355 256';

type Point = [number, number];

// Faces of one cube, relative to its centre.
const TOP: Point[] = [[0, -24.76], [-21.44, -12.38], [0, 0], [21.44, -12.38]];
const LEFT: Point[] = [[-21.44, -12.38], [-21.44, 12.38], [0, 24.76], [0, 0]];
const RIGHT: Point[] = [[0, 0], [0, 24.76], [21.44, 12.38], [21.44, -12.38]];
const UPPER_LEFT: Point[] = [[0, -24.76], [-21.44, -12.38], [-21.44, 12.38], [0, 0]];
const UPPER_RIGHT: Point[] = [[0, -24.76], [0, 0], [21.44, 12.38], [21.44, -12.38]];
const BOTTOM: Point[] = [[0, 0], [-21.44, 12.38], [0, 24.76], [21.44, 12.38]];

const DARK = '#ee5007';
const MID = '#ff7442';
const LIGHT = '#fb9e70';
const INK = '#03153a';
const WHITE = '#fff';

type Face = [Point[], string];

const outline = (fill: string) => ({fill, stroke: INK, strokeWidth: 4, strokeLinejoin: 'round' as const});

type Machine = {
  name: string;
  start: Point;
  cube: Point;
  faces: Face[];
  icon: ReactNode;
};

// Listed in the order they set off.
const MACHINES: Machine[] = [
  {
    name: 'GPU',
    start: [50, -30],
    cube: [25.44, 65.99],
    faces: [[UPPER_RIGHT, MID], [BOTTOM, LIGHT], [UPPER_LEFT, DARK]],
    icon: (
      <>
        <rect x="-62" y="-26" width="118" height="46" {...outline(LIGHT)} />
        <rect x="-70" y="-34" width="10" height="62" fill={WHITE} />
        <circle cx="-28" cy="-3" r="17" fill={WHITE} stroke={INK} strokeWidth="3" />
        <circle cx="26" cy="-3" r="17" fill={WHITE} stroke={INK} strokeWidth="3" />
        <circle cx="-28" cy="-3" r="4" fill={INK} />
        <circle cx="26" cy="-3" r="4" fill={INK} />
        <rect x="-44" y="20" width="56" height="8" fill={WHITE} />
      </>
    ),
  },
  {
    name: 'Edge',
    start: [176, -32],
    cube: [46.88, 103.13],
    faces: [[RIGHT, DARK], [LEFT, MID], [TOP, LIGHT]],
    icon: (
      <>
        <rect x="-48" y="-40" width="96" height="76" rx="3" {...outline(LIGHT)} />
        <rect x="-26" y="-26" width="52" height="46" fill={INK} />
        <rect x="-58" y="-20" width="14" height="12" {...outline(WHITE)} />
        <rect x="-58" y="2" width="14" height="12" {...outline(WHITE)} />
      </>
    ),
  },
  {
    name: 'VM',
    start: [304, -28],
    cube: [89.76, 28.87],
    faces: [[UPPER_LEFT, DARK], [UPPER_RIGHT, MID], [BOTTOM, LIGHT]],
    icon: (
      <>
        <rect x="-60" y="-40" width="120" height="80" rx="8" fill={WHITE} />
        <rect x="-60" y="-40" width="120" height="22" rx="8" fill="#a8bbe0" />
        <circle cx="-44" cy="-29" r="4" fill={INK} />
        <circle cx="-30" cy="-29" r="4" fill={INK} />
        <circle cx="-16" cy="-29" r="4" fill={INK} />
        <rect x="-46" y="-8" width="92" height="12" rx="3" fill={LIGHT} />
        <rect x="-46" y="12" width="60" height="12" rx="3" fill={MID} />
      </>
    ),
  },
  {
    name: 'Server',
    start: [62, 147],
    cube: [46.88, 28.86],
    faces: [[RIGHT, DARK], [LEFT, MID], [TOP, LIGHT]],
    icon: (
      <>
        <rect x="-32" y="-46" width="64" height="92" fill={WHITE} />
        <rect x="-18" y="-32" width="36" height="8" fill={INK} />
        <rect x="-18" y="-16" width="36" height="8" fill={INK} />
        <circle cx="0" cy="26" r="8" {...outline(MID)} />
      </>
    ),
  },
  {
    name: 'Laptop',
    start: [184, 150],
    cube: [89.76, 103.14],
    faces: [[UPPER_LEFT, DARK], [UPPER_RIGHT, MID], [BOTTOM, LIGHT]],
    icon: (
      <>
        <rect x="-48" y="-40" width="96" height="62" rx="4" fill={WHITE} />
        <rect x="-38" y="-30" width="76" height="42" fill={LIGHT} />
        <path d="M-62 34 L-48 22 L48 22 L62 34 Z" fill={WHITE} />
      </>
    ),
  },
  {
    name: 'Pi',
    start: [306, 145],
    cube: [111.2, 65.99],
    faces: [[RIGHT, DARK], [LEFT, MID], [TOP, LIGHT]],
    icon: (
      <>
        <rect x="-56" y="-30" width="112" height="62" rx="5" {...outline(DARK)} />
        <rect x="-14" y="-16" width="30" height="30" fill={INK} />
        <rect x="-46" y="-22" width="22" height="16" {...outline(WHITE)} />
        <rect x="-46" y="0" width="22" height="16" {...outline(WHITE)} />
        <rect x="30" y="-18" width="18" height="12" fill={WHITE} />
      </>
    ),
  },
];

const LABEL =
  'Kairos logo. A GPU card, an edge board, a virtual machine, a server, a laptop and a Raspberry Pi come together to form it. One lifecycle.';

/** Holds the animation at its first frame until the stage is on screen. */
function usePlayWhenVisible() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = ref.current;
    if (!stage || stage.getBoundingClientRect().top + stage.offsetHeight / 2 < window.innerHeight) {
      return undefined;
    }
    const animations = stage.getAnimations({subtree: true});
    animations.forEach((animation) => {
      animation.pause();
      animation.currentTime = 0;
    });
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          animations.forEach((animation) => animation.play());
        }
      },
      {threshold: 0.5},
    );
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  return ref;
}

/**
 * Six machines move together and become the six cubes of the Kairos logo.
 * The motion is CSS and plays once. The styles without animation are the
 * finished logo, which is what readers who prefer reduced motion get.
 */
export default function MachinesToLogo(): ReactNode {
  const logo = useBaseUrl('/img/kairos-horizontal-dark.svg');
  const stage = usePlayWhenVisible();

  return (
    <div ref={stage} className={styles.stage} role="img" aria-label={LABEL}>
      {/* The official logo file, shown in two halves so each can appear on its own. */}
      <img src={logo} alt="" className={`${styles.logo} ${styles.mark}`} />
      <img src={logo} alt="" className={`${styles.logo} ${styles.word}`} />
      <svg viewBox={VIEW_BOX} className={styles.machines} aria-hidden="true">
        {MACHINES.map(({name, start, cube, faces, icon}, index) => (
          <g key={name} transform={`translate(${cube[0]} ${cube[1]})`}>
            <g
              className={styles.mover}
              style={
                {
                  '--from-x': `${start[0] - cube[0]}px`,
                  '--from-y': `${start[1] - cube[1]}px`,
                  '--delay': `${1 + index * 0.12}s`,
                } as CSSProperties
              }>
              <g className={styles.cube}>
                {faces.map(([points, fill]) => (
                  <polygon key={fill} points={points.map((point) => point.join(',')).join(' ')} fill={fill} />
                ))}
              </g>
              <g className={styles.icon}>
                <g transform="scale(0.58)">{icon}</g>
              </g>
              <text className={styles.name} y="37" textAnchor="middle">
                {name}
              </text>
            </g>
          </g>
        ))}
      </svg>
      <p className={styles.tagline}>One lifecycle.</p>
    </div>
  );
}
