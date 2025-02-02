
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ScrollingTickerProps {
  items: {
    id: string;
    text: string;
  }[];
  className?: string;
  speed?: number;
}

export function ScrollingTicker({ items, className, speed = 30 }: ScrollingTickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const contentWidth = containerRef.current.scrollWidth;
    const viewportWidth = containerRef.current.offsetWidth;

    const animate = () => {
      setTranslateX(prev => {
        const next = prev - speed / 60;
        return next <= -contentWidth ? 0 : next;
      });
    };

    const animationFrame = requestAnimationFrame(function loop() {
      animate();
      requestAnimationFrame(loop);
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [speed, items]);

  return (
    <div className={cn("relative overflow-hidden whitespace-nowrap", className)}>
      <div
        ref={containerRef}
        className="inline-flex gap-4"
        style={{ transform: `translateX(${translateX}px)` }}
      >
        {items.map((item) => (
          <button
            key={item.id}
            className="inline-flex items-center rounded-full bg-white/90 px-4 py-2 text-sm font-medium shadow-sm hover:bg-white/100 border border-gray-100"
          >
            {item.text}
          </button>
        ))}
      </div>
    </div>
  );
}
