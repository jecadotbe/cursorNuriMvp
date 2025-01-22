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

type OnboardingProgressResponse = {
  currentOnboardingStep: number;
  completedOnboarding: boolean;
  onboardingData: OnboardingData;
};

const handleApiResponse = async (response: Response) => {
  const responseText = await response.text(); // Read the response text only once

  try {
    // Try to parse the text as JSON
    const data = JSON.parse(responseText);

    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (parseError) {
    // If JSON parsing failed, use the original response text
    if (!response.ok) {
      throw new Error(responseText || `HTTP error! status: ${response.status}`);
    }
    throw new Error("Invalid server response");
  }
};

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({});
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const { data: savedProgress, isLoading } = useQuery<OnboardingProgressResponse>({
    queryKey: ['/api/onboarding/progress'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/onboarding/progress', {
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          }
        });
        return handleApiResponse(response);
      } catch (error) {
        console.error('Failed to fetch progress:', error);
        toast({
          title: "Error",
          description: "Failed to load your progress. Starting from the beginning.",
          variant: "destructive",
        });
        return {
          currentOnboardingStep: 1,
          completedOnboarding: false,
          onboardingData: {}
        };
      }
    }
  });

  useEffect(() => {
    if (savedProgress) {
      if (savedProgress.completedOnboarding) {
        setLocation("/");
        return;
      }
      setStep(savedProgress.currentOnboardingStep || 1);
      setOnboardingData(savedProgress.onboardingData || {});
    }
  }, [savedProgress, setLocation]);

  const saveProgressMutation = useMutation({
    mutationFn: async (data: { step: number; data: OnboardingData }) => {
      const response = await fetch("/api/onboarding/progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      return handleApiResponse(response);
    },
    onError: (error: Error) => {
      console.error("Failed to save progress:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save your progress. Don't worry, you can continue.",
        variant: "destructive",
      });
    }
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: async (data: OnboardingData) => {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      return handleApiResponse(response);
    },
    onSuccess: () => {
      toast({
        title: "Onboarding Complete",
        description: "Welcome to Nuri! Let's get started.",
      });
      setTimeout(() => setLocation("/"), 1000);
    },
    onError: (error: Error) => {
      console.error("Onboarding error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to complete onboarding. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleStepComplete = async (stepData: Partial<OnboardingData>) => {
    const updatedData = { ...onboardingData, ...stepData };
    setOnboardingData(updatedData);

    try {
      await saveProgressMutation.mutateAsync({
        step,
        data: updatedData,
      });

      if (step < totalSteps) {
        setStep(step + 1);
      } else {
        await completeOnboardingMutation.mutateAsync(updatedData);
      }
    } catch (error) {
      // Error is already handled by the mutations
      console.error("Step completion error:", error);
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
                onComplete={(data) => handleStepComplete({ childProfiles: data })}
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