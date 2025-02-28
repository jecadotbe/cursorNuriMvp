import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Info } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Link } from "wouter";

const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: passwordSchema,
});

const registerSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
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
    mode: "onChange",
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
  });

  const handleLogin = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      // Use explicit username and password for the login function
      const success = await login(data.username, data.password, false);
      console.log("Login attempt result:", success);
      loginForm.reset();
      
      if (success) {
        console.log("Login successful! Redirecting to home page");
        
        // Small delay to ensure state updates properly
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Use wouter setLocation for client-side navigation
        setLocation("/");
      }
    } catch (error) {
      console.error("Login error:", error);
      // Error handling is done in useUser hook via toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    try {
      // Use explicit username, email, and password for the register function
      const success = await register(data.username, data.email, data.password);
      console.log("Registration attempt result:", success);
      registerForm.reset();
      
      if (success) {
        console.log("Registration successful! Redirecting to welcome page");
        
        // Small delay to ensure state updates properly
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Use wouter setLocation for client-side navigation
        setLocation("/welcome");
      }
    } catch (error) {
      console.error("Registration error:", error);
      // Error handling is done in useUser hook via toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-no-repeat bg-center p-4" style={{ backgroundImage: 'url(/images/KEyvisual_family1_1.jpg)' }}>
      <Card className="w-full max-w-md">
        <CardHeader>
          <img src="/images/nuri_logo_green.png" alt="Nuri Logo" className="mx-auto mb-4" style={{ maxWidth: '180px' }} />
          <CardTitle className="text-2xl text-center font-baskerville font-normal">Welkom.</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Registreren</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="text"
                            aria-invalid={!!loginForm.formState.errors.username}
                          />
                        </FormControl>
                        <FormMessage className="text-sm text-destructive" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Password</FormLabel>
                          <HoverCard>
                            <HoverCardTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </HoverCardTrigger>
                            <HoverCardContent>
                              <p>Password must contain:</p>
                              <ul className="list-disc pl-4 text-sm">
                                <li>At least 8 characters</li>
                                <li>One uppercase letter</li>
                                <li>One lowercase letter</li>
                                <li>One number</li>
                                <li>One special character</li>
                              </ul>
                            </HoverCardContent>
                          </HoverCard>
                        </div>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="password"
                            aria-invalid={!!loginForm.formState.errors.password}
                          />
                        </FormControl>
                        <FormMessage className="text-sm text-destructive" />
                        <Link href="/reset-password" className="text-sm text-primary hover:underline block mt-2">
                          Forgot password?
                        </Link>
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting || !loginForm.formState.isValid}
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
              </Form>
            </TabsContent>

            <TabsContent value="register">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="text"
                            aria-invalid={!!registerForm.formState.errors.username}
                          />
                        </FormControl>
                        <FormMessage className="text-sm text-destructive" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="email"
                            aria-invalid={!!registerForm.formState.errors.email}
                          />
                        </FormControl>
                        <FormMessage className="text-sm text-destructive" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Password</FormLabel>
                          <HoverCard>
                            <HoverCardTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </HoverCardTrigger>
                            <HoverCardContent>
                              <p>Password must contain:</p>
                              <ul className="list-disc pl-4 text-sm">
                                <li>At least 8 characters</li>
                                <li>One uppercase letter</li>
                                <li>One lowercase letter</li>
                                <li>One number</li>
                                <li>One special character</li>
                              </ul>
                            </HoverCardContent>
                          </HoverCard>
                        </div>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="password"
                            aria-invalid={!!registerForm.formState.errors.password}
                          />
                        </FormControl>
                        <FormMessage className="text-sm text-destructive" />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting || !registerForm.formState.isValid}
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
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}