import { useEffect, useRef } from "react";
import type { VillageMember } from "@db/schema";

interface MinimapProps {
  members: VillageMember[];
  scale: number;
  position: { x: number; y: number };
  onNavigate: (x: number, y: number) => void;
}

export default function MinimapView({ members, scale, position, onNavigate }: MinimapProps) {
  const minimapRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Constants for minimap
  const MINIMAP_SIZE = 150;
  const VIEWPORT_COLOR = "rgba(47, 70, 68, 0.1)"; // #2F4644 with opacity
  const BORDER_COLOR = "#629785";

  useEffect(() => {
    if (!minimapRef.current) return;

    const handleDrag = (e: MouseEvent) => {
      if (!isDraggingRef.current || !minimapRef.current) return;

      const rect = minimapRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Convert minimap coordinates to main view coordinates
      const mainX = (x - MINIMAP_SIZE / 2) * 4;
      const mainY = (y - MINIMAP_SIZE / 2) * 4;

      onNavigate(-mainX, -mainY);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onNavigate]);

  // Calculate viewport rectangle in minimap coordinates
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const minimapRatio = MINIMAP_SIZE / (viewportWidth > viewportHeight ? viewportWidth : viewportHeight);
  
  const viewportRect = {
    width: viewportWidth * minimapRatio / scale,
    height: viewportHeight * minimapRatio / scale,
    x: (MINIMAP_SIZE / 2) + (position.x * minimapRatio / scale),
    y: (MINIMAP_SIZE / 2) + (position.y * minimapRatio / scale),
  };

  return (
    <div 
      ref={minimapRef}
      className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-2 z-30"
      onMouseDown={(e) => {
        isDraggingRef.current = true;
        const rect = minimapRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const mainX = (x - MINIMAP_SIZE / 2) * 4;
        const mainY = (y - MINIMAP_SIZE / 2) * 4;
        
        onNavigate(-mainX, -mainY);
      }}
    >
      <div 
        className="relative border-2 rounded-lg overflow-hidden"
        style={{ 
          width: MINIMAP_SIZE, 
          height: MINIMAP_SIZE,
          borderColor: BORDER_COLOR 
        }}
      >
        {/* Circles */}
        {[1, 2, 3, 4, 5].map((circle) => (
          <div
            key={circle}
            className="absolute border rounded-full"
            style={{
              width: (circle * MINIMAP_SIZE * 0.15),
              height: (circle * MINIMAP_SIZE * 0.15),
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              borderColor: BORDER_COLOR
            }}
          />
        ))}

        {/* Members */}
        {members.map((member) => {
          const radius = (member.circle * MINIMAP_SIZE * 0.075);
          const angle = parseFloat(member.positionAngle?.toString() || "0");
          const x = MINIMAP_SIZE / 2 + radius * Math.cos(angle);
          const y = MINIMAP_SIZE / 2 + radius * Math.sin(angle);

          return (
            <div
              key={member.id}
              className="absolute w-1 h-1 rounded-full transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: x,
                top: y,
                backgroundColor: member.category ? BORDER_COLOR : '#6b7280'
              }}
            />
          );
        })}

        {/* Viewport indicator */}
        <div
          className="absolute border-2 border-dashed pointer-events-none"
          style={{
            width: viewportRect.width,
            height: viewportRect.height,
            left: viewportRect.x,
            top: viewportRect.y,
            transform: 'translate(-50%, -50%)',
            borderColor: BORDER_COLOR,
            backgroundColor: VIEWPORT_COLOR
          }}
        />
      </div>
    </div>
  );
}
