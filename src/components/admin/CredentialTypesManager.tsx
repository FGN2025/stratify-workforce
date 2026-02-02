import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { CredentialTypeEditDialog } from './CredentialTypeEditDialog';
import {
  useCredentialTypes,
  useDeleteCredentialType,
  type CredentialType,
} from '@/hooks/useCredentialTypes';
import { 
  Plus, 
  Award, 
  Edit, 
  Trash2, 
  Trophy, 
  Medal, 
  Star, 
  BadgeCheck, 
  ShieldCheck,
  CheckCircle,
  Target,
  Zap,
  Truck,
} from 'lucide-react';

const GAME_TITLES = ['ATS', 'Farming_Sim', 'Construction_Sim', 'Mechanic_Sim'] as const;

const GAME_LABELS: Record<string, string> = {
  ATS: 'American Truck Simulator',
  Farming_Sim: 'Farming Simulator',
  Construction_Sim: 'Construction Simulator',
  Mechanic_Sim: 'Mechanic Simulator',
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  award: Award,
  trophy: Trophy,
  medal: Medal,
  star: Star,
  'badge-check': BadgeCheck,
  certificate: Award,
  'shield-check': ShieldCheck,
  'check-circle': CheckCircle,
  target: Target,
  zap: Zap,
  truck: Truck,
  tractor: Truck,
};

function DynamicIcon({ name, className, color }: { name: string; className?: string; color?: string }) {
  const IconComponent = ICON_MAP[name] || Award;
  return <IconComponent className={className} style={color ? { color } : undefined} />;
}

export function CredentialTypesManager() {
  const { data: credentialTypes, isLoading } = useCredentialTypes();
  const deleteType = useDeleteCredentialType();

  const [editingType, setEditingType] = useState<CredentialType | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<CredentialType | null>(null);

  // Group by game title
  const typesByGame = credentialTypes?.reduce((acc, type) => {
    const game = type.game_title || 'General';
    if (!acc[game]) acc[game] = [];
    acc[game].push(type);
    return acc;
  }, {} as Record<string, CredentialType[]>) || {};

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
          <h2 className="text-2xl font-bold">Credential Types</h2>
          <p className="text-muted-foreground">
            Define the types of credentials that can be issued by authorized apps
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Type
        </Button>
      </div>

      {Object.keys(typesByGame).length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Award className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No credential types defined yet. Create your first one!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {GAME_TITLES.map((game) => {
            const types = typesByGame[game];
            if (!types || types.length === 0) return null;

            return (
              <div key={game}>
                <h3 className="text-lg font-semibold mb-4 text-muted-foreground">
                  {GAME_LABELS[game] || game}
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {types.map((type) => (
                    <Card
                      key={type.id}
                      className="border-border/50 hover:border-primary/50 transition-colors"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div
                            className="h-10 w-10 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: `${type.accent_color}20` }}
                          >
                            <DynamicIcon
                              name={type.icon_name}
                              className="h-5 w-5"
                              color={type.accent_color}
                            />
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditingType(type)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setDeleteConfirm(type)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>

                        <h4 className="font-semibold">{type.display_name}</h4>
                        <p className="text-xs text-muted-foreground mb-2">
                          <code>{type.type_key}</code>
                        </p>

                        {type.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {type.description}
                          </p>
                        )}

                        {type.issuer_app_slug && (
                          <p className="text-xs text-muted-foreground mb-2">
                            Issuer: <span className="font-medium">{type.issuer_app_slug}</span>
                          </p>
                        )}

                        {type.skills_granted.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {type.skills_granted.slice(0, 3).map((skill) => (
                              <Badge key={skill} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                            {type.skills_granted.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{type.skills_granted.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}

                        {!type.is_active && (
                          <Badge variant="outline" className="mt-2">
                            Inactive
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}

          {/* General/unassigned types */}
          {typesByGame['General'] && typesByGame['General'].length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 text-muted-foreground">
                General
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {typesByGame['General'].map((type) => (
                  <Card
                    key={type.id}
                    className="border-border/50 hover:border-primary/50 transition-colors"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className="h-10 w-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${type.accent_color}20` }}
                        >
                          <DynamicIcon
                            name={type.icon_name}
                            className="h-5 w-5"
                            color={type.accent_color}
                          />
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditingType(type)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setDeleteConfirm(type)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <h4 className="font-semibold">{type.display_name}</h4>
                      <p className="text-xs text-muted-foreground">
                        <code>{type.type_key}</code>
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <CredentialTypeEditDialog
        open={isCreateOpen || !!editingType}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingType(null);
          }
        }}
        credentialType={editingType}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Credential Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.display_name}"? This may
              affect existing credentials of this type.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirm) {
                  deleteType.mutate(deleteConfirm.id);
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
    </div>
  );
}