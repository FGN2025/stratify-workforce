import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export interface HubTab {
  /** The admin section key; each tab keeps its old /admin/<section> address. */
  section: string;
  label: string;
  render: () => ReactNode;
}

/** One admin page with tabs; switching tabs updates the address so old bookmarks still land on the right tab. */
export function AdminHubTabs({ title, description, tabs, active }: { title: string; description: string; tabs: HubTab[]; active: string }) {
  const navigate = useNavigate();
  const current = tabs.some((t) => t.section === active) ? active : tabs[0].section;
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Tabs value={current} onValueChange={(v) => navigate(`/admin/${v}`, { replace: true })}>
        <TabsList className="w-full sm:w-auto overflow-x-auto">
          {tabs.map((t) => <TabsTrigger key={t.section} value={t.section}>{t.label}</TabsTrigger>)}
        </TabsList>
        {tabs.map((t) => (
          <TabsContent key={t.section} value={t.section}>{t.section === current ? t.render() : null}</TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
