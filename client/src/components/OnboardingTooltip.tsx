import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/context/onboarding-context";

function calculatePosition(
  targetEl: HTMLElement | null,
  tooltipEl: HTMLElement | null,
  placement: string = "bottom"
) {
  if (!targetEl || !tooltipEl) return { x: 0, y: 0 };

  const targetRect = targetEl.getBoundingClientRect();
  const tooltipRect = tooltipEl.getBoundingClientRect();

  let x = 0;
  let y = 0;

  if (placement === "center") {
    x = window.innerWidth / 2 - tooltipRect.width / 2;
    y = window.innerHeight / 2 - tooltipRect.height / 2;
    return { x, y };
  }

  switch (placement) {
    case "top":
      x = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
      y = targetRect.top - tooltipRect.height - 8;
      break;
    case "bottom":
      x = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
      y = targetRect.bottom + 8;
      break;
    case "left":
      x = targetRect.left - tooltipRect.width - 8;
      y = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
      break;
    case "right":
      x = targetRect.right + 8;
      y = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
      break;
  }

  // Ensure tooltip stays within viewport
  x = Math.max(16, Math.min(x, window.innerWidth - tooltipRect.width - 16));
  y = Math.max(16, Math.min(y, window.innerHeight - tooltipRect.height - 16));

  return { x, y };
}

export default function OnboardingTooltip() {
  const { isActive, currentStep, steps, next, prev, skip } = useOnboarding();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [tooltipRef, setTooltipRef] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const step = steps[currentStep];
    const targetEl = document.querySelector(step.target) as HTMLElement;

    const updatePosition = () => {
      const newPosition = calculatePosition(
        targetEl,
        tooltipRef,
        step.placement
      );
      setPosition(newPosition);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [isActive, currentStep, steps, tooltipRef]);

  if (!isActive) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-none">
        <motion.div
          ref={setTooltipRef}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{
            opacity: 1,
            scale: 1,
            x: position.x,
            y: position.y,
          }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="absolute pointer-events-auto bg-white rounded-lg shadow-lg p-4 max-w-xs"
        >
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">{step.title}</h3>
            <p className="text-sm text-gray-600">{step.description}</p>
          </div>
          <div className="flex justify-between items-center mt-4">
            <div className="space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={skip}
              >
                Overslaan
              </Button>
              {currentStep > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={prev}
                >
                  Terug
                </Button>
              )}
            </div>
            <Button
              size="sm"
              onClick={next}
            >
              {isLastStep ? "Aan de slag" : "Volgende"}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}