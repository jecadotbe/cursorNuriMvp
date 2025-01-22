import { createContext, useContext, useState, useEffect } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";

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
    title: "Welkom bij Nuri",
    description: "Laten we een korte rondleiding maken door jouw persoonlijke ontwikkelingsplatform.",
    target: "body",
    placement: "center",
  },
  {
    id: "chat",
    title: "Persoonlijke Coach",
    description: "Start een gesprek met Nuri, je persoonlijke opvoedingscoach.",
    target: "[data-onboarding='chat']",
    placement: "top",
  },
  {
    id: "village",
    title: "Jouw Netwerk",
    description: "Breng je ondersteunend netwerk in kaart en volg belangrijke relaties.",
    target: "[data-onboarding='village']",
    placement: "top",
  },
  {
    id: "learn",
    title: "Leren & Groeien",
    description: "Krijg toegang tot relevante content en bronnen voor je opvoedingsreis.",
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

  useEffect(() => {
    if (!hasCompletedOnboarding) {
      // Auto-start onboarding for new users after a short delay
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedOnboarding]);

  const start = () => {
    setIsActive(true);
    setCurrentStep(0);
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