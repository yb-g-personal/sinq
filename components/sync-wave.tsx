'use client';
import { useEffect, useRef } from 'react';
import anime from 'animejs';

export function SyncWave({ overlap = 84, compact = false }: { overlap?: number; compact?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!ref.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; const bars = ref.current.querySelectorAll('[data-wave-bar]'); const animation = anime({ targets: bars, scaleY: (_: unknown, i: number) => 0.45 + ((i * 13) % 7) / 12, translateX: (_: unknown, i: number) => i % 2 === 0 ? 1 : -1, duration: 900, delay: anime.stagger(45), direction: 'alternate', loop: true, easing: 'easeInOutSine' }); return () => animation.pause(); }, []);
  const total = compact ? 18 : 32; const lit = Math.round((overlap / 100) * total);
  return <div ref={ref} aria-label={`${overlap}% shared listening signal`} className={`flex items-center gap-[3px] ${compact ? 'h-8' : 'h-32'}`}>{Array.from({ length: total }, (_, index) => <span key={index} data-wave-bar className={`w-[3px] origin-center rounded-full transition-colors ${index < lit ? 'bg-purple shadow-[0_0_12px_rgba(168,85,247,.65)]' : 'bg-line'}`} style={{ height: `${24 + ((index * 17) % 65)}%` }} />)}</div>;
}
