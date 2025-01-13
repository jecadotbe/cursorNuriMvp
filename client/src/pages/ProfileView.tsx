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
    <div className="min-h-screen p-4 space-y-6">
      <Card className="bg-gradient-to-br from-yellow-50 to-orange-50">
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-xl">
              {user?.username[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl">Je profiel</CardTitle>
            <CardDescription>
              Fijn je weer te zien. Waarover wil je praten?
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      {sections.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">
              {section.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {section.items.map((item) => (
              <Button
                key={item.label}
                variant="ghost"
                className="w-full justify-start"
              >
                {item.label}
              </Button>
            ))}
          </CardContent>
        </Card>
      ))}

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-destructive">
            THE DANGER ZONE
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
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