import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TenantProvider } from "@/contexts/TenantContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { TutorProvider } from "@/contexts/TutorContext";
import { TutorChatButton } from "@/components/tutor/TutorChatButton";
import { TutorChatPanel } from "@/components/tutor/TutorChatPanel";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { DeveloperRoute } from "@/components/auth/DeveloperRoute";
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
import AuthDiscordCallback from "./pages/AuthDiscordCallback";
import AgentWidget from "./pages/AgentWidget";
import Admin from "./pages/Admin";
import Learn from "./pages/Learn";
import WorkOrderDetail from "./pages/WorkOrderDetail";
import Developers from "./pages/Developers";
import AITest from "./pages/AITest";
import HelpAdmin from "./pages/HelpAdmin";
import HelpStudent from "./pages/HelpStudent";
import PublicPassport from "./pages/PublicPassport";
import Careers from "./pages/Careers";
import EmbedPassport from "./pages/EmbedPassport";
import Activity from "./pages/Activity";
import VerifyCredential from "./pages/VerifyCredential";
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
            <TutorProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/discord/callback" element={<AuthDiscordCallback />} />
              <Route path="/" element={<Index />} />
              <Route path="/passport/:slug" element={<PublicPassport />} />
              <Route path="/embed/passport/:slug" element={<EmbedPassport />} />
              <Route path="/communities" element={<Communities />} />
              <Route path="/community/:slug" element={<CommunityProfile />} />
              <Route path="/careers" element={<Careers />} />
              <Route path="/verify" element={<VerifyCredential />} />
              
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
                <AdminRoute><Students /></AdminRoute>
              } />
              <Route path="/settings" element={
                <AdminRoute><Settings /></AdminRoute>
              } />
              <Route path="/admin" element={
                <AdminRoute><Admin /></AdminRoute>
              } />
              <Route path="/developers" element={
                <DeveloperRoute><Developers /></DeveloperRoute>
              } />
              <Route path="/agent-widget" element={<AgentWidget />} />
              <Route path="/help/admin" element={
                <AdminRoute><HelpAdmin /></AdminRoute>
              } />
              <Route path="/help/student" element={
                <ProtectedRoute><HelpStudent /></ProtectedRoute>
              } />
               <Route path="/ai-test" element={<AITest />} />
              <Route path="/activity" element={
                <ProtectedRoute><Activity /></ProtectedRoute>
              } />
              
              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
              {/* Tutor Components */}
              <TutorChatButton />
              <TutorChatPanel />
            </TutorProvider>
          </BrowserRouter>
        </TooltipProvider>
      </TenantProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
