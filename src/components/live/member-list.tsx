"use client";

import { useEffect, useState } from 'react';
import { useGigStore } from '@/stores/gig-store';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createClient } from '@/lib/supabase/client';

interface MemberListProps {
  gigId: string;
}

type UserDetail = {
  id: string;
  display_name: string;
  instrument: string;
};

export function MemberList({ gigId }: MemberListProps) {
  const members = useGigStore((state) => state.members);
  const [userDetails, setUserDetails] = useState<Record<string, UserDetail>>({});
  
  useEffect(() => {
    const fetchUsers = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('gig_members')
        .select('user_id, users(id, display_name, instrument)')
        .eq('gig_id', gigId);
        
      if (!error && data) {
        const detailsMap: Record<string, UserDetail> = {};
        data.forEach(item => {
          if (item.users) {
            const user = (Array.isArray(item.users) ? item.users[0] : item.users) as unknown as UserDetail;
            detailsMap[item.user_id] = user;
          }
        });
        setUserDetails(detailsMap);
      }
    };
    
    fetchUsers();
  }, [gigId]);
  
  return (
    <div className="flex flex-col h-full bg-surface border-l border-border w-64">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-lg">Band Members</h2>
        <div className="text-xs text-muted-foreground mt-1">
          {Object.keys(members).length} connected
        </div>
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
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
