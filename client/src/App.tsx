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
import PageTransition from "@/components/PageTransition";

function Router() {
  const { user, isLoading } = useUser();
  const [location, setLocation] = useLocation();

  // Only scroll to top when location changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  const showNavigation = !location.startsWith('/learn/') && !location.startsWith('/onboarding');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  // Show auth page for unauthenticated users
  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className={`flex-1 ${showNavigation ? 'pb-16' : ''}`}>
        <PageTransition>
          <Switch>
            <Route path="/onboarding" component={OnboardingPage} />
            <Route path="/" component={HomeView} />
            <Route path="/chat" component={ChatHistoryView} />
            <Route path="/chat/:id" component={ChatView} />
            <Route path="/chat/history" component={ChatHistoryView} />
            <Route path="/village" component={VillageView} />
            <Route path="/learn" component={LearnView} />
            <Route path="/learn/:id" component={LearnDetailView} />
            <Route path="/profile" component={ProfileView} />
            <Route path="/profile/edit" component={EditProfileView} />
            <Route component={NotFound} />
          </Switch>
        </PageTransition>
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