import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const authSchema = z.object({
  username: z.string()
    .min(3, "Gebruikersnaam moet minimaal 3 tekens bevatten")
    .max(50, "Gebruikersnaam mag maximaal 50 tekens bevatten"),
  password: z.string()
    .min(6, "Wachtwoord moet minimaal 6 tekens bevatten")
    .max(50, "Wachtwoord mag maximaal 50 tekens bevatten")
});

type AuthFormData = z.infer<typeof authSchema>;

export default function AuthPage() {
  const { login, register } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const [currentTab, setCurrentTab] = useState<"login" | "register">("login");

  const form = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      username: "",
      password: ""
    }
  });

  const handleSubmit = async (data: AuthFormData) => {
    setIsSubmitting(true);
    setAuthError(null);

    try {
      if (currentTab === "login") {
        await login(data);
      } else {
        await register(data);
        setLocation("/onboarding");
      }
    } catch (err) {
      if (err instanceof Error) {
        const errorMessage = err.message.toLowerCase();
        if (errorMessage.includes("already exists")) {
          setAuthError("Deze gebruikersnaam bestaat al");
        } else if (errorMessage.includes("incorrect password")) {
          setAuthError("Onjuist wachtwoord");
        } else if (errorMessage.includes("incorrect username")) {
          setAuthError("Gebruikersnaam niet gevonden");
        } else {
          setAuthError(err.message);
        }
      } else {
        setAuthError("Er is een onverwachte fout opgetreden");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-cover bg-no-repeat bg-center p-4" 
      style={{ backgroundImage: 'url(/images/KEyvisual_family1_1.jpg)' }}
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <img 
            src="images/nuri_logo_green.png" 
            alt="Nuri Logo" 
            className="mx-auto mb-4" 
            style={{ maxWidth: '180px' }} 
          />
          <CardTitle className="text-2xl text-center font-baskerville font-normal">
            Welkom.
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={currentTab} onValueChange={(value) => {
            setCurrentTab(value as "login" | "register");
            setAuthError(null);
            form.reset();
          }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Inloggen</TabsTrigger>
              <TabsTrigger value="register">Registreren</TabsTrigger>
            </TabsList>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gebruikersnaam</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="text"
                          disabled={isSubmitting}
                          className="bg-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wachtwoord</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="password"
                          disabled={isSubmitting}
                          className="bg-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {authError && (
                  <div className="bg-destructive/10 text-destructive px-3 py-2 rounded-md text-sm">
                    {authError}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "Laden..."
                    : currentTab === "login"
                    ? "Inloggen"
                    : "Registreren"}
                </Button>
              </form>
            </Form>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}