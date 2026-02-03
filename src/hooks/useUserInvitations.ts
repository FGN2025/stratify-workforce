import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface Invitation {
  id: string;
  email: string;
  username: string | null;
  role: AppRole;
  tenant_id: string | null;
  invited_by: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: string;
  created_at: string;
  tenants?: { name: string; slug: string } | null;
}

interface InviteUserPayload {
  email: string;
  username?: string;
  role: AppRole;
  tenant_id?: string;
}

export function useUserInvitations() {
  const queryClient = useQueryClient();
  const [isInviting, setIsInviting] = useState(false);

  // Fetch pending invitations
  const {
    data: invitations = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['user-invitations', 'pending'],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users/pending`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch invitations');
      }

      const data = await response.json();
      return data.invitations as Invitation[];
    },
  });

  // Invite user mutation
  const inviteMutation = useMutation({
    mutationFn: async (payload: InviteUserPayload) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users/invite`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Invitation Sent',
        description: data.message || 'User has been invited successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['user-invitations'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Invitation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Revoke invitation mutation
  const revokeMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users/invite/${invitationId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to revoke invitation');
      }

      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Invitation Revoked',
        description: 'The invitation has been revoked.',
      });
      queryClient.invalidateQueries({ queryKey: ['user-invitations'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Revoke Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const inviteUser = useCallback(
    async (payload: InviteUserPayload) => {
      setIsInviting(true);
      try {
        await inviteMutation.mutateAsync(payload);
        return true;
      } catch {
        return false;
      } finally {
        setIsInviting(false);
      }
    },
    [inviteMutation]
  );

  const revokeInvitation = useCallback(
    async (invitationId: string) => {
      return revokeMutation.mutateAsync(invitationId);
    },
    [revokeMutation]
  );

  return {
    invitations,
    isLoading,
    error,
    isInviting,
    inviteUser,
    revokeInvitation,
    isRevoking: revokeMutation.isPending,
    refetch,
  };
}
