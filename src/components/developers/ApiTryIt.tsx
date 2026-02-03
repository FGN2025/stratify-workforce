import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Play, AlertCircle } from 'lucide-react';
import { CodeBlock } from './CodeBlock';
import { type ApiEndpoint, API_BASE_URL } from '@/lib/api-docs';

interface ApiTryItProps {
  endpoint: ApiEndpoint;
  baseUrl: string;
}

export function ApiTryIt({ endpoint, baseUrl }: ApiTryItProps) {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{ status: number; data: unknown; time: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});

  // Only allow testing public endpoints
  if (endpoint.auth !== 'none') {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-3 py-6 text-muted-foreground">
          <AlertCircle className="h-5 w-5" />
          <span>This endpoint requires authentication. Test using cURL or your application.</span>
        </CardContent>
      </Card>
    );
  }

  const handleTest = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Build URL with path and query params
      let url = `${baseUrl}${endpoint.path}`;
      
      // Replace path params
      endpoint.parameters
        .filter(p => p.location === 'path')
        .forEach(p => {
          url = url.replace(`{${p.name}}`, encodeURIComponent(params[p.name] || ''));
        });

      // Add query params
      const queryParams = endpoint.parameters.filter(p => p.location === 'query');
      if (queryParams.length > 0) {
        const searchParams = new URLSearchParams();
        queryParams.forEach(p => {
          if (params[p.name]) {
            searchParams.set(p.name, params[p.name]);
          }
        });
        const queryString = searchParams.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
      }

      const startTime = performance.now();
      const res = await fetch(url, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const endTime = performance.now();

      const data = await res.json();
      
      setResponse({
        status: res.status,
        data,
        time: Math.round(endTime - startTime),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const pathParams = endpoint.parameters.filter(p => p.location === 'path');
  const queryParams = endpoint.parameters.filter(p => p.location === 'query');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Try It</CardTitle>
        <CardDescription>Test this endpoint directly from the browser</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Path Parameters */}
        {pathParams.length > 0 && (
          <div className="space-y-3">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Path Parameters
            </Label>
            {pathParams.map((param) => (
              <div key={param.name} className="grid gap-2">
                <Label htmlFor={param.name} className="text-sm">
                  {param.name}
                  {param.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                <Input
                  id={param.name}
                  placeholder={param.example || param.description}
                  value={params[param.name] || ''}
                  onChange={(e) => setParams({ ...params, [param.name]: e.target.value })}
                />
              </div>
            ))}
          </div>
        )}

        {/* Query Parameters */}
        {queryParams.length > 0 && (
          <div className="space-y-3">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Query Parameters
            </Label>
            {queryParams.map((param) => (
              <div key={param.name} className="grid gap-2">
                <Label htmlFor={param.name} className="text-sm">
                  {param.name}
                </Label>
                {param.enum ? (
                  <Select
                    value={params[param.name] || 'none'}
                    onValueChange={(value) => setParams({ ...params, [param.name]: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${param.name}`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {param.enum.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={param.name}
                    placeholder={param.example || param.description}
                    value={params[param.name] || ''}
                    onChange={(e) => setParams({ ...params, [param.name]: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Send Button */}
        <Button onClick={handleTest} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Send Request
            </>
          )}
        </Button>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Response */}
        {response && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Response</span>
              <div className="flex items-center gap-3 text-muted-foreground">
                <span className={response.status < 300 ? 'text-emerald-500' : 'text-destructive'}>
                  {response.status}
                </span>
                <span>{response.time}ms</span>
              </div>
            </div>
            <CodeBlock 
              code={JSON.stringify(response.data, null, 2)} 
              language="json"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
