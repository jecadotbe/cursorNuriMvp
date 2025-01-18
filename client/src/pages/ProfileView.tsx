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
import { ChevronRight } from "lucide-react";
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

  const startOnboarding = () => {
    setLocation("/onboarding");
  };

  const sections = [
    {
      title: "PROFIEL & ONBOARDING",
      items: [
        { 
          label: "Beheer je profiel gegevens", 
          action: () => setLocation("/onboarding"),
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
            <Avatar className="h-24 w-24">
              <AvatarFallback className="text-2xl">
                {user?.username[0]}
              </AvatarFallback>
            </Avatar>
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

      {profile?.completedOnboarding && onboardingData && (
        <Card className="mx-4">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              JOUW PROFIEL
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {onboardingData.basicInfo && (
              <div>
                <h3 className="font-medium mb-2">Basis Informatie</h3>
                <p>Ervaring: {onboardingData.basicInfo.experienceLevel}</p>
              </div>
            )}

            {onboardingData.stressAssessment && (
              <div>
                <h3 className="font-medium mb-2">Stress & Ondersteuning</h3>
                <p>Stress niveau: {onboardingData.stressAssessment.stressLevel}</p>
                {onboardingData.stressAssessment.primaryConcerns.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground">Belangrijkste zorgen:</p>
                    <ul className="list-disc list-inside">
                      {onboardingData.stressAssessment.primaryConcerns.map((concern, i) => (
                        <li key={i} className="text-sm">{concern}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {onboardingData.childProfiles && onboardingData.childProfiles.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Kinderen</h3>
                <div className="space-y-2">
                  {onboardingData.childProfiles.map((child, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <p className="font-medium">{child.name}</p>
                      <p className="text-sm">Leeftijd: {child.age} jaar</p>
                      {child.specialNeeds.length > 0 && (
                        <div className="mt-1">
                          <p className="text-sm text-muted-foreground">Speciale behoeften:</p>
                          <ul className="list-disc list-inside">
                            {child.specialNeeds.map((need, i) => (
                              <li key={i} className="text-sm">{need}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {onboardingData.goals && (
              <div>
                <h3 className="font-medium mb-2">Doelen</h3>
                {onboardingData.goals.shortTerm.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground">Korte termijn:</p>
                    <ul className="list-disc list-inside">
                      {onboardingData.goals.shortTerm.map((goal, i) => (
                        <li key={i} className="text-sm">{goal}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {onboardingData.goals.longTerm.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground">Lange termijn:</p>
                    <ul className="list-disc list-inside">
                      {onboardingData.goals.longTerm.map((goal, i) => (
                        <li key={i} className="text-sm">{goal}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <Button
              onClick={startOnboarding}
              variant="outline"
              className="w-full mt-4"
            >
              Bewerk Profiel
            </Button>
          </CardContent>
        </Card>
      )}

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
                    <p className="text-sm text-muted-foreground">{item.description}</p>
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