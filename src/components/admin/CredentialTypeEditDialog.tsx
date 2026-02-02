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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCreateCredentialType,
  useUpdateCredentialType,
  type CredentialType,
} from '@/hooks/useCredentialTypes';
import { useAuthorizedApps } from '@/hooks/useAuthorizedApps';
import { X, Plus } from 'lucide-react';

const GAME_TITLES = [
  { value: 'ATS', label: 'American Truck Simulator' },
  { value: 'Farming_Sim', label: 'Farming Simulator' },
  { value: 'Construction_Sim', label: 'Construction Simulator' },
  { value: 'Mechanic_Sim', label: 'Mechanic Simulator' },
];

const ICON_OPTIONS = [
  'award', 'trophy', 'medal', 'star', 'badge-check', 'certificate',
  'shield-check', 'check-circle', 'target', 'zap', 'truck', 'tractor',
];

const formSchema = z.object({
  type_key: z.string().min(1, 'Key is required').regex(/^[a-z0-9_]+$/, 'Key must be lowercase with underscores'),
  display_name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  issuer_app_slug: z.string().optional(),
  game_title: z.string().optional(),
  skills_granted: z.array(z.string()),
  icon_name: z.string(),
  accent_color: z.string(),
  sort_order: z.number(),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface CredentialTypeEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credentialType: CredentialType | null;
}

export function CredentialTypeEditDialog({
  open,
  onOpenChange,
  credentialType,
}: CredentialTypeEditDialogProps) {
  const createType = useCreateCredentialType();
  const updateType = useUpdateCredentialType();
  const { data: apps } = useAuthorizedApps();

  const [newSkill, setNewSkill] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type_key: '',
      display_name: '',
      description: '',
      issuer_app_slug: '',
      game_title: '',
      skills_granted: [],
      icon_name: 'award',
      accent_color: '#10b981',
      sort_order: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    if (credentialType) {
      form.reset({
        type_key: credentialType.type_key,
        display_name: credentialType.display_name,
        description: credentialType.description || '',
        issuer_app_slug: credentialType.issuer_app_slug || '',
        game_title: credentialType.game_title || '',
        skills_granted: credentialType.skills_granted,
        icon_name: credentialType.icon_name,
        accent_color: credentialType.accent_color,
        sort_order: credentialType.sort_order,
        is_active: credentialType.is_active,
      });
    } else {
      form.reset({
        type_key: '',
        display_name: '',
        description: '',
        issuer_app_slug: '',
        game_title: '',
        skills_granted: [],
        icon_name: 'award',
        accent_color: '#10b981',
        sort_order: 0,
        is_active: true,
      });
    }
  }, [credentialType, form]);

  const onSubmit = async (values: FormValues) => {
    // Cast game_title to the proper type
    type GameTitle = 'ATS' | 'Farming_Sim' | 'Construction_Sim' | 'Mechanic_Sim';
    
    const data = {
      type_key: values.type_key,
      display_name: values.display_name,
      description: values.description || null,
      issuer_app_slug: values.issuer_app_slug || null,
      game_title: (values.game_title || null) as GameTitle | null,
      skills_granted: values.skills_granted,
      icon_name: values.icon_name,
      accent_color: values.accent_color,
      sort_order: values.sort_order,
      is_active: values.is_active,
    };

    if (credentialType) {
      await updateType.mutateAsync({ id: credentialType.id, updates: data });
    } else {
      await createType.mutateAsync(data);
    }
    onOpenChange(false);
  };

  const addSkill = () => {
    if (newSkill && !form.getValues('skills_granted').includes(newSkill)) {
      form.setValue('skills_granted', [...form.getValues('skills_granted'), newSkill]);
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    form.setValue(
      'skills_granted',
      form.getValues('skills_granted').filter((s) => s !== skill)
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {credentialType ? 'Edit Credential Type' : 'Add Credential Type'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="display_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="CDL Basic" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type Key</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="cdl_basic" 
                        {...field} 
                        disabled={!!credentialType}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What this credential represents..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="game_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Game</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select game..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None (General)</SelectItem>
                        {GAME_TITLES.map((game) => (
                          <SelectItem key={game.value} value={game.value}>
                            {game.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="issuer_app_slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issuer App</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select app..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Any App</SelectItem>
                        {apps?.map((app) => (
                          <SelectItem key={app.app_slug} value={app.app_slug}>
                            {app.app_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="icon_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ICON_OPTIONS.map((icon) => (
                          <SelectItem key={icon} value={icon}>
                            {icon}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accent_color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Accent Color</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input type="color" {...field} className="w-12 h-10 p-1" />
                      </FormControl>
                      <Input
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="#10b981"
                        className="flex-1"
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="skills_granted"
              render={() => (
                <FormItem>
                  <FormLabel>Skills Granted</FormLabel>
                  <div className="flex gap-2">
                    <Input
                      placeholder="pre_trip_inspection"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addSkill();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={addSkill}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.watch('skills_granted').map((skill) => (
                      <Badge key={skill} variant="secondary" className="gap-1">
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <FormDescription>
                    Skills that are verified when this credential is issued
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sort_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3 h-[72px]">
                    <div>
                      <FormLabel>Active</FormLabel>
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
                disabled={createType.isPending || updateType.isPending}
              >
                {credentialType ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}