import { useState } from "react";
import { useVillage } from "@/hooks/use-village";
import { ChevronLeft, Plus, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import Draggable from "react-draggable";
import { Link } from "wouter";

export default function VillageView() {
  const { members } = useVillage();
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.1, 3)); // max 3x zoom
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.1, 0.3)); // min 0.3x zoom
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const getCircleRadius = (index: number) => {
    const baseRadius = 80; // Reduced from 120 to bring circles closer
    return baseRadius * (index + 1);
  };

  const getMemberPosition = (circle: number) => {
    const angle = Math.random() * 2 * Math.PI;
    const radius = getCircleRadius(circle - 1);
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  };

  const handlePanStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (e.target instanceof Element && e.target.closest('.member-pill')) {
      return; // Don't start panning if clicking on a member pill
    }
    setIsDragging(true);
  };

  const handlePanMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;

    const moveEvent = 'touches' in e ? e.touches[0] : e;
    setPosition(prev => ({
      x: prev.x + moveEvent.movementX,
      y: prev.y + moveEvent.movementY
    }));
  };

  const handlePanEnd = () => {
    setIsDragging(false);
  };

  return (
    <div className="flex flex-col h-screen bg-[#F2F0E5]">
      {/* Header */}
      <div
        className="p-4 h-[200px]"
        style={{
          background: `url('/images/village_circles_page.png'), linear-gradient(45deg, #C2ECD1 0%, #F8DE9F 35%)`,
          backgroundPosition: "left",
          backgroundRepeat: "no-repeat",
          backgroundSize: "contain",
        }}
      >
        <Link href="/">
          <div className="flex items-center space-x-4 cursor-pointer">
            <ChevronLeft className="w-6 h-6 text-gray-800" />
            <span className="text-xl text-gray-800">Mijn Village</span>
          </div>
        </Link>
        <h1 className="text-2xl font-medium mt-6 text-[#2F4644] max-w-[280px]">
          Een bloeiende Village als middel tegen 'Village Armoede'
        </h1>
      </div>

      {/* Zoom Controls */}
      <div className="fixed top-32 right-4 flex flex-col space-y-2 z-10">
        <button
          onClick={handleZoomIn}
          className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow hover:bg-gray-50"
        >
          <ZoomIn className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow hover:bg-gray-50"
        >
          <ZoomOut className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={handleReset}
          className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow hover:bg-gray-50"
        >
          <RotateCcw className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Village Visualization */}
      <div 
        className="flex-1 relative min-h-[500px] overflow-hidden"
        onMouseDown={handlePanStart}
        onMouseMove={handlePanMove}
        onMouseUp={handlePanEnd}
        onMouseLeave={handlePanEnd}
        onTouchStart={handlePanStart}
        onTouchMove={handlePanMove}
        onTouchEnd={handlePanEnd}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div
          className="absolute inset-0"
          style={{
            transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
            transformOrigin: "center center",
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          {/* Concentric Circles */}
          <div className="absolute inset-0 flex items-center justify-center">
            {[1, 2, 3, 4, 5].map((circle) => (
              <div
                key={circle}
                className="absolute border border-[#D9E7DA] rounded-full"
                style={{
                  width: getCircleRadius(circle - 1) * 2,
                  height: getCircleRadius(circle - 1) * 2,
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              />
            ))}

            {/* Center Circle */}
            <div className="absolute w-16 h-16 bg-[#2F4644] rounded-full flex items-center justify-center text-white text-sm">
              Kerngezin
            </div>

            {/* Member Pills */}
            {members.map((member) => {
              const pos = getMemberPosition(member.circle);
              return (
                <Draggable
                  key={member.id}
                  defaultPosition={pos}
                  bounds="parent"
                >
                  <div className="absolute cursor-move member-pill" style={{ transform: "translate(-50%, -50%)" }}>
                    <div className="flex items-center space-x-2 bg-white rounded-full px-3 py-1 shadow-sm">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          member.type === "individual" ? "bg-[#22c55e]" : "bg-[#3b82f6]"
                        }`}
                      />
                      <span className="text-sm text-gray-800">{member.name}</span>
                    </div>
                  </div>
                </Draggable>
              );
            })}
          </div>
        </div>
      </div>

      {/* Village Suggestions */}
      <div className="p-4">
        <div className="flex items-center justify-between bg-white rounded-full px-6 py-3 shadow-md w-auto max-w-xs">
          <span>
            Er zijn <strong className="text-orange-500">3</strong> village
            suggesties
          </span>
          <ChevronLeft className="w-5 h-5 transform rotate-90 ml-2" />
        </div>
      </div>

      {/* Add Member Button */}
      <Link href="/village/add">
        <button className="fixed bottom-20 right-4 w-12 h-12 bg-[#2F4644] rounded-full flex items-center justify-center shadow-lg">
          <Plus className="w-6 h-6 text-white" />
        </button>
      </Link>
    </div>
  );
}