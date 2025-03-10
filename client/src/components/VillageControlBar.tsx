import { ZoomIn, ZoomOut, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface VillageControlBarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onClose?: () => void;
  className?: string;
  customControls?: Array<{
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    onClick: () => void;
    tooltip?: string;
  }>;
}

export default function VillageControlBar({
  onZoomIn,
  onZoomOut,
  onReset,
  onClose,
  className,
  customControls = []
}: VillageControlBarProps) {
  const defaultControls = [
    { icon: ZoomIn, label: "", onClick: onZoomIn, tooltip: "Zoom In" },
    { icon: ZoomOut, label: "", onClick: onZoomOut, tooltip: "Zoom Out" },
    { icon: RotateCcw, label: "Reset", onClick: onReset },
  ];
  
  // Combine default and custom controls
  const controls = [...defaultControls, ...customControls];

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={cn(
        "bg-white/95 backdrop-blur-md rounded-full shadow-xl px-4 py-2 flex items-center gap-2",
        "max-w-[90vw] overflow-x-auto scrollbar-hide border border-gray-200",
        className
      )}
    >
      {controls.map(({ icon: Icon, label, onClick, tooltip }, index) => (
        <div key={label || index} className="relative group flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClick}
            className="h-10 px-3 hover:bg-gray-100 rounded-full flex items-center gap-2"
            title={tooltip}
          >
            <Icon className="w-5 h-5 text-gray-700" />
            {label && <span className="text-sm text-gray-700 hidden md:inline">{label}</span>}
          </Button>
        </div>
      ))}
      
      {onClose && (
        <div className="relative group flex-shrink-0 ml-1 border-l border-gray-200 pl-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-10 px-3 hover:bg-gray-100 rounded-full flex items-center gap-2"
            title="Close"
          >
            <X className="w-5 h-5 text-gray-700" />
            <span className="text-sm text-gray-700 hidden md:inline">Village Tools +</span>
          </Button>
        </div>
      )}
    </motion.div>
  );
}