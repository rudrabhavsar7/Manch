"use client";

import { useEffect, useState, useCallback } from 'react';
import { useGigStore, GigMember } from '@/stores/gig-store';
import { useAuthStore } from '@/stores/auth-store';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createClient } from '@/lib/supabase/client';
import { SyncMessage } from '@/lib/sync/message-types';
import { Shield, ShieldOff, X } from 'lucide-react';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface MemberListProps {
  gigId: string;
  isAdmin?: boolean;
  onSend?: (msg: SyncMessage) => void;
  onClose?: () => void;
}

type UserDetail = {
  id: string;
  display_name: string;
  instrument: string;
};

type GigMemberRow = {
  user_id: string;
  role?: GigMember['role'];
  users?: UserDetail | UserDetail[] | null;
};

export function MemberList({ gigId, isAdmin, onSend, onClose }: MemberListProps) {
  const members = useGigStore((state) => state.members);
  const user = useAuthStore((state) => state.user);
  const [userDetails, setUserDetails] = useState<Record<string, UserDetail>>({});

  const fetchUsers = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('gig_members')
      .select('user_id, role, users(id, display_name, instrument)')
      .eq('gig_id', gigId);
      
    if (!error && data) {
      const detailsMap: Record<string, UserDetail> = {};
      const existingMembers = useGigStore.getState().members;
      const membersMap: Record<string, GigMember> = { ...existingMembers };

      (data as unknown as GigMemberRow[]).forEach((item) => {
        const existingRole = existingMembers[item.user_id]?.role;
        const role = item.role || existingRole || 'musician';
        membersMap[item.user_id] = {
          id: item.user_id,
          role,
        };
        if (item.users) {
          const u = (Array.isArray(item.users) ? item.users[0] : item.users) as unknown as UserDetail;
          detailsMap[item.user_id] = u;
        }
      });

      if (Object.keys(detailsMap).length > 0) {
        setUserDetails((prev) => ({ ...prev, ...detailsMap }));
      }

      const membershipChanged =
        Object.keys(membersMap).length !== Object.keys(existingMembers).length ||
        Object.keys(membersMap).some(
          (id) =>
            !existingMembers[id] || existingMembers[id].role !== membersMap[id].role,
        );
      if (membershipChanged) {
        useGigStore.getState().setMembers(membersMap);
      }
    }
  }, [gigId]);

  useEffect(() => {
    fetchUsers();

    const supabase = createClient();
    let channel: RealtimeChannel | null = null;

    if (typeof supabase?.channel === 'function') {
      channel = supabase
        .channel(`gig-members-${gigId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'gig_members',
            filter: `gig_id=eq.${gigId}`,
          },
          () => {
            fetchUsers();
          }
        )
        .subscribe();
    }

    const pollInterval = setInterval(() => {
      fetchUsers();
    }, 5000);

    return () => {
      clearInterval(pollInterval);
      if (channel && typeof supabase?.removeChannel === 'function') {
        supabase.removeChannel(channel);
      }
    };
  }, [gigId, fetchUsers]);

  // If any member in store is missing userDetails, fetch them
  useEffect(() => {
    const memberIds = Object.keys(members);
    const hasMissing = memberIds.some((id) => !userDetails[id]);
    if (hasMissing && memberIds.length > 0) {
      fetchUsers();
    }
  }, [members, userDetails, fetchUsers]);
  
  return (
    <div className="flex flex-col h-full bg-surface border-l border-border w-64">
      <div className="p-4 border-b border-border flex items-start justify-between">
        <div>
          <h2 className="font-semibold text-lg">Band Members</h2>
          <div className="text-xs text-muted-foreground mt-1">
            {Object.keys(members).length} connected
          </div>
        </div>
        {onClose && (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 -mr-1 -mt-1"
            aria-label="Close band members"
            title="Close"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {Object.values(members).map((member) => {
            const details = userDetails[member.id];
            const name = details?.display_name || `User ${member.id.substring(0, 4)}`;
            const initials = name.substring(0, 2);
            
            return (
              <div key={member.id} className="flex items-center space-x-3">
                <Avatar>
                  <AvatarFallback className="bg-primary/10 text-primary uppercase">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {name}
                  </div>
                  {details?.instrument && (
                    <div className="text-xs text-muted-foreground truncate">
                      {details.instrument}
                    </div>
                  )}
                  <div className="flex items-center mt-1">
                    <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className="text-[10px] px-1 h-4">
                      {member.role}
                    </Badge>
                  </div>
                </div>
                {isAdmin && member.id !== user?.id && member.role !== 'admin' && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 ml-auto"
                    aria-label={member.role === 'co-admin' ? 'Demote to musician' : 'Promote to co-admin'}
                    title={member.role === 'co-admin' ? 'Demote to musician' : 'Promote to co-admin'}
                    onClick={async () => {
                      const newRole = member.role === 'co-admin' ? 'musician' : 'co-admin';
                      const supabase = createClient();
                      const { error } = await supabase
                        .from('gig_members')
                        .update({ role: newRole })
                        .eq('gig_id', gigId)
                        .eq('user_id', member.id);
                      if (!error) {
                        onSend?.({
                          type: 'MEMBER_ROLE',
                          userId: member.id,
                          role: newRole,
                          timestamp: Date.now(),
                        });
                        useGigStore.getState().updateMemberRole(member.id, newRole);
                      }
                    }}
                  >
                    {member.role === 'co-admin' ? (
                      <ShieldOff className="h-3 w-3 text-destructive" />
                    ) : (
                      <Shield className="h-3 w-3 text-stageAccent" />
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
