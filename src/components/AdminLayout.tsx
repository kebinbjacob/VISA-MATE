import React, { useState, useEffect } from "react";
import { Link, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { getOrCreateUserProfile } from "../services/userService";
import { UserProfile } from "../types";
import { supabase } from "../supabase";
import toast from "react-hot-toast";
import { 
  LayoutDashboard, 
  Briefcase, 
  FileText, 
  LogOut, 
  Menu, 
  Search,
  Bell,
  Settings,
  Users,
  MessageSquare
} from "lucide-react";
import { cn } from "../lib/utils";

const ADMIN_NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
  { label: "Job Postings", icon: Briefcase, path: "/admin/jobs" },
  { label: "Content Management", icon: FileText, path: "/admin/content" },
  { label: "User Management", icon: Users, path: "/admin/users" },
  { label: "Support Tickets", icon: MessageSquare, path: "/admin/support" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    const fetchProfile = async () => {
      try {
        const p = await getOrCreateUserProfile(user);
        setProfile(p);
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();

    // Listen for new support messages globally for admins
    const messageChannel = supabase
      .channel('admin-support-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages'
        },
        (payload) => {
          const data = payload.new as any;
          // If the message is from a user (not an admin sending a reply)
          if (data.sender_id === data.user_id) {
            toast('New support ticket message', {
              icon: '📩',
              duration: 5000,
              style: {
                borderRadius: '10px',
                background: '#1e293b',
                color: '#fff',
              },
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [user]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading...</div>;
  }

  if (!profile || (profile.role !== 'super_admin' && profile.role !== 'admin' && profile.role !== 'publisher' && profile.role !== 'editor')) {
    return <Navigate to="/dashboard" replace />;
  }

  const currentNav = ADMIN_NAV_ITEMS.find(item => item.path === location.pathname);
  const pageTitle = currentNav ? currentNav.label : 'Admin Panel';

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans text-gray-900">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 w-64 bg-slate-900 text-slate-300 border-r border-slate-800 z-50 transition-transform lg:relative lg:translate-x-0 flex flex-col",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-8 pb-4">
          <h1 className="text-2xl font-bold text-white tracking-tight">VisaMate Admin</h1>
          <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mt-1">Control Panel</p>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {ADMIN_NAV_ITEMS.map((item) => {
            if (item.path === '/admin/users' && profile.role !== 'super_admin') {
              return null;
            }
            const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
                  isActive 
                    ? "bg-blue-600 text-white shadow-sm" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
                onClick={() => setIsSidebarOpen(false)}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-400")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 space-y-6">
          <div className="space-y-1">
            <Link to="/dashboard" className="flex items-center gap-4 px-4 py-3 w-full text-sm font-semibold text-slate-400 hover:bg-slate-800 hover:text-white rounded-xl transition-colors">
              <LayoutDashboard className="w-5 h-5 text-slate-400" />
              User App
            </Link>
            <button 
              onClick={signOut}
              className="flex items-center gap-4 px-4 py-3 w-full text-sm font-semibold text-slate-400 hover:bg-red-900/30 hover:text-red-400 rounded-xl transition-colors"
            >
              <LogOut className="w-5 h-5 text-slate-400" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        <header className="h-20 bg-white flex items-center justify-between px-6 lg:px-10 border-b border-gray-200 shrink-0 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              className="p-2 -ml-2 lg:hidden text-gray-600 hover:bg-gray-100 rounded-lg"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-bold text-gray-900 hidden sm:block">{pageTitle}</h2>
            <span className="ml-4 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium capitalize">
              {profile.role}
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <Link to="/dashboard/profile" className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center overflow-hidden border border-gray-200 hover:ring-2 hover:ring-blue-500 transition-all ml-2" title={profile?.name || user?.email || "User"}>
                <img src={profile?.photoUrl || user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${user?.id || 'Felix'}&backgroundColor=ffdfbf`} alt="User" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </Link>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-10 flex flex-col">
          <div className="flex-1">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
