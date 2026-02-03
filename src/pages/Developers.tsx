import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ApiSidebar } from '@/components/developers/ApiSidebar';
import { EndpointCard } from '@/components/developers/EndpointCard';
import { ApiTryIt } from '@/components/developers/ApiTryIt';
import { CodeBlock } from '@/components/developers/CodeBlock';
import { MyAppsSection } from '@/components/developers/MyAppsSection';
import { ALL_APIS, CREDENTIAL_API, PUBLIC_CATALOG_API } from '@/lib/api-docs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExternalLink, FileCode, Key, Zap, BookOpen } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';

export default function Developers() {
  const { user } = useAuth();
  const { isDeveloper, isLoading: roleLoading } = useUserRole();
  const [activeTab, setActiveTab] = useState('docs');
  const [activeApi, setActiveApi] = useState(CREDENTIAL_API.id);
  const [activeEndpoint, setActiveEndpoint] = useState<string | null>(null);

  // Determine if user can access the My Apps tab
  const canAccessApps = user && isDeveloper;

  const currentApi = ALL_APIS.find(a => a.id === activeApi) || CREDENTIAL_API;
  const currentEndpoint = currentApi.endpoints.find(e => e.id === activeEndpoint);

  const handleEndpointClick = (apiId: string, endpointId: string) => {
    setActiveApi(apiId);
    setActiveEndpoint(endpointId);
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar - only show for docs tab */}
        {activeTab === 'docs' && (
          <ApiSidebar 
            apis={ALL_APIS} 
            activeEndpoint={activeEndpoint || undefined}
            onEndpointClick={handleEndpointClick}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Top Navigation Tabs */}
          <div className="border-b bg-card px-6 py-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="docs" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  Documentation
                </TabsTrigger>
                {canAccessApps && (
                  <TabsTrigger value="apps" className="gap-2">
                    <Key className="h-4 w-4" />
                    My Apps
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>
          </div>

          <ScrollArea className="flex-1">
            {/* Documentation Tab */}
            {activeTab === 'docs' && (
              <div className="max-w-4xl mx-auto p-8 space-y-12">
                {/* Hero */}
                <section id="overview" className="space-y-4">
                  <Badge variant="secondary" className="mb-2">Developer Portal</Badge>
                  <h1 className="text-4xl font-bold tracking-tight">FGN.Academy APIs</h1>
                  <p className="text-xl text-muted-foreground">
                    Integrate training content, credentials, and skills data into your applications.
                  </p>
                  <div className="flex gap-3 pt-4">
                    {canAccessApps ? (
                      <Button onClick={() => setActiveTab('apps')}>
                        <Key className="mr-2 h-4 w-4" />
                        Manage API Keys
                      </Button>
                    ) : (
                      <Button variant="outline" disabled>
                        <Key className="mr-2 h-4 w-4" />
                        Developer Access Required
                      </Button>
                    )}
                    <Button variant="outline" asChild>
                      <a href="#quickstart">
                        <Zap className="mr-2 h-4 w-4" />
                        Quick Start
                      </a>
                    </Button>
                    <Button variant="outline" asChild>
                      <a href="/docs/openapi/credential-api.yaml" target="_blank">
                        <FileCode className="mr-2 h-4 w-4" />
                        OpenAPI Spec
                      </a>
                    </Button>
                  </div>
                </section>

                {/* API Cards */}
                <section className="grid gap-4 md:grid-cols-2">
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setActiveApi(CREDENTIAL_API.id)}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Key className="h-5 w-5 text-primary" />
                        Credential API
                      </CardTitle>
                      <CardDescription>
                        Issue, verify, and query skill credentials
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Badge variant="outline">6 endpoints</Badge>
                        <Badge variant="outline">Public + Auth</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setActiveApi(PUBLIC_CATALOG_API.id)}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ExternalLink className="h-5 w-5 text-primary" />
                        Public Catalog API
                      </CardTitle>
                      <CardDescription>
                        Browse courses, work orders, and skills
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Badge variant="outline">6 endpoints</Badge>
                        <Badge variant="outline">All Public</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </section>

                {/* Authentication */}
                <section id="authentication" className="space-y-4">
                  <h2 className="text-2xl font-bold">Authentication</h2>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Public</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-muted-foreground">
                        No authentication required for catalog and verification endpoints.
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Bearer Token</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-muted-foreground">
                        JWT from user session for accessing own credentials.
                      </CardContent>
                    </Card>
                    <Card 
                      className={canAccessApps ? "cursor-pointer hover:border-primary/50 transition-colors" : "opacity-60"}
                      onClick={() => canAccessApps && setActiveTab('apps')}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          API Key
                          {canAccessApps ? (
                            <Badge variant="secondary" className="text-xs">Click to manage</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Developer access required</Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-muted-foreground">
                        X-App-Key header for authorized external applications.
                      </CardContent>
                    </Card>
                  </div>
                </section>

                {/* Quick Start */}
                <section id="quickstart" className="space-y-4">
                  <h2 className="text-2xl font-bold">Quick Start</h2>
                  <p className="text-muted-foreground">
                    Get started with the FGN.Academy APIs in under a minute.
                  </p>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">1. Fetch Public Data (No Auth)</h3>
                      <CodeBlock
                        title="List ATS Skills"
                        language="bash"
                        code={`curl "https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/public-catalog/skills?game=ATS"`}
                      />
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">2. Issue Credentials (With API Key)</h3>
                      <CodeBlock
                        title="Issue a Credential"
                        language="bash"
                        code={`curl -X POST \\
  "https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/credential-api/credentials/issue" \\
  -H "X-App-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "user_email": "trainee@example.com",
    "credential_type_key": "ats_pre_trip",
    "score": 95,
    "skills_verified": ["pre_trip_inspection", "defensive_driving"]
  }'`}
                      />
                    </div>
                  </div>
                </section>

                {/* Endpoints */}
                <section id="endpoints" className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">{currentApi.title}</h2>
                    <Badge variant="secondary">{currentApi.endpoints.length} endpoints</Badge>
                  </div>
                  <p className="text-muted-foreground">{currentApi.description}</p>

                  <Tabs defaultValue={currentApi.id} value={activeApi} onValueChange={setActiveApi}>
                    <TabsList>
                      {ALL_APIS.map(api => (
                        <TabsTrigger key={api.id} value={api.id}>{api.title}</TabsTrigger>
                      ))}
                    </TabsList>
                    {ALL_APIS.map(api => (
                      <TabsContent key={api.id} value={api.id} className="space-y-4 mt-6">
                        {api.endpoints.map(endpoint => (
                          <EndpointCard
                            key={endpoint.id}
                            endpoint={endpoint}
                            baseUrl={api.baseUrl}
                            isExpanded={activeEndpoint === endpoint.id}
                            onToggle={() => setActiveEndpoint(
                              activeEndpoint === endpoint.id ? null : endpoint.id
                            )}
                          />
                        ))}
                      </TabsContent>
                    ))}
                  </Tabs>
                </section>

                {/* Try It */}
                {currentEndpoint && (
                  <section id="tryit" className="space-y-4">
                    <h2 className="text-2xl font-bold">Try It</h2>
                    <ApiTryIt endpoint={currentEndpoint} baseUrl={currentApi.baseUrl} />
                  </section>
                )}

                {/* OpenAPI */}
                <section id="openapi" className="space-y-4">
                  <h2 className="text-2xl font-bold">OpenAPI Specifications</h2>
                  <p className="text-muted-foreground">
                    Download OpenAPI specs for use with Postman, Swagger, or SDK generation.
                  </p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Credential API</CardTitle>
                        <CardDescription>Issue and verify skill credentials</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button variant="outline" size="sm" asChild>
                          <a href="/docs/openapi/credential-api.yaml" target="_blank">
                            <FileCode className="h-4 w-4 mr-2" />
                            Download YAML
                          </a>
                        </Button>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Public Catalog API</CardTitle>
                        <CardDescription>Browse training content</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button variant="outline" size="sm" asChild>
                          <a href="/docs/openapi/public-catalog.yaml" target="_blank">
                            <FileCode className="h-4 w-4 mr-2" />
                            Download YAML
                          </a>
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </section>
              </div>
            )}

            {/* My Apps Tab - only accessible to developers */}
            {activeTab === 'apps' && canAccessApps && (
              <div className="max-w-4xl mx-auto p-8">
                <MyAppsSection />
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </AppLayout>
  );
}
