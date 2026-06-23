import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { TopNav } from './TopNav';
import { Footer } from './Footer';
import { TenantSetupGate } from '@/components/TenantSetupGate';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1">
          <TopNav />
          <main className="flex-1 overflow-auto scrollbar-dark px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="mx-auto w-full max-w-7xl 2xl:max-w-[1400px]">
              {children}
            </div>
          </main>
          <Footer />
        </SidebarInset>
      </div>
      <TenantSetupGate />
    </SidebarProvider>
  );
}
