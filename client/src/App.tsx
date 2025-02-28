import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import { useUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";
import HomeView from "@/pages/HomeView";
import ChatView from "@/pages/ChatView";
import ChatHistoryView from "@/pages/ChatHistoryView";
import VillageView from "@/pages/VillageView";
import LearnView from "@/pages/LearnView";
import ProfileView from "@/pages/ProfileView";
import EditProfileView from "@/pages/EditProfileView";
import Navigation from "@/components/Navigation";
import { OnboardingProvider } from "@/context/onboarding-context";
import OnboardingTooltip from "@/components/OnboardingTooltip";
import LearnDetailView from "./pages/LearnDetailView";
import OnboardingPage from "@/pages/onboarding";
import BuildingProfilePage from "@/pages/building-profile";
import WelcomePage from "./pages/welcome";
import ResetPasswordPage from "@/pages/reset-password";
import ResetPasswordTokenPage from "@/pages/reset-password/[token]";
import AdminDashboard from "@/pages/admin";

function Router() {
  const { user, isLoading } = useUser();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  const showNavigation = !location.startsWith('/learn/') && !location.startsWith('/onboarding') && !location.startsWith('/welcome');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  // Add public routes that don't require authentication
  if (!user) {
    return (
      <Switch>
        <Route path="/reset-password" component={ResetPasswordPage} />
        <Route path="/reset-password/:token" component={ResetPasswordTokenPage} />
        <Route component={AuthPage} />
      </Switch>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className={`flex-1 ${showNavigation ? 'pb-16' : ''}`}>
        <Switch>
          <Route path="/welcome" component={WelcomePage} />
          <Route path="/onboarding" component={OnboardingPage} />
          <Route path="/building-profile" component={BuildingProfilePage} />
          <Route path="/" component={HomeView} />
          <Route path="/chat" component={ChatHistoryView} />
          <Route path="/chat/:id" component={ChatView} />
          <Route path="/chat/history" component={ChatHistoryView} />
          <Route path="/village" component={VillageView} />
          <Route path="/learn" component={LearnView} />
          <Route path="/learn/:id" component={LearnDetailView} />
          <Route path="/profile" component={ProfileView} />
          <Route path="/profile/edit" component={EditProfileView} />
          <Route path="/admin" component={AdminDashboard} />
          <Route component={NotFound} />
        </Switch>
      </div>
      {showNavigation && <Navigation />}
      <OnboardingTooltip />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <OnboardingProvider>
        <Router />
        <Toaster />
      </OnboardingProvider>
    </QueryClientProvider>
  );
}

export default App;