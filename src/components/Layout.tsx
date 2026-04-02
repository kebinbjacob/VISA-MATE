import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "./FirebaseProvider";
import { 
  LayoutDashboard, 
  Briefcase, 
  FileText, 
  ShieldCheck, 
  LogOut, 
  Menu, 
  Search,
  Bell,
  Settings,
  HelpCircle,
  FolderOpen,
  Edit3
} from "lucide-react";
import { cn } from "../lib/utils";

const NAV_ITEMS = [
  { label: "Overview", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Visa Tracker", icon: FileText, path: "/dashboard/visa" },
  { label: "Job Board", icon: Briefcase, path: "/dashboard/jobs" },
  { label: "CV Builder", icon: Edit3, path: "/dashboard/cv-builder" },
  { label: "Document Vault", icon: FolderOpen, path: "/dashboard/vault" },
  { label: "Security Center", icon: ShieldCheck, path: "/dashboard/scam" },
  { label: "Profile", icon: Settings, path: "/dashboard/profile" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  // Get current page title
  const currentNav = NAV_ITEMS.find(item => item.path === location.pathname);
  const pageTitle = currentNav ? currentNav.label : 
                    location.pathname.includes('/cv-builder') ? 'CV Builder' :
                    location.pathname.includes('/cv') ? 'CV Analyzer' : 'Overview';

  return (
    <div className="flex h-screen bg-[#f8f9fa] overflow-hidden font-sans text-gray-900">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-64 bg-[#f8f9fa] border-r border-gray-200 z-50 transition-transform lg:relative lg:translate-x-0 flex flex-col",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-8 pb-4">
          <h1 className="text-2xl font-bold text-blue-700 tracking-tight">VisaMate</h1>
          <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mt-1">Expat Concierge</p>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
                  isActive 
                    ? "bg-white text-blue-700 shadow-sm" 
                    : "text-gray-500 hover:bg-gray-100/50 hover:text-gray-900"
                )}
                onClick={() => setIsSidebarOpen(false)}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-blue-700" : "text-gray-400")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 space-y-6">
          <Link 
            to="/dashboard/cv"
            onClick={() => setIsSidebarOpen(false)}
            className="w-full flex items-center justify-center py-3 px-4 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            Analyze CV
          </Link>

          <div className="space-y-1">
            <button className="flex items-center gap-4 px-4 py-3 w-full text-sm font-semibold text-gray-500 hover:bg-gray-100/50 hover:text-gray-900 rounded-xl transition-colors">
              <HelpCircle className="w-5 h-5 text-gray-400" />
              Support
            </button>
            <button 
              onClick={signOut}
              className="flex items-center gap-4 px-4 py-3 w-full text-sm font-semibold text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors"
            >
              <LogOut className="w-5 h-5 text-gray-400" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white lg:rounded-tl-3xl lg:border-t lg:border-l border-gray-200 shadow-sm">
        {/* Header */}
        <header className="h-20 bg-white flex items-center justify-between px-6 lg:px-10 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              className="p-2 -ml-2 lg:hidden text-gray-600 hover:bg-gray-100 rounded-lg"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-bold text-gray-900 hidden sm:block">{pageTitle}</h2>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center relative">
              <Search className="w-4 h-4 absolute left-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search insights..." 
                className="pl-10 pr-4 py-2.5 bg-gray-100/80 border-transparent rounded-full text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none w-64 transition-all"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <button className="text-gray-400 hover:text-gray-600 transition-colors relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-blue-600 rounded-full border-2 border-white" />
              </button>
              <Link to="/dashboard/profile" className="text-gray-400 hover:text-gray-600 transition-colors">
                <Settings className="w-5 h-5" />
              </Link>
              <Link to="/dashboard/profile" className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center overflow-hidden border border-gray-200 hover:ring-2 hover:ring-blue-500 transition-all" title={user?.displayName || user?.email || "User"}>
                <img src={user?.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${user?.uid || 'Felix'}&backgroundColor=ffdfbf`} alt="User" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 bg-[#f8f9fa] lg:bg-transparent">
          {children}
        </div>
      </main>
    </div>
  );
}
