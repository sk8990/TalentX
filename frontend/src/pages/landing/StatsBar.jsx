import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { revealContainer, revealItem, formatIndianCount } from "./animations";

export default function StatsBar({ stats }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      aria-label="Impact statistics"
      className="landing-section pb-2 sm:pb-4"
      initial={reduceMotion ? false : "hidden"}
      whileInView={reduceMotion ? undefined : "visible"}
      viewport={{ once: true, amount: 0.2 }}
      variants={revealContainer}
    >
      <div className="mx-auto max-w-7xl rounded-2xl border border-slate-200 bg-white/70 px-5 py-6 backdrop-blur sm:px-8 sm:py-8 lg:px-14 lg:py-10">
        <div className="grid gap-6 text-center sm:grid-cols-3 sm:gap-8 sm:text-left lg:gap-10">
          {stats.map((stat) => (
            <motion.div key={stat.label} variants={revealItem}>
              <CountUpStat
                value={stat.value}
                suffix={stat.suffix}
                label={stat.label}
                reduceMotion={reduceMotion}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

function CountUpStat({ value, suffix = "", label, reduceMotion }) {
  const statRef = useRef(null);
  const isInView = useInView(statRef, { once: true, amount: 0.65 });
  const [displayValue, setDisplayValue] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (reduceMotion) {
      setDisplayValue(value);
      return;
    }
    if (!isInView) return;

    let frameId = 0;
    let startTime = 0;
    const durationMs = 1700;

    const tick = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * eased));
      if (progress < 1) frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [isInView, reduceMotion, value]);

  return (
    <div ref={statRef} className="space-y-1 sm:space-y-2">
      <p className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl lg:text-4xl">
        {formatIndianCount(displayValue)}
        {suffix}
      </p>
      <p className="text-sm font-medium text-slate-500 sm:text-base lg:text-lg">{label}</p>
    </div>
  );
}
