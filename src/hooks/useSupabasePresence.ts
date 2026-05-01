import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface PresenceUser {
  user_email: string;
  name: string;
  role: string;
  online_at: string;
}

export function useSupabasePresence(currentUserEmail: string | undefined | null, userName: string, role: string) {
  const [onlineUsers, setOnlineUsers] = useState<Record<string, PresenceUser>>({});
  const [lastSeenUsers, setLastSeenUsers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!currentUserEmail) return;

    const email = currentUserEmail.toLowerCase();
    
    // We use a single shared channel 'online-users' for the entire app.
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: email,
        },
      },
    });

    const updatePresence = () => {
      const newState = channel.presenceState();
      const users: Record<string, PresenceUser> = {};
      
      for (const key in newState) {
        if (newState[key] && (newState[key] as any[]).length > 0) {
          const presence = (newState[key] as any[])[0] as PresenceUser;
          if (presence.user_email) {
            users[presence.user_email.toLowerCase().trim()] = presence;
          }
        }
      }
      setOnlineUsers(users);
    };

    channel
      .on('presence', { event: 'sync' }, updatePresence)
      .on('presence', { event: 'join' }, updatePresence)
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        if (leftPresences.length > 0) {
          const presence = leftPresences[0] as any;
          if (presence.user_email) {
            const userEmailLower = presence.user_email.toLowerCase();
            setLastSeenUsers(prev => ({
              ...prev,
              [userEmailLower]: new Date().toISOString()
            }));
          }
        }
        updatePresence();
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_email: email,
            name: userName || email.split('@')[0],
            role: role,
            online_at: new Date().toISOString()
          });
        }
      });

    // Cleanup: gracefully un-track from presence on completely unmounting or tab close
    return () => {
      // Removing the channel untracks presence implicitly.
      // Additionally, window tab closing drops the WebSocket connection, 
      // which Supabase interprets as leaving presence after a timeout.
      supabase.removeChannel(channel);
    };
  }, [currentUserEmail, userName, role]);

  return { onlineUsers, lastSeenUsers };
}
