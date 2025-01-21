import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import BasicInfoStep from "@/components/onboarding/BasicInfoStep";
import StressAssessmentStep from "@/components/onboarding/StressAssessmentStep";
import ChildProfileStep from "@/components/onboarding/ChildProfileStep";
import GoalsStep from "@/components/onboarding/GoalsStep";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export type OnboardingData = {
  basicInfo?: {
    name: string;
    email: string;
    experienceLevel: "first_time" | "experienced" | "multiple_children";
  };
  stressAssessment?: {
    stressLevel: "low" | "moderate" | "high" | "very_high";
    primaryConcerns: string[];
    supportNetwork: string[];
  };
  childProfiles?: Array<{
    name: string;
    age: number;
    specialNeeds: string[];
  }>;
  goals?: {
    shortTerm: string[];
    longTerm: string[];
    supportAreas: string[];
    communicationPreference: string;
  };
};

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({});
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  // Fetch existing progress
  const { data: savedProgress, isLoading } = useQuery({
    queryKey: ['/api/onboarding/progress'],
    onSuccess: (data) => {
      if (data.completedOnboarding) {
        setLocation("/");
        return;
      }
      setStep(data.currentOnboardingStep || 1);
      setOnboardingData(data.onboardingData || {});
    },
  });

  // Save progress mutation
  const saveProgressMutation = useMutation({
    mutationFn: async (data: { step: number; data: OnboardingData }) => {
      const response = await fetch("/api/onboarding/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to save progress");
      }

      return response.json();
    },
    onError: (error) => {
      console.error("Failed to save progress:", error);
      toast({
        title: "Error",
        description: "Failed to save your progress. Don't worry, you can continue.",
        variant: "destructive",
      });
    },
  });

  // Complete onboarding mutation
  const completeOnboardingMutation = useMutation({
    mutationFn: async (data: OnboardingData) => {
      console.log("Submitting onboarding data:", data);
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to complete onboarding");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Onboarding Complete",
        description: "Welcome to Nuri! Let's get started.",
      });
      setTimeout(() => setLocation("/"), 1000);
    },
    onError: (error) => {
      console.error("Onboarding error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to complete onboarding. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStepComplete = async (stepData: Partial<OnboardingData>) => {
    const updatedData = { ...onboardingData, ...stepData };
    setOnboardingData(updatedData);

    // Save progress after each step
    try {
      await saveProgressMutation.mutateAsync({
        step: step,
        data: updatedData,
      });
    } catch (error) {
      console.error("Failed to save progress:", error);
    }

    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // This is the final step
      try {
        await completeOnboardingMutation.mutateAsync(updatedData);
      } catch (error) {
        console.error("Failed to complete onboarding:", error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center animate-gradient" style={{
      backgroundSize: "400% 400%",
      background: `linear-gradient(135deg, #F8DD9F 0%, #F2F0E5 50%, #F2F0E5 100%)`
    }}>
      <div className="w-full max-w-2xl space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tighter">Welcome to Nuri</h1>
          <p className="text-muted-foreground">
            Let's get to know you better to provide personalized support
          </p>
        </div>

        <Progress value={progress} className="w-full" />

        <Card>
          <CardContent className="pt-6">
            {step === 1 && (
              <BasicInfoStep
                onComplete={(data) => handleStepComplete({ basicInfo: data })}
                initialData={onboardingData.basicInfo}
              />
            )}
            {step === 2 && (
              <StressAssessmentStep
                onComplete={(data) => handleStepComplete({ stressAssessment: data })}
                initialData={onboardingData.stressAssessment}
              />
            )}
            {step === 3 && (
              <ChildProfileStep
                onComplete={(data) => handleStepComplete({ childProfiles: data.children })}
                initialData={onboardingData.childProfiles}
              />
            )}
            {step === 4 && (
              <GoalsStep
                onComplete={(data) => handleStepComplete({ goals: data })}
                initialData={onboardingData.goals}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}