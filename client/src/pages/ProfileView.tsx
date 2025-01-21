import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronRight, Edit2 } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

type OnboardingData = {
  basicInfo?: {
    name: string;
    email: string;
    experienceLevel: string;
  };
  stressAssessment?: {
    stressLevel: string;
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

export default function ProfileView() {
  const { user, logout } = useUser();
  const [, setLocation] = useLocation();

  const { data: profile } = useQuery({
    queryKey: ['/api/onboarding/progress'],
  });

  const handleLogout = async () => {
    await logout();
  };

  const sections = [
    {
      title: "PROFIEL & ONBOARDING",
      items: [
        { 
          label: "Beheer je profiel gegevens", 
          action: () => setLocation("/profile/edit"),
          description: profile?.completedOnboarding ? "Pas je profiel aan" : "Rond onboarding af"
        },
      ],
    },
    {
      title: "ACCOUNT & BETAALGEGEVENS",
      items: [
        { label: "Account instellingen", href: "#" },
        { label: "Beheer abonnement & betalingen", href: "#" },
      ],
    },
    {
      title: "PRIVACY SETTINGS",
      items: [
        { label: "Privacy instellingen", href: "#" },
        { label: "Beheer abonnement", href: "#" },
      ],
    },
  ];

  const onboardingData = profile?.onboardingData as OnboardingData;

  return (
    <div className="min-h-screen space-y-6 bg-[#F2F0E5] pb-20">
      <div className="w-full bg-gradient-to-r from-[#F8DD9F] to-[#F2F0E5] via-[#F2F0E5] via-35%">
        <div className="px-4 py-6">
          <div className="flex items-start gap-4">
            <div className="relative">
              <Avatar className="h-24 w-24">
                {user?.profilePicture ? (
                  <AvatarImage src={user.profilePicture} alt="Profile picture" />
                ) : (
                  <AvatarFallback className="text-2xl">
                    {user?.username[0]}
                  </AvatarFallback>
                )}
              </Avatar>
              <input
                type="file"
                id="profilePicture"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  if (file.size > 2 * 1024 * 1024) {
                    toast({
                      variant: "destructive",
                      title: "Error",
                      description: "File size must be less than 2MB"
                    });
                    return;
                  }

                  const formData = new FormData();
                  formData.append('profilePicture', file);

                  try {
                    const response = await fetch('/api/profile/picture', {
                      method: 'POST',
                      body: formData,
                      credentials: 'include'
                    });

                    if (!response.ok) throw new Error('Upload failed');

                    const data = await response.json();
                    window.location.reload();
                  } catch (error) {
                    toast({
                      variant: "destructive",
                      title: "Error",
                      description: "Failed to upload profile picture"
                    });
                  }
                }}
              />
              <label
                htmlFor="profilePicture"
                className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1.5 cursor-pointer hover:bg-primary/90 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </label>
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl text-[#2F4644] font-baskerville">
                Dag {onboardingData?.basicInfo?.name || user?.username},
              </h1>
              <p className="text-xl text-[#2F4644]">
                Pas instellingen aan
              </p>
            </div>
          </div>
        </div>
      </div>

      

      {sections.map((section) => (
        <Card key={section.title} className="mx-4">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                section.title.includes('PRIVACY') ? 'bg-green-500' : 'bg-orange-500'
              }`} />
              {section.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-4">
            {section.items.map((item) => (
              <Button
                key={item.label}
                variant="ghost"
                className="w-full justify-between text-lg font-normal hover:bg-transparent"
                onClick={item.action ? item.action : undefined}
                {...(item.href ? { as: "a", href: item.href } : {})}
              >
                <div>
                  {item.label}
                  {item.description && (
                    <p className="text-sm text-muted-foreground text-left">{item.description}</p>
                  )}
                </div>
                <ChevronRight className="h-5 w-5" />
              </Button>
            ))}
          </CardContent>
        </Card>
      ))}

      <Card className="border-destructive mx-4">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            THE DANGER ZONE
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-4">
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleLogout}
          >
            Uitloggen
          </Button>
          <Button
            variant="outline"
            className="w-full border-destructive text-destructive hover:bg-destructive/10"
          >
            Account verwijderen
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}