import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import BasicInfoStep from "@/components/onboarding/BasicInfoStep";
import StressAssessmentStep from "@/components/onboarding/StressAssessmentStep";
import ChildProfileStep from "@/components/onboarding/ChildProfileStep";
import GoalsStep from "@/components/onboarding/GoalsStep";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

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
      // Use setTimeout to ensure the toast is visible before redirecting
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

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center">
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
              />
            )}
            {step === 2 && (
              <StressAssessmentStep
                onComplete={(data) => handleStepComplete({ stressAssessment: data })}
              />
            )}
            {step === 3 && (
              <ChildProfileStep
                onComplete={(data) => handleStepComplete({ childProfiles: data.children })}
              />
            )}
            {step === 4 && (
              <GoalsStep
                onComplete={(data) => handleStepComplete({ goals: data })}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}