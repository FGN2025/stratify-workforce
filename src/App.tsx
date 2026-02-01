import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TenantProvider } from "@/contexts/TenantContext";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import WorkOrders from "./pages/WorkOrders";
import Leaderboard from "./pages/Leaderboard";
import Students from "./pages/Students";
import Settings from "./pages/Settings";
import Communities from "./pages/Communities";
import CommunityProfile from "./pages/CommunityProfile";
import AgentWidget from "./pages/AgentWidget";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TenantProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/work-orders" element={<WorkOrders />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/students" element={<Students />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/communities" element={<Communities />} />
            <Route path="/community/:slug" element={<CommunityProfile />} />
            <Route path="/agent-widget" element={<AgentWidget />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </TenantProvider>
  </QueryClientProvider>
);

export default App;
