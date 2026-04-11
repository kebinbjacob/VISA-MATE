import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './AuthProvider';
import { Send, User, MessageSquare, ShieldCheck, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminSupport() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
    
    // Realtime listener for new messages globally
    const channel = supabase
      .channel('admin_support_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, (payload) => {
        // Refresh conversations to update unread counts and latest message
        fetchConversations();
        
        // If we are currently viewing this user's chat, add the message
        if (selectedUserId && payload.new.user_id === selectedUserId) {
          setMessages(prev => {
            if (prev.find(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          scrollToBottom();
          // Mark as read if it's from the user
          if (payload.new.sender_id === selectedUserId) {
            markAsRead(selectedUserId);
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedUserId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const fetchConversations = async () => {
    try {
      // Fetch all messages
      const { data: msgs, error } = await supabase
        .from('support_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') setDbError(true);
        throw error;
      }

      if (!msgs || msgs.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(msgs.map(m => m.user_id))];
      
      // Fetch user details
      const { data: usersData } = await supabase
        .from('users')
        .select('id, name, email, photo_url')
        .in('id', userIds);

      const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);

      // Group messages by user_id
      const grouped = new Map();
      msgs.forEach(msg => {
        if (!grouped.has(msg.user_id)) {
          grouped.set(msg.user_id, {
            userId: msg.user_id,
            user: usersMap.get(msg.user_id) || { name: 'Unknown User', email: 'unknown' },
            lastMessage: msg.message,
            lastMessageAt: msg.created_at,
            unreadCount: msg.sender_id === msg.user_id && !msg.is_read ? 1 : 0
          });
        } else {
          if (msg.sender_id === msg.user_id && !msg.is_read) {
            grouped.get(msg.user_id).unreadCount++;
          }
        }
      });

      setConversations(Array.from(grouped.values()));
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      scrollToBottom();
      markAsRead(userId);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const markAsRead = async (userId: string) => {
    try {
      await supabase
        .from('support_messages')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('sender_id', userId)
        .eq('is_read', false);
        
      // Update local conversation state
      setConversations(prev => prev.map(c => 
        c.userId === userId ? { ...c, unreadCount: 0 } : c
      ));
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    fetchMessages(userId);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !selectedUserId) return;

    const msgText = newMessage.trim();
    setNewMessage('');

    try {
      const { error } = await supabase
        .from('support_messages')
        .insert({
          user_id: selectedUserId,
          sender_id: user.id,
          message: msgText,
          is_read: true // Admin messages are read by admin instantly
        });

      if (error) throw error;
      
      // Optimistic update
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        user_id: selectedUserId,
        sender_id: user.id,
        message: msgText,
        created_at: new Date().toISOString(),
        is_read: true
      }]);
      scrollToBottom();
      fetchConversations(); // Update last message in sidebar
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message.");
      setNewMessage(msgText);
    }
  };

  if (dbError) {
    return (
      <div className="max-w-4xl mx-auto pb-12">
        <div className="mb-8 bg-red-50 border border-red-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-red-900 font-bold text-lg mb-2">Database Setup Required</h3>
              <p className="text-red-800 text-sm mb-4">
                The support messenger requires a new database table. Please run this SQL in your Supabase SQL Editor:
              </p>
              <pre className="bg-white p-4 rounded-xl border border-red-100 overflow-x-auto text-xs text-gray-800 font-mono shadow-sm">
{`CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages" ON public.support_messages
  FOR SELECT USING (auth.uid() = user_id OR public.get_user_role() IN ('super_admin', 'admin', 'editor', 'publisher'));

CREATE POLICY "Users can insert their own messages" ON public.support_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Admins can update messages" ON public.support_messages
  FOR UPDATE USING (public.get_user_role() IN ('super_admin', 'admin', 'editor', 'publisher') OR auth.uid() = user_id);`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      {/* Sidebar: Conversations List */}
      <div className="w-1/3 bg-white rounded-3xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Support Tickets</h2>
          <p className="text-xs text-gray-500 mt-1">Manage user issues and inquiries</p>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-gray-400 text-sm">Loading conversations...</div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">No support tickets found.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {conversations.map((conv) => (
                <button
                  key={conv.userId}
                  onClick={() => handleSelectUser(conv.userId)}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-start gap-3 ${selectedUserId === conv.userId ? 'bg-blue-50/50' : ''}`}
                >
                  <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden shrink-0">
                    <img 
                      src={conv.user.photo_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${conv.userId}&backgroundColor=e2e8f0`} 
                      alt="User" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="font-bold text-gray-900 text-sm truncate pr-2">{conv.user.name || 'User'}</h4>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">
                        {new Date(conv.lastMessageAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                      {conv.lastMessage}
                    </p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <div className="w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
                      {conv.unreadCount}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 bg-white rounded-3xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
        {selectedUserId ? (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">
                  {conversations.find(c => c.userId === selectedUserId)?.user.name || 'User'}
                </h3>
                <p className="text-xs text-gray-500">
                  {conversations.find(c => c.userId === selectedUserId)?.user.email}
                </p>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#f8f9fa]">
              {messages.map((msg, idx) => {
                const isMe = msg.sender_id === user?.id;
                return (
                  <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-5 py-3 ${isMe ? 'bg-slate-800 text-white rounded-tr-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'}`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      <p className={`text-[10px] mt-1 ${isMe ? 'text-slate-400' : 'text-gray-400'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
              <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your reply..."
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:bg-white resize-none"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="w-12 h-12 bg-slate-800 text-white rounded-full flex items-center justify-center shrink-0 hover:bg-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <Send className="w-5 h-5 ml-1" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <MessageSquare className="w-12 h-12 mb-4 text-gray-300" />
            <p>Select a conversation from the left to start replying.</p>
          </div>
        )}
      </div>
    </div>
  );
}
