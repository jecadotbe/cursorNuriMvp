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

export default function ProfileView() {
  const { user, logout } = useUser();

  const handleLogout = async () => {
    await logout();
  };

  const sections = [
    {
      title: "ACCOUNT & BETAALGEGEVENS",
      items: [
        { label: "Account instellingen", href: "#" },
        { label: "Beheer abonnement & betalingen", href: "#" },
        { label: "Accounts beheren", href: "#" },
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

  return (
    <div className="min-h-screen space-y-6 bg-[#F2F0E5]">
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
                Dag {user?.username},
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
              >
                {item.label}
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