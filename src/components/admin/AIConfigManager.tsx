import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Bot, Brain, Settings, Star, ExternalLink, Key } from 'lucide-react';
import {
  useAIModels,
  useAIPersonas,
  useAIPlatformSettings,
  useUpdateAIModel,
  useUpdateAIPersona,
  useUpdateAIPlatformSetting,
  useSetModelApiKey,
  type AIPersonaConfig,
} from '@/hooks/useAIConfig';

function ApiKeyDialog({ open, onOpenChange, modelName, onSave, isPending }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modelName: string;
  onSave: (key: string) => void;
  isPending: boolean;
}) {
  const [key, setKey] = useState('');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set API Key — {modelName}</DialogTitle>
          <DialogDescription>Enter the API key for this model's provider. It will be stored securely and never shown in full again.</DialogDescription>
        </DialogHeader>
        <Input
          type="password"
          placeholder="sk-..."
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); setKey(''); }}>Cancel</Button>
          <Button
            disabled={!key.trim() || isPending}
            onClick={() => { onSave(key.trim()); setKey(''); }}
          >
            Save Key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModelsSection() {
  const { data: models, isLoading } = useAIModels();
  const updateModel = useUpdateAIModel();
  const setApiKey = useSetModelApiKey();
  const [editingModel, setEditingModel] = useState<{ id: string; name: string } | null>(null);

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Model</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>API Key</TableHead>
            <TableHead>Use For</TableHead>
            <TableHead>Default</TableHead>
            <TableHead>Enabled</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {models?.map((model) => {
            const raw = model as any;
            const hasKey = !!raw.api_key_encrypted;
            const hint = hasKey && typeof raw.api_key_encrypted === 'string'
              ? `****${raw.api_key_encrypted.slice(-4)}`
              : null;
            return (
              <TableRow key={model.id}>
                <TableCell className="font-medium">{model.display_name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{model.provider}</Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => setEditingModel({ id: model.id, name: model.display_name })}
                  >
                    <Key className="h-3.5 w-3.5" />
                    {hint || <span className="text-muted-foreground">Not set</span>}
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {model.use_for.map((u) => (
                      <Badge key={u} variant="secondary" className="text-xs">{u}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    variant={model.is_default ? 'default' : 'ghost'}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      if (!model.is_default) {
                        updateModel.mutate({ id: model.id, updates: { is_default: true } });
                      }
                    }}
                  >
                    <Star className={`h-4 w-4 ${model.is_default ? 'fill-current' : ''}`} />
                  </Button>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={model.is_enabled}
                    onCheckedChange={(checked) =>
                      updateModel.mutate({ id: model.id, updates: { is_enabled: checked } })
                    }
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {editingModel && (
        <ApiKeyDialog
          open={!!editingModel}
          onOpenChange={(open) => { if (!open) setEditingModel(null); }}
          modelName={editingModel.name}
          isPending={setApiKey.isPending}
          onSave={(key) => {
            setApiKey.mutate({ id: editingModel.id, apiKey: key }, {
              onSuccess: () => setEditingModel(null),
            });
          }}
        />
      )}
    </>
  );
}

function PersonaEditor({ persona, models }: { persona: AIPersonaConfig; models: { model_id: string; display_name: string }[] }) {
  const [prompt, setPrompt] = useState(persona.system_prompt);
  const [override, setOverride] = useState(persona.model_override || '');
  const updatePersona = useUpdateAIPersona();
  const isDirty = prompt !== persona.system_prompt || (override || '') !== (persona.model_override || '');

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{persona.persona_name}</CardTitle>
            <CardDescription className="text-xs">Context: {persona.context_type}</CardDescription>
          </div>
          <Switch
            checked={persona.is_active}
            onCheckedChange={(checked) =>
              updatePersona.mutate({ id: persona.id, updates: { is_active: checked } })
            }
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[120px] text-xs font-mono"
          placeholder="System prompt..."
        />
        <div className="flex items-center gap-3">
          <Select value={override} onValueChange={setOverride}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Model override (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No override (use default)</SelectItem>
              {models.map((m) => (
                <SelectItem key={m.model_id} value={m.model_id}>{m.display_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!isDirty || updatePersona.isPending}
            onClick={() =>
              updatePersona.mutate({
                id: persona.id,
                updates: {
                  system_prompt: prompt,
                  model_override: override === 'none' ? null : override || null,
                },
              })
            }
          >
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PersonasSection() {
  const { data: personas, isLoading: loadingPersonas } = useAIPersonas();
  const { data: models, isLoading: loadingModels } = useAIModels();

  if (loadingPersonas || loadingModels) {
    return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}</div>;
  }

  const modelOptions = (models || [])
    .filter((m) => m.is_enabled)
    .map((m) => ({ model_id: m.model_id, display_name: m.display_name }));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {personas?.map((p) => (
        <PersonaEditor key={p.id} persona={p} models={modelOptions} />
      ))}
    </div>
  );
}

function PlatformSettingsSection() {
  const { data: settings, isLoading } = useAIPlatformSettings();
  const updateSetting = useUpdateAIPlatformSetting();
  const [notebookKey, setNotebookKey] = useState('');
  const [showNotebookKey, setShowNotebookKey] = useState(false);

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }

  const getValue = (key: string) => {
    const setting = settings?.find((s) => s.key === key);
    if (!setting) return '';
    const v = setting.value;
    return typeof v === 'string' ? v : JSON.stringify(v);
  };

  const notebookApiKeyValue = getValue('open_notebook_api_key');
  const hasNotebookKey = !!notebookApiKeyValue && notebookApiKeyValue !== '' && notebookApiKeyValue !== '""';
  const notebookKeyHint = hasNotebookKey ? `****${notebookApiKeyValue.slice(-4)}` : 'Not set';

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Open Notebook URL</label>
        <div className="flex gap-2">
          <Input
            defaultValue={getValue('open_notebook_url')}
            placeholder="https://www.open-notebook.ai/"
            onBlur={(e) => updateSetting.mutate({ key: 'open_notebook_url', value: e.target.value })}
          />
          <Button variant="outline" size="icon" asChild>
            <a href={getValue('open_notebook_url')} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          External URL for source-based research. Students can launch this from the tutor panel.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Open Notebook API Key</label>
        <div className="flex gap-2">
          <Input
            type={showNotebookKey ? 'text' : 'password'}
            placeholder={hasNotebookKey ? notebookKeyHint : 'Enter API key...'}
            value={notebookKey}
            onChange={(e) => setNotebookKey(e.target.value)}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={!notebookKey.trim() || updateSetting.isPending}
            onClick={() => {
              updateSetting.mutate({ key: 'open_notebook_api_key', value: notebookKey.trim() }, {
                onSuccess: () => setNotebookKey(''),
              });
            }}
          >
            Save
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {hasNotebookKey ? `Current key: ${notebookKeyHint}` : 'No API key configured.'} Key is stored securely and used by backend functions.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <p className="text-sm font-medium">Research Mode</p>
          <p className="text-xs text-muted-foreground">Allow students to toggle between Tutor and Research modes</p>
        </div>
        <Switch
          checked={getValue('research_mode_enabled') === 'true'}
          onCheckedChange={(checked) =>
            updateSetting.mutate({ key: 'research_mode_enabled', value: checked })
          }
        />
      </div>
    </div>
  );
}

export function AIConfigManager() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
          <Bot className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">AI Configuration</h2>
          <p className="text-sm text-muted-foreground">Manage AI models, personas, and platform settings</p>
        </div>
      </div>

      <Tabs defaultValue="models" className="space-y-4">
        <TabsList>
          <TabsTrigger value="models" className="gap-2">
            <Brain className="h-4 w-4" /> Models
          </TabsTrigger>
          <TabsTrigger value="personas" className="gap-2">
            <Bot className="h-4 w-4" /> Personas
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" /> Platform Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="models">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Available Models</CardTitle>
              <CardDescription>Toggle models on/off, set the default, and configure API keys</CardDescription>
            </CardHeader>
            <CardContent>
              <ModelsSection />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personas">
          <PersonasSection />
        </TabsContent>

        <TabsContent value="settings">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Platform Settings</CardTitle>
              <CardDescription>Configure Open Notebook and research features</CardDescription>
            </CardHeader>
            <CardContent>
              <PlatformSettingsSection />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
