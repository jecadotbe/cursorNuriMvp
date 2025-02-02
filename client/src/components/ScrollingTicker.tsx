
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ScrollingTickerProps {
  items: {
    id: string;
    text: React.ReactNode;
  }[];
  className?: string;
  speed?: number;
}

export function ScrollingTicker({ items, className, speed = 30 }: ScrollingTickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current || !contentRef.current) return;

    const updateContentWidth = () => {
      if (contentRef.current) {
        const width = contentRef.current.children[0]?.getBoundingClientRect().width || 0;
        setContentWidth(width);
      }
    };

    updateContentWidth();
    const observer = new ResizeObserver(updateContentWidth);
    observer.observe(contentRef.current);

    const animate = () => {
      setTranslateX(prev => {
        const next = prev - speed / 600;
        if (next <= -contentWidth) {
          return 0;
        }
        return next;
      });
    };

    const animationFrame = requestAnimationFrame(function loop() {
      animate();
      requestAnimationFrame(loop);
    });

    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, [speed, contentWidth]);

  return (
    <div ref={containerRef} className={cn("relative overflow-hidden whitespace-nowrap", className)}>
      <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#F2F0E5] to-transparent z-10" />
      <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#F2F0E5] to-transparent z-10" />
      <div className="flex">
        {[0, 1, 2].map((setIndex) => (
          <div
            key={setIndex}
            ref={setIndex === 0 ? contentRef : undefined}
            className="inline-flex gap-4 transition-transform duration-75"
            style={{ transform: `translateX(${translateX + setIndex * contentWidth}px)` }}
          >
            {items.map((item) => (
              <button
                key={`${setIndex}-${item.id}`}
                className="inline-flex items-center rounded-full bg-white/90 px-4 py-2 text-sm font-medium shadow-sm hover:bg-white/100 border border-gray-100"
              >
                {item.text}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
