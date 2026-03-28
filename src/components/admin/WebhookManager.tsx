import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useWebhookSubscriptions,
  useWebhookDeliveries,
  useToggleWebhook,
  useDeleteWebhook,
  type WebhookSubscription,
} from '@/hooks/useWebhooks';
import { Webhook, Trash2, Eye, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

export function WebhookManager() {
  const { data: webhooks, isLoading } = useWebhookSubscriptions();
  const toggleWebhook = useToggleWebhook();
  const deleteWebhook = useDeleteWebhook();

  const [deleteConfirm, setDeleteConfirm] = useState<WebhookSubscription | null>(null);
  const [viewingDeliveries, setViewingDeliveries] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Webhook Subscriptions</h2>
        <p className="text-muted-foreground">
          Monitor webhook subscriptions registered by partner apps via the Credential API.
        </p>
      </div>

      {!webhooks?.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Webhook className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No webhook subscriptions yet. Partners can register webhooks via the Credential API.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {webhooks.map((wh) => (
            <Card key={wh.id} className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Webhook className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-sm font-mono">{wh.webhook_url}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        App: <code className="bg-muted px-1 rounded">{wh.app_slug}</code>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={wh.is_active}
                      onCheckedChange={(checked) => toggleWebhook.mutate({ id: wh.id, is_active: checked })}
                    />
                    <Button variant="ghost" size="icon" onClick={() => setViewingDeliveries(wh.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(wh)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {wh.events.map((event) => (
                    <Badge key={event} variant="secondary" className="text-xs">
                      {event}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Created {format(new Date(wh.created_at), 'MMM d, yyyy')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delivery Log Dialog */}
      <DeliveryLogDialog
        subscriptionId={viewingDeliveries}
        onClose={() => setViewingDeliveries(null)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
            <AlertDialogDescription>
              Delete webhook for "{deleteConfirm?.webhook_url}"? This will stop all event deliveries.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirm) {
                  deleteWebhook.mutate(deleteConfirm.id);
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

function DeliveryLogDialog({ subscriptionId, onClose }: { subscriptionId: string | null; onClose: () => void }) {
  const { data: deliveries, isLoading } = useWebhookDeliveries(subscriptionId);

  return (
    <Dialog open={!!subscriptionId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Delivery Log</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : !deliveries?.length ? (
          <p className="text-muted-foreground text-sm py-8 text-center">No deliveries yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    {d.status_code && d.status_code >= 200 && d.status_code < 300 ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : d.status_code === 0 || !d.delivered_at ? (
                      <XCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <Clock className="h-4 w-4 text-yellow-500" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{d.event_type}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{d.status_code || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {d.created_at ? format(new Date(d.created_at), 'MMM d, HH:mm:ss') : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
