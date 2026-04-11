import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Layout from "./components/Layout";
import Auth from "./components/Auth";
import { useAuth } from "./components/AuthProvider";
import { FileText, ShieldAlert, AlertTriangle } from "lucide-react";

import Dashboard from "./components/Dashboard";
import VisaDashboard from "./components/VisaDashboard";
import Jobs from "./components/Jobs";
import JobTracker from "./components/JobTracker";
import CVAnalysis from "./components/CVAnalysis";
import ScamDetector from "./components/ScamDetector";
import DocumentVault from "./components/DocumentVault";
import Profile from "./components/Profile";
import CVBuilder from "./components/CVBuilder";
import Resources from "./components/Resources";
import Support from "./components/Support";

import AdminLayout from "./components/AdminLayout";
import AdminDashboard from "./components/AdminDashboard";
import AdminJobs from "./components/AdminJobs";
import AdminContent from "./components/AdminContent";
import AdminUsers from "./components/AdminUsers";
import AdminSupport from "./components/AdminSupport";

const Billing = () => <h1 className="text-2xl font-bold">Subscription & Billing</h1>;

export default function App() {
  const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
  const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full border border-red-100">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Missing Environment Variables</h1>
          <p className="text-gray-600 mb-6">
            The application cannot connect to Supabase because the required environment variables are missing.
          </p>
          <div className="bg-gray-50 p-4 rounded-xl text-left text-sm font-mono text-gray-800 space-y-2 mb-6 border border-gray-200">
            <p>VITE_SUPABASE_URL=...</p>
            <p>VITE_SUPABASE_ANON_KEY=...</p>
          </div>
          <p className="text-sm text-gray-500">
            If you are deploying to Vercel, please add these variables in your Vercel Project Settings &gt; Environment Variables, and then trigger a new deployment.
          </p>
        </div>
      </div>
    );
  }

  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) return <Auth />;

  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
        <Route path="/admin/jobs" element={<AdminLayout><AdminJobs /></AdminLayout>} />
        <Route path="/admin/content" element={<AdminLayout><AdminContent /></AdminLayout>} />
        <Route path="/admin/users" element={<AdminLayout><AdminUsers /></AdminLayout>} />
        <Route path="/admin/support" element={<AdminLayout><AdminSupport /></AdminLayout>} />

        {/* User Routes */}
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/dashboard/visa" element={<Layout><VisaDashboard /></Layout>} />
        <Route path="/dashboard/jobs" element={<Layout><Jobs /></Layout>} />
        <Route path="/dashboard/tracker" element={<Layout><JobTracker /></Layout>} />
        <Route path="/dashboard/cv" element={<Layout><CVAnalysis /></Layout>} />
        <Route path="/dashboard/scam" element={<Layout><ScamDetector /></Layout>} />
        <Route path="/dashboard/vault" element={<Layout><DocumentVault /></Layout>} />
        <Route path="/dashboard/resources" element={<Layout><Resources /></Layout>} />
        <Route path="/dashboard/support" element={<Layout><Support /></Layout>} />
        <Route path="/dashboard/profile" element={<Layout><Profile /></Layout>} />
        <Route path="/dashboard/cv-builder" element={<Layout><CVBuilder /></Layout>} />
        <Route path="/dashboard/billing" element={<Layout><Billing /></Layout>} />
      </Routes>
    </Router>
  );
}
