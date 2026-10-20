'use client';
// ❄️ 화면에 눈이 내리고 별빛이 반짝여요
import { useEffect, useState } from 'react';

export default function Snow({ count = 34, twinkles = 18 }) {
  const [items, setItems] = useState(null);

  useEffect(() => {
    const r = (a, b) => a + Math.random() * (b - a);
    setItems({
      flakes: Array.from({ length: count }, (_, i) => ({
        id: i,
        left: r(0, 100),
        size: r(8, 18),
        dur: r(9, 18),
        delay: -r(0, 18),
        drift: r(-40, 40),
        char: Math.random() < 0.7 ? '•' : '❄',
        op: r(0.5, 0.95),
      })),
      stars: Array.from({ length: twinkles }, (_, i) => ({
        id: i,
        left: r(2, 98),
        top: r(4, 90),
        dur: r(1.6, 3.6),
        delay: -r(0, 3),
      })),
    });
  }, [count, twinkles]);

  if (!items) return null;
  return (
    <div className="snow" aria-hidden="true">
      {items.stars.map((s) => (
        <span
          key={'s' + s.id}
          className="twinkle"
          style={{ left: s.left + '%', top: s.top + '%', animationDuration: s.dur + 's', animationDelay: s.delay + 's' }}
        />
      ))}
      {items.flakes.map((f) => (
        <span
          key={f.id}
          className="flake"
          style={{
            left: f.left + '%',
            fontSize: f.size + 'px',
            opacity: f.op,
            animationDuration: f.dur + 's',
            animationDelay: f.delay + 's',
            '--drift': f.drift + 'px',
          }}
        >
          {f.char}
        </span>
      ))}
    </div>
  );
}
