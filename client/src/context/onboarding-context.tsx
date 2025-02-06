import { createContext, useContext, useState, useEffect } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useLocation } from "wouter";

type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  target: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
};

const onboardingSteps: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to Nuri",
    description: "Let's take a quick tour of your personal development platform.",
    target: "body",
    placement: "center",
  },
  {
    id: "chat",
    title: "Personal Coach",
    description: "Start a conversation with Nuri, your personal parenting coach.",
    target: "[data-onboarding='chat']",
    placement: "top",
  },
  {
    id: "village",
    title: "Your Village",
    description: "Map your support network and track important relationships.",
    target: "[data-onboarding='village']",
    placement: "top",
  },
  {
    id: "learn",
    title: "Learn & Grow",
    description: "Access curated content and resources for your parenting journey.",
    target: "[data-onboarding='learn']",
    placement: "top",
  },
];

type OnboardingContextType = {
  isActive: boolean;
  currentStep: number;
  steps: OnboardingStep[];
  start: () => void;
  next: () => void;
  prev: () => void;
  skip: () => void;
  reset: () => void;
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useLocalStorage("onboarding-completed", false);
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [location] = useLocation();

  // Check if we're in the onboarding flow
  const isInOnboardingFlow = location.includes('/onboarding') || location === '/building-profile';

  useEffect(() => {
    // Only show tooltips on homepage when not in onboarding flow
    if (!hasCompletedOnboarding && location === "/" && !isActive && !isInOnboardingFlow) {
      // Auto-start onboarding tooltips for new users after a short delay
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 1000);
      return () => clearTimeout(timer);
    }

    // Deactivate tooltips if we enter onboarding flow
    if (isInOnboardingFlow && isActive) {
      setIsActive(false);
    }
  }, [hasCompletedOnboarding, location, isActive, isInOnboardingFlow]);

  const start = () => {
    // Only allow starting onboarding tooltips on the homepage and when not in onboarding flow
    if (location === "/" && !isInOnboardingFlow) {
      setIsActive(true);
      setCurrentStep(0);
    }
  };

  const next = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      setIsActive(false);
      setHasCompletedOnboarding(true);
    }
  };

  const prev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const skip = () => {
    setIsActive(false);
    setHasCompletedOnboarding(true);
  };

  const reset = () => {
    setHasCompletedOnboarding(false);
    setCurrentStep(0);
  };

  return (
    <OnboardingContext.Provider
      value={{
        isActive,
        currentStep,
        steps: onboardingSteps,
        start,
        next,
        prev,
        skip,
        reset,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}