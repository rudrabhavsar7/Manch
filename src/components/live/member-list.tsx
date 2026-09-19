import { useGigStore } from '@/stores/gig-store';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MemberListProps {
  gigId: string;
  isAdmin: boolean;
}

export function MemberList({}: MemberListProps) {
  const members = useGigStore((state) => state.members);
  
  // Note: Since gigStore only has id and role right now, we would ideally fetch full user details
  // Or the sync engine would broadcast display_name and instrument.
  // For the UI, we'll render what we have.
  
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
          {Object.values(members).map((member) => (
            <div key={member.id} className="flex items-center space-x-3">
              <Avatar>
                <AvatarFallback className="bg-primary/10 text-primary uppercase">
                  {member.id.substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  User {member.id.substring(0, 4)}
                </div>
                <div className="flex items-center mt-1">
                  <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className="text-[10px] px-1 h-4">
                    {member.role}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
