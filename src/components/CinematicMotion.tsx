import React, { createContext, useContext, useRef } from 'react';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'motion/react';

export const VELORA_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const SectionScrollContext = createContext<MotionValue<number> | null>(null);

export const ScrollProgressRibbon: React.FC = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX, transformOrigin: 'right' }}
      className="fixed top-16 inset-x-0 z-30 h-[2.5px] pointer-events-none bg-gradient-to-l from-[#5B3278] via-[#C5A25D] to-[#9E71C4]"
    />
  );
};

interface CinematicPageTransitionProps {
  routeKey: string;
  children: React.ReactNode;
}

export const CinematicPageTransition: React.FC<CinematicPageTransitionProps> = ({
  routeKey,
  children,
}) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={routeKey}
        initial={{ opacity: 0, y: 18, scale: 0.992, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -12, scale: 0.995, filter: 'blur(3px)' }}
        transition={{ duration: 0.36, ease: VELORA_EASE }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

interface CinematicTabPanelProps {
  tabKey: string;
  children: React.ReactNode;
  className?: string;
}

export const CinematicTabPanel: React.FC<CinematicTabPanelProps> = ({
  tabKey,
  children,
  className,
}) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tabKey}
        initial={{ opacity: 0, y: 14, filter: 'blur(3px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -10, filter: 'blur(2px)' }}
        transition={{ duration: 0.28, ease: VELORA_EASE }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

interface CinematicSectionProps {
  children: React.ReactNode;
  className?: string;
}

export const CinematicSection: React.FC<CinematicSectionProps> = ({
  children,
  className,
}) => {
  const ref = useRef<HTMLElement | null>(null);
  const prefersReduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 170,
    damping: 30,
    mass: 0.35,
  });

  // Bidirectional assembly on enter & dissolve/disintegrate when scrolled past above
  const opacity = useTransform(smoothProgress, [0, 0.14, 0.72, 0.98], [0.12, 1, 1, 0.06]);
  const y = useTransform(smoothProgress, [0, 0.14, 0.72, 0.98], [28, 0, 0, -44]);
  const scale = useTransform(smoothProgress, [0, 0.14, 0.72, 0.98], [0.96, 1, 1, 0.92]);
  const filter = useTransform(
    smoothProgress,
    [0, 0.14, 0.72, 0.98],
    ['blur(3px)', 'blur(0px)', 'blur(0px)', 'blur(6px)']
  );

  return (
    <SectionScrollContext.Provider value={smoothProgress}>
      <motion.section
        ref={ref}
        style={
          prefersReduced
            ? undefined
            : {
                opacity,
                y,
                scale,
                filter,
                willChange: 'transform, opacity, filter',
              }
        }
        className={className}
      >
        {children}
      </motion.section>
    </SectionScrollContext.Provider>
  );
};

interface CinematicStaggerGridProps {
  children: React.ReactNode;
  className?: string;
}

export const CinematicStaggerGrid: React.FC<CinematicStaggerGridProps> = ({
  children,
  className,
}) => {
  return <div className={className}>{children}</div>;
};

interface CinematicStaggerItemProps {
  children: React.ReactNode;
  className?: string;
  liftOnHover?: boolean;
  scatterIndex?: number;
}

const SCATTER_VECTORS = [
  { x: -34, y: -22, r: -3 },
  { x: 0, y: -38, r: 1.5 },
  { x: 34, y: -18, r: 3 },
  { x: -26, y: -30, r: 2.2 },
  { x: 26, y: -26, r: -2.4 },
];

export const CinematicStaggerItem: React.FC<CinematicStaggerItemProps> = ({
  children,
  className,
  liftOnHover = true,
  scatterIndex = 0,
}) => {
  const parentProgress = useContext(SectionScrollContext);
  const prefersReduced = useReducedMotion();
  const fallbackRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress: selfProgress } = useScroll({
    target: fallbackRef,
    offset: ['start end', 'end start'],
  });

  const activeProgress = parentProgress || selfProgress;
  const vec = SCATTER_VECTORS[Math.abs(scatterIndex) % SCATTER_VECTORS.length];

  // Enter staggered slightly by index, hold sharp, then fragment outward as scrolled past top
  const enterEnd = Math.min(0.16 + (scatterIndex % 4) * 0.035, 0.28);
  const exitStart = 0.72 + (scatterIndex % 3) * 0.03;

  const itemOpacity = useTransform(activeProgress, [0, enterEnd, exitStart, 0.99], [0.15, 1, 1, 0.04]);
  const itemX = useTransform(activeProgress, [0, enterEnd, exitStart, 0.99], [vec.x * -0.25, 0, 0, vec.x]);
  const itemY = useTransform(activeProgress, [0, enterEnd, exitStart, 0.99], [22, 0, 0, vec.y]);
  const itemRotate = useTransform(activeProgress, [0, enterEnd, exitStart, 0.99], [0, 0, 0, vec.r]);
  const itemScale = useTransform(activeProgress, [0, enterEnd, exitStart, 0.99], [0.95, 1, 1, 0.88]);

  return (
    <motion.div
      ref={fallbackRef}
      style={
        prefersReduced
          ? undefined
          : {
              opacity: itemOpacity,
              x: itemX,
              y: itemY,
              rotate: itemRotate,
              scale: itemScale,
              willChange: 'transform, opacity',
            }
      }
      whileHover={
        liftOnHover
          ? {
              y: -5,
              transition: { duration: 0.22, ease: VELORA_EASE },
            }
          : undefined
      }
      className={className}
    >
      {children}
    </motion.div>
  );
};
