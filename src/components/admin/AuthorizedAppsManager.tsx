import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AuthorizedAppEditDialog } from './AuthorizedAppEditDialog';
import {
  useAuthorizedApps,
  useDeleteAuthorizedApp,
  useRegenerateApiKey,
  type AuthorizedApp,
} from '@/hooks/useAuthorizedApps';
import {
  Plus,
  Key,
  Trash2,
  Edit,
  Check,
  X,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export function AuthorizedAppsManager() {
  const { data: apps, isLoading } = useAuthorizedApps();
  const deleteApp = useDeleteAuthorizedApp();
  const regenerateKey = useRegenerateApiKey();

  const [editingApp, setEditingApp] = useState<AuthorizedApp | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<AuthorizedApp | null>(null);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  const handleRegenerateKey = async (app: AuthorizedApp) => {
    const key = await regenerateKey.mutateAsync(app.id);
    setNewApiKey(key);
  };

  const copyApiKey = () => {
    if (newApiKey) {
      navigator.clipboard.writeText(newApiKey);
      toast({
        title: 'Copied',
        description: 'API key copied to clipboard.',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Authorized Apps</h2>
          <p className="text-muted-foreground">
            Manage external applications that can access the Credential API
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add App
        </Button>
      </div>

      {apps?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Key className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No authorized apps yet. Add your first app to enable external API access.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {apps?.map((app) => (
            <Card key={app.id} className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">{app.app_name}</CardTitle>
                    <Badge variant={app.is_active ? 'default' : 'secondary'}>
                      {app.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRegenerateKey(app)}
                    >
                      <Key className="h-4 w-4 mr-1" />
                      Regenerate Key
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingApp(app)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirm(app)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <code className="bg-muted px-2 py-1 rounded">{app.app_slug}</code>
                </div>

                <div className="flex flex-wrap gap-2">
                  {app.allowed_origins.map((origin) => (
                    <Badge key={origin} variant="outline" className="gap-1">
                      <ExternalLink className="h-3 w-3" />
                      {origin}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    {app.can_read_credentials ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span>Read Credentials</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {app.can_issue_credentials ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span>Issue Credentials</span>
                  </div>
                </div>

                {app.credential_types_allowed.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Allowed Credential Types:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {app.credential_types_allowed.map((type) => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <AuthorizedAppEditDialog
        open={isCreateOpen || !!editingApp}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingApp(null);
          }
        }}
        app={editingApp}
        onApiKeyGenerated={setNewApiKey}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Authorized App</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.app_name}"? This will
              revoke all API access for this application and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirm) {
                  deleteApp.mutate(deleteConfirm.id);
                  setDeleteConfirm(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* API Key Display Dialog */}
      <AlertDialog open={!!newApiKey} onOpenChange={() => setNewApiKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>API Key Generated</AlertDialogTitle>
            <AlertDialogDescription>
              Copy this API key now. It won't be shown again!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <code className="flex-1 text-sm break-all">{newApiKey}</code>
              <Button variant="ghost" size="icon" onClick={copyApiKey}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setNewApiKey(null)}>
              I've copied the key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}