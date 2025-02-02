
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

  useEffect(() => {
    if (!containerRef.current || !contentRef.current) return;

    const contentWidth = contentRef.current.scrollWidth;
    const containerWidth = containerRef.current.offsetWidth;
    const totalWidth = contentWidth + containerWidth;

    const isMobile = window.innerWidth <= 768;
    const mobileSpeedMultiplier = 2;
    
    const animate = () => {
      setTranslateX(prev => {
        const speedModifier = isMobile ? speed * mobileSpeedMultiplier : speed;
        const next = prev - speedModifier / 600;
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
    <div ref={containerRef} className={cn("relative overflow-hidden whitespace-nowrap", className)}>
      <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#F2F0E5] to-transparent z-10" />
      <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#F2F0E5] to-transparent z-10" />
      <div className="flex">
        <div
          ref={contentRef}
          className="inline-flex gap-4 transition-transform duration-75"
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
          {/* Duplicate items for seamless loop */}
          {items.map((item) => (
            <button
              key={`duplicate-${item.id}`}
              className="inline-flex items-center rounded-full bg-white/90 px-4 py-2 text-sm font-medium shadow-sm hover:bg-white/100 border border-gray-100"
            >
              {item.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
