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
    parentType: "mom" | "dad" | "other";
    experienceLevel: "first_time" | "experienced";
  };
  stressAssessment?: {
    stressLevel: "low" | "moderate" | "high" | "very_high";
    primaryConcerns: string[];
    supportNetwork: string[];
  };
  childProfiles: Array<{
    name: string;
    age: number;
    specialNeeds: string[];
  }>;
  goals?: {
    shortTerm: string[];
    longTerm: string[];
    supportAreas: string[];
    communicationPreference?: string;
  };
};

type OnboardingProgressResponse = {
  currentOnboardingStep: number;
  completedOnboarding: boolean;
  onboardingData: OnboardingData;
};

const handleApiResponse = async (response: Response) => {
  try {
    const contentType = response.headers.get('content-type');
    
    // Check if response is JSON
    if (contentType && contentType.includes('application/json')) {
      const responseText = await response.text();
      try {
        const data = JSON.parse(responseText);
        if (!response.ok) {
          throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }
        return data;
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        throw new Error("Invalid JSON response from server");
      }
    } else {
      // Handle non-JSON responses
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}, response: ${text.substring(0, 100)}`);
      }
      console.warn('Response is not JSON:', text.substring(0, 100));
      // Try to convert to a compatible format
      return {
        message: "Data received but not in expected format",
        currentOnboardingStep: 1,
        completedOnboarding: false,
        onboardingData: { childProfiles: [] }
      };
    }
  } catch (error) {
    console.error('API response handling error:', error);
    throw error;
  }
};

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    childProfiles: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
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
        const data = await handleApiResponse(response);
        return {
          ...data,
          onboardingData: {
            ...data.onboardingData,
            childProfiles: Array.isArray(data.onboardingData?.childProfiles)
              ? data.onboardingData.childProfiles
              : []
          }
        };
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
          onboardingData: { childProfiles: [] }
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
      setOnboardingData(savedProgress.onboardingData);
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
    if (isSubmitting) return; // Prevent double submission

    setIsSubmitting(true);
    const updatedData = {
      ...onboardingData,
      ...stepData,
      childProfiles: Array.isArray(stepData.childProfiles)
        ? stepData.childProfiles
        : onboardingData.childProfiles
    };
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
        setLocation("/building-profile");
      }
    } catch (error) {
      console.error("Step completion error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred while saving your progress.",
      });
    } finally {
      setIsSubmitting(false);
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
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <img
              src="/images/nuri_chat.png"
              alt="Nuri Logo"
              className="w-24 h-24 object-contain"
            />
          </div>
          <h1 className="text-3xl font-baskerville">Welkom bij Nuri</h1>
          <p>
            Geweldig dat je voor ons kiest. Laten we je beter leren kennen om gepersonaliseerde ondersteuning te bieden
          </p>
        </div>

        <Progress value={progress} className="w-full" />

        <Card>
          <CardContent className="pt-6">
            {step === 1 && (
              <BasicInfoStep
                onComplete={(data) => handleStepComplete({ basicInfo: data })}
                initialData={onboardingData.basicInfo}
                isSubmitting={isSubmitting}
              />
            )}
            {step === 2 && (
              <StressAssessmentStep
                onComplete={(data) => handleStepComplete({ stressAssessment: data })}
                initialData={onboardingData.stressAssessment}
                isSubmitting={isSubmitting}
              />
            )}
            {step === 3 && (
              <ChildProfileStep
                onComplete={(profiles) => handleStepComplete({ childProfiles: profiles })}
                initialData={onboardingData.childProfiles}
                isSubmitting={isSubmitting}
              />
            )}
            {step === 4 && (
              <GoalsStep
                onComplete={(data) => handleStepComplete({ goals: data })}
                initialData={onboardingData.goals}
                isSubmitting={isSubmitting}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}