import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { AuthorizedAppEditDialog } from '@/components/admin/AuthorizedAppEditDialog';
import {
  useAuthorizedApps,
  useDeleteAuthorizedApp,
  useRegenerateApiKey,
  type AuthorizedApp,
} from '@/hooks/useAuthorizedApps';
import { useAuth } from '@/contexts/AuthContext';
import {
  Plus,
  Key,
  Trash2,
  Edit,
  Check,
  X,
  Copy,
  ExternalLink,
  LogIn,
  Shield,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

export function MyAppsSection() {
  const { user } = useAuth();
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

  // Not authenticated state
  if (!user) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <LogIn className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Sign in to manage apps</h3>
          <p className="text-muted-foreground text-center mb-4">
            Create and manage your authorized applications to access the Credential API.
          </p>
          <Button asChild>
            <Link to="/auth">Sign In</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Applications</h2>
          <p className="text-muted-foreground">
            Manage your API keys and authorized applications
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create App
        </Button>
      </div>

      {/* Security Notice */}
      <Card className="border-warning/30 bg-warning/5">
        <CardContent className="flex items-start gap-3 pt-4">
          <Shield className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-warning">
              Keep your API keys secure
            </p>
            <p className="text-muted-foreground">
              Never share your API keys in public repositories or client-side code. 
              Use environment variables and server-side requests only.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Empty state */}
      {apps?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Key className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first application to start using the Credential API.
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First App
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {apps?.map((app) => (
            <Card key={app.id} className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Key className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{app.app_name}</CardTitle>
                      <CardDescription>
                        <code className="text-xs">{app.app_slug}</code>
                      </CardDescription>
                    </div>
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
                {/* Allowed Origins */}
                {app.allowed_origins.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Allowed Origins:</p>
                    <div className="flex flex-wrap gap-2">
                      {app.allowed_origins.map((origin) => (
                        <Badge key={origin} variant="outline" className="gap-1">
                          <ExternalLink className="h-3 w-3" />
                          {origin}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Permissions */}
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    {app.can_read_credentials ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span>Read Credentials</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {app.can_issue_credentials ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span>Issue Credentials</span>
                  </div>
                </div>

                {/* Credential Types */}
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

                {/* Usage hint */}
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Use your API key with the <code className="bg-muted px-1 rounded">X-App-Key</code> header
                  </p>
                </div>
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
            <AlertDialogTitle>Delete Application</AlertDialogTitle>
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
              <code className="flex-1 text-sm break-all font-mono">{newApiKey}</code>
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
