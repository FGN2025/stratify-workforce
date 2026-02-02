import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TenantProvider } from "@/contexts/TenantContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import WorkOrders from "./pages/WorkOrders";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import Leaderboard from "./pages/Leaderboard";
import Students from "./pages/Students";
import Settings from "./pages/Settings";
import Communities from "./pages/Communities";
import CommunityProfile from "./pages/CommunityProfile";
import Auth from "./pages/Auth";
import AgentWidget from "./pages/AgentWidget";
import Admin from "./pages/Admin";
import Learn from "./pages/Learn";
import WorkOrderDetail from "./pages/WorkOrderDetail";
import Developers from "./pages/Developers";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TenantProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<Index />} />
              <Route path="/communities" element={<Communities />} />
              <Route path="/community/:slug" element={<CommunityProfile />} />
              
              {/* Learning routes */}
              <Route path="/learn" element={<Learn />} />
              
              {/* Events routes */}
              <Route path="/events" element={<Events />} />
              <Route path="/events/:id" element={
                <ProtectedRoute><EventDetail /></ProtectedRoute>
              } />
              
              {/* Profile routes */}
              <Route path="/profile" element={
                <ProtectedRoute><Profile /></ProtectedRoute>
              } />
              <Route path="/profile/:userId" element={
                <ProtectedRoute><Profile /></ProtectedRoute>
              } />
              <Route path="/work-orders" element={
                <ProtectedRoute><WorkOrders /></ProtectedRoute>
              } />
              <Route path="/work-orders/:id" element={
                <ProtectedRoute><WorkOrderDetail /></ProtectedRoute>
              } />
              <Route path="/leaderboard" element={
                <ProtectedRoute><Leaderboard /></ProtectedRoute>
              } />
              <Route path="/students" element={
                <ProtectedRoute><Students /></ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute><Settings /></ProtectedRoute>
              } />
              <Route path="/admin" element={
                <AdminRoute><Admin /></AdminRoute>
              } />
              <Route path="/developers" element={<Developers />} />
              <Route path="/agent-widget" element={<AgentWidget />} />
              
              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </TenantProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
