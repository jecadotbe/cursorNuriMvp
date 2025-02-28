import { createRoot } from "react-dom/client";
import App from './App';
import "./index.css";
import { UserProvider } from "@/hooks/use-user.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Initialize the query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <UserProvider>
      <App/>
    </UserProvider>
  </QueryClientProvider>
);
