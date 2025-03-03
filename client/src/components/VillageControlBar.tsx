import { ZoomIn, ZoomOut, RotateCcw, Target, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface VillageControlBarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onCenter: () => void;
  onToggleLight: () => void;
  className?: string;
}

export default function VillageControlBar({
  onZoomIn,
  onZoomOut,
  onReset,
  onCenter,
  onToggleLight,
  className
}: VillageControlBarProps) {
  const controls = [
    { icon: ZoomIn, label: "Zoom In", onClick: onZoomIn },
    { icon: ZoomOut, label: "Zoom Out", onClick: onZoomOut },
    { icon: RotateCcw, label: "Reset", onClick: onReset },
    { icon: Target, label: "Center", onClick: onCenter },
    { icon: Sun, label: "Light", onClick: onToggleLight },
  ];

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={cn(
        "fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-white/90 backdrop-blur-sm rounded-full shadow-lg px-4 py-2 flex items-center gap-2",
        className
      )}
    >
      {controls.map(({ icon: Icon, label, onClick }, index) => (
        <div key={label} className="relative group">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClick}
            className="h-10 px-3 hover:bg-gray-100 rounded-full flex items-center gap-2"
          >
            <Icon className="w-5 h-5 text-gray-700" />
            <span className="text-sm text-gray-700">{label}</span>
          </Button>
        </div>
      ))}
    </motion.div>
  );
}