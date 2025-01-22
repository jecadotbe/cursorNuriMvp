import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";

export default function AuthPage() {
  const { login, register } = useUser();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  const handleSubmit = async (action: "login" | "register") => {
    setIsSubmitting(true);
    setError(null);
    
    if (!username || !password) {
      setError("Gebruikersnaam en wachtwoord zijn verplicht");
      setIsSubmitting(false);
      return;
    }

    if (password.length < 6) {
      setError("Wachtwoord moet minimaal 6 tekens bevatten");
      setIsSubmitting(false);
      return;
    }

    try {
      if (action === "login") {
        await login({ username, password });
      } else {
        if (username.length < 3) {
          throw new Error("Gebruikersnaam moet minimaal 3 tekens bevatten");
        }
        await register({ username, password });
        // After successful registration, redirect to onboarding
        setLocation("/onboarding");
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes("already exists")) {
          setError("Deze gebruikersnaam bestaat al");
        } else if (err.message.includes("Incorrect password")) {
          setError("Incorrect wachtwoord");
        } else if (err.message.includes("Incorrect username")) {
          setError("Gebruikersnaam niet gevonden");
        } else {
          setError(err.message);
        }
      } else {
        setError("Er is een fout opgetreden");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-no-repeat bg-center p-4" style={{ backgroundImage: 'url(/images/KEyvisual_family1_1.jpg)' }}>
      <Card className="w-full max-w-md">
        <CardHeader>
          <img src="images/nuri_logo_green.png" alt="Nuri Logo" className="mx-auto mb-4" style={{ maxWidth: '180px' }} />
          <CardTitle className="text-2xl text-center font-baskerville font-normal">Welkom.</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Inloggen</TabsTrigger>
              <TabsTrigger value="register">Registreren</TabsTrigger>
            </TabsList>

            {["login", "register"].map((tab) => (
              <TabsContent key={tab} value={tab}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit(tab as "login" | "register");
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="username">Gebruikersnaam</Label>
                    <Input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Wachtwoord</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  {error && (
                    <div className="bg-destructive/10 text-destructive px-3 py-2 rounded-md text-sm mb-4">
                      {error}
                    </div>
                  )}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? "Laden..."
                      : tab === "login"
                      ? "Inloggen"
                      : "Registreren"}
                  </Button>
                </form>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}