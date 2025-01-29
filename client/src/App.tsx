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

function Router() {
  const { user, isLoading, checkSession } = useUser();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    console.log('[App Debug] Router mounted, current state:', {
      user,
      isLoading,
      location
    });

    // Force session check on initial load
    if (checkSession) {
      console.log('[App Debug] Running initial session check');
      checkSession();
    }

    if (location.includes('initialPath')) {
      const cleanPath = new URLSearchParams(location.split('?')[1]).get('initialPath') || '/';
      setLocation(cleanPath);
    }
    window.scrollTo(0, 0);
  }, [checkSession]);

  const showNavigation = !location.startsWith('/learn/') && !location.startsWith('/onboarding');

  if (isLoading) {
    console.log('[App Debug] App is in loading state');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  console.log('[App Debug] Rendering app with user state:', user);

  if (!user) {
    console.log('[App Debug] No user found, showing AuthPage');
    return <AuthPage />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className={`flex-1 ${showNavigation ? 'pb-16' : ''}`}>
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
      </div>
      {showNavigation && <Navigation />}
      <OnboardingTooltip />
    </div>
  );
}

function App() {
  console.log('[App Debug] Initial App component mount');
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