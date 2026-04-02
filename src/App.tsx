import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Auth from "./components/Auth";
import { useAuth } from "./components/FirebaseProvider";
import { FileText, ShieldAlert } from "lucide-react";

import Dashboard from "./components/Dashboard";
import VisaDashboard from "./components/VisaDashboard";
import Jobs from "./components/Jobs";
import CVAnalysis from "./components/CVAnalysis";
import ScamDetector from "./components/ScamDetector";
import DocumentVault from "./components/DocumentVault";
import Profile from "./components/Profile";
import CVBuilder from "./components/CVBuilder";

const Billing = () => <h1 className="text-2xl font-bold">Subscription & Billing</h1>;

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) return <Auth />;

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/dashboard/visa" element={<Layout><VisaDashboard /></Layout>} />
        <Route path="/dashboard/jobs" element={<Layout><Jobs /></Layout>} />
        <Route path="/dashboard/cv" element={<Layout><CVAnalysis /></Layout>} />
        <Route path="/dashboard/scam" element={<Layout><ScamDetector /></Layout>} />
        <Route path="/dashboard/vault" element={<Layout><DocumentVault /></Layout>} />
        <Route path="/dashboard/profile" element={<Layout><Profile /></Layout>} />
        <Route path="/dashboard/cv-builder" element={<Layout><CVBuilder /></Layout>} />
        <Route path="/dashboard/billing" element={<Layout><Billing /></Layout>} />
      </Routes>
    </Router>
  );
}
