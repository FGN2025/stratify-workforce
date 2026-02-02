import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { 
  type ApiEndpoint, 
  type HttpMethod, 
  getMethodColor, 
  getAuthDescription,
  generateCodeExamples
} from '@/lib/api-docs';
import { CodeBlock } from './CodeBlock';
import { SchemaTable } from './SchemaTable';
import { Lock, Globe, Key } from 'lucide-react';

interface EndpointCardProps {
  endpoint: ApiEndpoint;
  baseUrl: string;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export function EndpointCard({ endpoint, baseUrl, isExpanded = false, onToggle }: EndpointCardProps) {
  const codeExamples = generateCodeExamples(endpoint, baseUrl);

  const AuthIcon = endpoint.auth === 'none' ? Globe : endpoint.auth === 'bearer' ? Lock : Key;

  return (
    <Card className={cn(
      "transition-all duration-200",
      isExpanded && "ring-1 ring-primary"
    )}>
      <CardHeader 
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <MethodBadge method={endpoint.method} />
            <div>
              <CardTitle className="text-base font-mono">
                {endpoint.path}
              </CardTitle>
              <CardDescription className="mt-1">
                {endpoint.title}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <AuthIcon className="h-3 w-3" />
              <span className="hidden sm:inline">{getAuthDescription(endpoint.auth)}</span>
            </Badge>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6 border-t pt-6">
          {/* Description */}
          <p className="text-sm text-muted-foreground">
            {endpoint.description}
          </p>

          {/* Parameters */}
          {endpoint.parameters.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3">Parameters</h4>
              <SchemaTable 
                items={endpoint.parameters.map(p => ({
                  name: p.name,
                  type: p.type,
                  required: p.required,
                  description: p.description,
                  location: p.location,
                }))} 
              />
            </div>
          )}

          {/* Request Body */}
          {endpoint.requestBody && (
            <div>
              <h4 className="text-sm font-semibold mb-3">Request Body</h4>
              <p className="text-sm text-muted-foreground mb-2">
                {endpoint.requestBody.description}
              </p>
              <CodeBlock 
                code={JSON.stringify(endpoint.requestBody.example, null, 2)} 
                language="json"
                title="Example"
              />
            </div>
          )}

          {/* Responses */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Responses</h4>
            <div className="space-y-2">
              {endpoint.responses.map((response) => (
                <div 
                  key={response.status}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <Badge 
                    variant={response.status < 300 ? 'default' : response.status < 400 ? 'secondary' : 'destructive'}
                    className="font-mono"
                  >
                    {response.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {response.description}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Code Examples */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Code Examples</h4>
            <Tabs defaultValue="bash" className="w-full">
              <TabsList>
                {codeExamples.map((example) => (
                  <TabsTrigger key={example.language} value={example.language}>
                    {example.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {codeExamples.map((example) => (
                <TabsContent key={example.language} value={example.language}>
                  <CodeBlock 
                    code={example.code} 
                    language={example.language}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function MethodBadge({ method }: { method: HttpMethod }) {
  return (
    <span className={cn(
      "px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wide text-white",
      getMethodColor(method)
    )}>
      {method}
    </span>
  );
}
