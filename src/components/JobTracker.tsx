import React, { useEffect, useState } from "react";
import { useAuth } from "./FirebaseProvider";
import { getUserApplications, updateApplicationStatus, deleteApplication } from "../services/applicationService";
import { Application, ApplicationStatus, Job } from "../types";
import { Briefcase, MapPin, Globe, Clock, CheckCircle2, XCircle, ChevronDown, Trash2, ExternalLink } from "lucide-react";
import { formatCurrency } from "../lib/utils";

const STATUS_COLORS: Record<ApplicationStatus, { bg: string, text: string, border: string }> = {
  saved: { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
  applied: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  interview: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  offer: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  rejected: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" }
};

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  interview: "Interviewing",
  offer: "Offer Received",
  rejected: "Rejected"
};

export default function JobTracker() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<(Application & { job?: Job })[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ApplicationStatus | 'all'>('all');

  useEffect(() => {
    if (user) {
      loadApplications();
    }
  }, [user]);

  const loadApplications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const apps = await getUserApplications(user.uid);
      setApplications(apps);
    } catch (error) {
      console.error("Failed to load applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (appId: string, newStatus: ApplicationStatus) => {
    try {
      await updateApplicationStatus(appId, newStatus);
      setApplications(prev => prev.map(app => 
        app.id === appId ? { ...app, status: newStatus } : app
      ));
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const handleDelete = async (appId: string) => {
    if (!window.confirm("Are you sure you want to remove this job from your tracker?")) return;
    try {
      await deleteApplication(appId);
      setApplications(prev => prev.filter(app => app.id !== appId));
    } catch (error) {
      console.error("Failed to delete application:", error);
    }
  };

  const filteredApps = activeTab === 'all' 
    ? applications 
    : applications.filter(app => app.status === activeTab);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-4">
          Application <span className="text-blue-700">Tracker.</span>
        </h1>
        <p className="text-gray-600 max-w-2xl text-lg">
          Manage your saved jobs and track your application progress all in one place.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto pb-4 mb-6 gap-2 hide-scrollbar">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
            activeTab === 'all' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          All Applications ({applications.length})
        </button>
        {(Object.keys(STATUS_LABELS) as ApplicationStatus[]).map(status => (
          <button
            key={status}
            onClick={() => setActiveTab(status)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
              activeTab === status 
                ? `${STATUS_COLORS[status].bg} ${STATUS_COLORS[status].text} border ${STATUS_COLORS[status].border}` 
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {STATUS_LABELS[status]} ({applications.filter(a => a.status === status).length})
          </button>
        ))}
      </div>

      {/* Job List */}
      <div className="space-y-4">
        {filteredApps.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-gray-100 text-center text-gray-500">
            <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-900 mb-2">No applications found</p>
            <p>You haven't {activeTab === 'all' ? 'saved or applied to any jobs' : `moved any jobs to the "${STATUS_LABELS[activeTab]}" stage`} yet.</p>
          </div>
        ) : (
          filteredApps.map(app => {
            const job = app.job;
            if (!job) return null; // Skip if job details couldn't be loaded

            return (
              <div key={app.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Logo Placeholder */}
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center shrink-0 hidden sm:flex">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{job.company.substring(0, 2)}</span>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-2">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                          {job.title}
                        </h2>
                        <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                          <span className="font-medium text-gray-900">{job.company}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {job.location}</span>
                        </p>
                      </div>

                      {/* Status Dropdown */}
                      <div className="relative inline-block text-left shrink-0">
                        <select
                          value={app.status}
                          onChange={(e) => handleStatusChange(app.id, e.target.value as ApplicationStatus)}
                          className={`appearance-none pl-4 pr-10 py-2 rounded-xl text-sm font-bold border cursor-pointer outline-none transition-colors ${STATUS_COLORS[app.status].bg} ${STATUS_COLORS[app.status].text} ${STATUS_COLORS[app.status].border}`}
                        >
                          {(Object.keys(STATUS_LABELS) as ApplicationStatus[]).map(s => (
                            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                        <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${STATUS_COLORS[app.status].text}`} />
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-4 mt-4">
                      <span className="px-3 py-1.5 bg-gray-50 text-gray-600 text-xs font-semibold rounded-lg flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-gray-400" /> 
                        {job.salaryMin ? `${formatCurrency(job.salaryMin)} - ${formatCurrency(job.salaryMax || job.salaryMin)}` : "Salary Negotiable"}
                      </span>
                      <span className="px-3 py-1.5 bg-gray-50 text-gray-600 text-xs font-semibold rounded-lg flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-gray-400" /> 
                        {job.jobType.replace("_", " ")}
                      </span>
                      <span className="px-3 py-1.5 bg-gray-50 text-gray-600 text-xs font-semibold rounded-lg flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" /> 
                        Added {new Date(app.appliedAt?.seconds ? app.appliedAt.seconds * 1000 : Date.now()).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                      <a 
                        href={job.sourceUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        View Original Posting <ExternalLink className="w-4 h-4" />
                      </a>
                      
                      <button 
                        onClick={() => handleDelete(app.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove from tracker"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
