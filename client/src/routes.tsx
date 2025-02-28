import { Route, Switch } from "wouter";
import AuthPage from "./pages/auth-page";
import LoginPage from "./pages/LoginPage";
import HomeView from "./pages/HomeView";
import { ProtectedRoute } from "./components/ProtectedRoute";
import ChatView from "./pages/ChatView";
import VillageView from "./pages/VillageView";
import LearnView from "./pages/LearnView";
import ProfileView from "./pages/ProfileView";
import SettingsView from "./pages/SettingsView";
import NotFoundView from "./pages/NotFoundView";

export function Routes() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/">
        <ProtectedRoute>
          <HomeView />
        </ProtectedRoute>
      </Route>

      <Route path="/chat/:id">
        {(params) => (
          <ProtectedRoute>
            <ChatView id={params.id} />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/village">
        <ProtectedRoute>
          <VillageView />
        </ProtectedRoute>
      </Route>

      <Route path="/learn">
        <ProtectedRoute>
          <LearnView />
        </ProtectedRoute>
      </Route>

      <Route path="/profile">
        <ProtectedRoute>
          <ProfileView />
        </ProtectedRoute>
      </Route>

      <Route path="/settings">
        <ProtectedRoute>
          <SettingsView />
        </ProtectedRoute>
      </Route>

      <Route component={NotFoundView} />
    </Switch>
  );
}