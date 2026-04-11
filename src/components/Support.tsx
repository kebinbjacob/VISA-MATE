import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './AuthProvider';
import { Send, Mail, MessageSquare, AlertCircle, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Support() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    fetchMessages();

    const channel = supabase
      .channel('support_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `user_id=eq.${user.id}` }, (payload) => {
        setMessages(prev => {
          // Avoid duplicates if we just sent it
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
        scrollToBottom();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: true });

      if (error) {
        if (error.code === '42P01') setDbError(true); // relation does not exist
        throw error;
      }
      setMessages(data || []);
      scrollToBottom();
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const msgText = newMessage.trim();
    setNewMessage('');

    try {
      const { error } = await supabase
        .from('support_messages')
        .insert({
          user_id: user.id,
          sender_id: user.id,
          message: msgText
        });

      if (error) throw error;
      
      // Optimistic update
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        user_id: user.id,
        sender_id: user.id,
        message: msgText,
        created_at: new Date().toISOString(),
        is_read: false
      }]);
      scrollToBottom();
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
    <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Support & Issues</h1>
        <p className="text-gray-600 text-sm">
          Need help? Send us a message below or email us directly at{' '}
          <a href="mailto:info@appmatixsolutions.com" className="text-blue-600 font-semibold hover:underline">
            info@appmatixsolutions.com
          </a>
        </p>
      </div>

      <div className="flex-1 bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">VisaMate Support</h3>
            <p className="text-xs text-gray-500">We typically reply within a few hours</p>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#f8f9fa]">
          {loading ? (
            <div className="h-full flex items-center justify-center text-gray-400">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <Mail className="w-12 h-12 mb-4 text-gray-300" />
              <p>No messages yet. How can we help you today?</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = msg.sender_id === user?.id;
              return (
                <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-5 py-3 ${isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'}`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    <p className={`text-[10px] mt-1 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-100">
          <form onSubmit={handleSendMessage} className="flex items-end gap-3">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message here..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
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
              className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center shrink-0 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <Send className="w-5 h-5 ml-1" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
