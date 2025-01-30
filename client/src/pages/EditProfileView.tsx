import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronLeft, Loader2 } from "lucide-react";

type OnboardingData = {
  basicInfo: {
    name: string;
    experienceLevel: "first_time" | "experienced" | "multiple_children";
  };
  stressAssessment: {
    stressLevel: "low" | "moderate" | "high" | "very_high";
    primaryConcerns: string[];
    supportNetwork: string[];
  };
};

type ProfileResponse = {
  onboardingData: OnboardingData;
};

const defaultFormData: OnboardingData = {
  basicInfo: {
    name: "",
    experienceLevel: "first_time",
  },
  stressAssessment: {
    stressLevel: "low",
    primaryConcerns: [],
    supportNetwork: [],
  },
};

const isValidJson = (text: string): boolean => {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
};

export default function EditProfileView() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState<OnboardingData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: profile, isLoading } = useQuery<ProfileResponse>({
    queryKey: ['/api/onboarding/progress'],
    retry: false,
    queryFn: async ({ queryKey }) => {
      const response = await fetch(queryKey[0] as string, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile data');
      }

      const text = await response.text();
      if (!isValidJson(text)) {
        throw new Error('Invalid response format: expected JSON');
      }

      const data = JSON.parse(text);
      if (!data.onboardingData) {
        throw new Error('Invalid response format: missing onboardingData');
      }

      return data;
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to load profile data",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (profile?.onboardingData) {
      setFormData({
        ...defaultFormData,
        ...profile.onboardingData,
        basicInfo: {
          ...defaultFormData.basicInfo,
          ...profile.onboardingData.basicInfo,
        },
        stressAssessment: {
          ...defaultFormData.stressAssessment,
          ...profile.onboardingData.stressAssessment,
        },
      });
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: OnboardingData) => {
      try {
        const response = await fetch("/api/profile/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
          credentials: 'include'
        });

        const responseText = await response.text();
        console.log('Response text:', responseText); 

        if (!response.ok) {
          throw new Error(responseText || `HTTP error! status: ${response.status}`);
        }

        if (response.headers.get("content-type")?.includes("application/json")) {
          if (!isValidJson(responseText)) {
            throw new Error('Server returned invalid JSON');
          }
          return JSON.parse(responseText);
        }

        return { success: true };
      } catch (error) {
        console.error('Update profile error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Je profiel is bijgewerkt",
      });
      setLocation("/profile");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateProfileMutation.mutateAsync(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setLocation("/profile");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="min-h-screen animate-gradient" style={{
      backgroundSize: "400% 400%",
      background: `linear-gradient(135deg, #F8DD9F 0%, #F2F0E5 50%, #F2F0E5 100%)`
    }}>
      <div className="p-4 border-b">
        <Button
          variant="ghost"
          onClick={() => setLocation("/profile")}
          className="mb-2"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Terug naar profiel
        </Button>
        <h1 className="text-2xl font-bold">Bewerk Profiel</h1>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Basis Informatie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Naam</Label>
              <Input
                id="name"
                value={formData.basicInfo.name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    basicInfo: {
                      ...formData.basicInfo,
                      name: e.target.value,
                    },
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="experienceLevel">Ervaring niveau</Label>
              <Select
                value={formData.basicInfo.experienceLevel}
                onValueChange={(value: "first_time" | "experienced" | "multiple_children") =>
                  setFormData({
                    ...formData,
                    basicInfo: {
                      ...formData.basicInfo,
                      experienceLevel: value,
                    },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer ervaring niveau" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first_time">Eerste kind</SelectItem>
                  <SelectItem value="experienced">Ervaren</SelectItem>
                  <SelectItem value="multiple_children">Meerdere kinderen</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stress & Ondersteuning</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stressLevel">Stress niveau</Label>
              <Select
                value={formData.stressAssessment.stressLevel}
                onValueChange={(value: "low" | "moderate" | "high" | "very_high") =>
                  setFormData({
                    ...formData,
                    stressAssessment: {
                      ...formData.stressAssessment,
                      stressLevel: value,
                    },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer stress niveau" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Laag</SelectItem>
                  <SelectItem value="moderate">Gemiddeld</SelectItem>
                  <SelectItem value="high">Hoog</SelectItem>
                  <SelectItem value="very_high">Zeer hoog</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Annuleren
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Opslaan...
              </>
            ) : (
              "Wijzigingen opslaan"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}