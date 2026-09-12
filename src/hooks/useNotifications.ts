import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import type { Notification } from '@/types';

export function useNotifications() {
  const { user, organization } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const { showToast } = useToast();

  const fetchNotifications = useCallback(async () => {
    if (!user || !organization) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifications((data as Notification[]) || []);
    setUnreadCount((data as Notification[])?.filter((n) => !n.read).length || 0);
    setLoading(false);
  }, [user, organization]);

  useEffect(() => {
    fetchNotifications();
    
    if (!user) return;
    const sub = supabase.channel('notifs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
        fetchNotifications();
        const newNotif = payload.new as Notification;
        showToast(newNotif.body || newNotif.title, newNotif.type === 'error' ? 'error' : 'success');
      })
      .subscribe();
      
    return () => { sub.unsubscribe(); };
  }, [fetchNotifications, user, showToast]);

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    fetchNotifications();
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    fetchNotifications();
  }, [user, fetchNotifications]);

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, refetch: fetchNotifications };
}
