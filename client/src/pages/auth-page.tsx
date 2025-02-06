import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { login, register } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
  });

  const handleLogin = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      await login(data);
      toast({
        title: "Success",
        description: "Successfully logged in!",
      });
      loginForm.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Login failed",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    try {
      await register(data);
      toast({
        title: "Success",
        description: "Successfully registered! Redirecting to onboarding...",
      });
      registerForm.reset();
      setLocation("/onboarding");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Registration failed",
        variant: "destructive",
      });
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
                onSubmit={loginForm.handleSubmit(handleLogin)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="username-login">Username</Label>
                  <Input
                    id="username-login"
                    type="text"
                    {...loginForm.register("username")}
                    aria-invalid={!!loginForm.formState.errors.username}
                  />
                  {loginForm.formState.errors.username && (
                    <p className="text-sm text-destructive">
                      {loginForm.formState.errors.username.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-login">Password</Label>
                  <Input
                    id="password-login"
                    type="password"
                    {...loginForm.register("password")}
                    aria-invalid={!!loginForm.formState.errors.password}
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Login"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form
                onSubmit={registerForm.handleSubmit(handleRegister)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="username-register">Username</Label>
                  <Input
                    id="username-register"
                    type="text"
                    {...registerForm.register("username")}
                    aria-invalid={!!registerForm.formState.errors.username}
                  />
                  {registerForm.formState.errors.username && (
                    <p className="text-sm text-destructive">
                      {registerForm.formState.errors.username.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-register">Email</Label>
                  <Input
                    id="email-register"
                    type="email"
                    {...registerForm.register("email")}
                    aria-invalid={!!registerForm.formState.errors.email}
                  />
                  {registerForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {registerForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-register">Password</Label>
                  <Input
                    id="password-register"
                    type="password"
                    {...registerForm.register("password")}
                    aria-invalid={!!registerForm.formState.errors.password}
                  />
                  {registerForm.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {registerForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Register"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}