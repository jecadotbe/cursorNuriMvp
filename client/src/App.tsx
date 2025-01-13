import { Switch, Route } from "wouter";
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
import Navigation from "@/components/Navigation";

function Router() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 pb-16">
        <Switch>
          <Route path="/" component={HomeView} />
          <Route path="/chat/history" component={ChatHistoryView} />
          <Route path="/chat/:id" component={ChatView} />
          <Route path="/chat" component={ChatView} />
          <Route path="/village" component={VillageView} />
          <Route path="/learn" component={LearnView} />
          <Route path="/profile" component={ProfileView} />
          <Route component={NotFound} />
        </Switch>
      </div>
      <Navigation />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;