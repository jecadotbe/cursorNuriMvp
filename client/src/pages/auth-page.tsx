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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setLocation] = useLocation();

  const handleSubmit = async (action: "login" | "register") => {
    setIsSubmitting(true);
    try {
      if (action === "login") {
        await login({ username, password });
      } else {
        await register({ username, email, password });
        // After successful registration, redirect to onboarding
        setLocation("/onboarding");
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
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Registreren</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit("login");
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="username-login">Username</Label>
                  <Input
                    id="username-login"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-login">Password</Label>
                  <Input
                    id="password-login"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Loading..." : "Login"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit("register");
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="username-register">Username</Label>
                  <Input
                    id="username-register"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-register">Email</Label>
                  <Input
                    id="email-register"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-register">Password</Label>
                  <Input
                    id="password-register"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Loading..." : "Register"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}