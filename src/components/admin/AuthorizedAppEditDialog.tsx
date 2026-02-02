import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  useCreateAuthorizedApp,
  useUpdateAuthorizedApp,
  type AuthorizedApp,
} from '@/hooks/useAuthorizedApps';
import { useCredentialTypes } from '@/hooks/useCredentialTypes';
import { X, Plus } from 'lucide-react';

const formSchema = z.object({
  app_name: z.string().min(1, 'Name is required'),
  app_slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens only'),
  allowed_origins: z.array(z.string()),
  can_read_credentials: z.boolean(),
  can_issue_credentials: z.boolean(),
  credential_types_allowed: z.array(z.string()),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface AuthorizedAppEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  app: AuthorizedApp | null;
  onApiKeyGenerated?: (key: string) => void;
}

export function AuthorizedAppEditDialog({
  open,
  onOpenChange,
  app,
  onApiKeyGenerated,
}: AuthorizedAppEditDialogProps) {
  const createApp = useCreateAuthorizedApp();
  const updateApp = useUpdateAuthorizedApp();
  const { data: credentialTypes } = useCredentialTypes();

  const [newOrigin, setNewOrigin] = useState('');
  const [newCredType, setNewCredType] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      app_name: '',
      app_slug: '',
      allowed_origins: [],
      can_read_credentials: true,
      can_issue_credentials: false,
      credential_types_allowed: [],
      is_active: true,
    },
  });

  useEffect(() => {
    if (app) {
      form.reset({
        app_name: app.app_name,
        app_slug: app.app_slug,
        allowed_origins: app.allowed_origins,
        can_read_credentials: app.can_read_credentials,
        can_issue_credentials: app.can_issue_credentials,
        credential_types_allowed: app.credential_types_allowed,
        is_active: app.is_active,
      });
    } else {
      form.reset({
        app_name: '',
        app_slug: '',
        allowed_origins: [],
        can_read_credentials: true,
        can_issue_credentials: false,
        credential_types_allowed: [],
        is_active: true,
      });
    }
  }, [app, form]);

  const onSubmit = async (values: FormValues) => {
    if (app) {
      await updateApp.mutateAsync({ id: app.id, updates: values });
    } else {
      const result = await createApp.mutateAsync({
        app_name: values.app_name,
        app_slug: values.app_slug,
        allowed_origins: values.allowed_origins,
        can_read_credentials: values.can_read_credentials,
        can_issue_credentials: values.can_issue_credentials,
        credential_types_allowed: values.credential_types_allowed,
        is_active: values.is_active,
      });
      if (result.apiKey && onApiKeyGenerated) {
        onApiKeyGenerated(result.apiKey);
      }
    }
    onOpenChange(false);
  };

  const addOrigin = () => {
    if (newOrigin && !form.getValues('allowed_origins').includes(newOrigin)) {
      form.setValue('allowed_origins', [...form.getValues('allowed_origins'), newOrigin]);
      setNewOrigin('');
    }
  };

  const removeOrigin = (origin: string) => {
    form.setValue(
      'allowed_origins',
      form.getValues('allowed_origins').filter((o) => o !== origin)
    );
  };

  const addCredType = () => {
    if (newCredType && !form.getValues('credential_types_allowed').includes(newCredType)) {
      form.setValue('credential_types_allowed', [...form.getValues('credential_types_allowed'), newCredType]);
      setNewCredType('');
    }
  };

  const removeCredType = (type: string) => {
    form.setValue(
      'credential_types_allowed',
      form.getValues('credential_types_allowed').filter((t) => t !== type)
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {app ? 'Edit Authorized App' : 'Add Authorized App'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="app_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>App Name</FormLabel>
                  <FormControl>
                    <Input placeholder="CDL Quest" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="app_slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>App Slug</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="cdl-quest" 
                      {...field} 
                      disabled={!!app}
                    />
                  </FormControl>
                  <FormDescription>
                    Unique identifier used in API calls
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="allowed_origins"
              render={() => (
                <FormItem>
                  <FormLabel>Allowed Origins (CORS)</FormLabel>
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://cdl-quest.lovable.app"
                      value={newOrigin}
                      onChange={(e) => setNewOrigin(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addOrigin();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={addOrigin}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.watch('allowed_origins').map((origin) => (
                      <Badge key={origin} variant="secondary" className="gap-1">
                        {origin}
                        <button
                          type="button"
                          onClick={() => removeOrigin(origin)}
                          className="hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="can_read_credentials"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Read Credentials</FormLabel>
                      <FormDescription className="text-xs">
                        Can fetch user credentials
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="can_issue_credentials"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Issue Credentials</FormLabel>
                      <FormDescription className="text-xs">
                        Can create new credentials
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {form.watch('can_issue_credentials') && (
              <FormField
                control={form.control}
                name="credential_types_allowed"
                render={() => (
                  <FormItem>
                    <FormLabel>Allowed Credential Types</FormLabel>
                    <div className="flex gap-2">
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={newCredType}
                        onChange={(e) => setNewCredType(e.target.value)}
                      >
                        <option value="">Select type...</option>
                        {credentialTypes?.map((type) => (
                          <option key={type.type_key} value={type.type_key}>
                            {type.display_name}
                          </option>
                        ))}
                      </select>
                      <Button type="button" variant="outline" onClick={addCredType}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {form.watch('credential_types_allowed').map((type) => (
                        <Badge key={type} variant="secondary" className="gap-1">
                          {type}
                          <button
                            type="button"
                            onClick={() => removeCredType(type)}
                            className="hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Active</FormLabel>
                    <FormDescription className="text-xs">
                      Enable or disable API access
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createApp.isPending || updateApp.isPending}
              >
                {app ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}