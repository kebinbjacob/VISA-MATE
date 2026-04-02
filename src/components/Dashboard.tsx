import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./FirebaseProvider";
import { getUserVisas } from "../services/visaService";
import { getUserApplications } from "../services/applicationService";
import { getUserDocuments } from "../services/documentService";
import { fetchJobs } from "../services/jobService";
import { getUserCVReports } from "../services/cvService";
import { Visa, Application, Document, Job } from "../types";
import { differenceInDays, parseISO } from "date-fns";
import { 
  ArrowRight, 
  RefreshCw, 
  UploadCloud, 
  ChevronRight, 
  Plus, 
  CheckCircle2, 
  Briefcase, 
  AlertOctagon,
  CheckSquare,
  Square,
  Globe,
  FileText
} from "lucide-react";
import { formatCurrency, formatDate } from "../lib/utils";

export default function Dashboard() {
  const { user } = useAuth();
  const [visas, setVisas] = useState<Visa[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      Promise.all([
        getUserVisas(user.uid),
        getUserApplications(user.uid),
        getUserDocuments(user.uid),
        getUserCVReports(user.uid)
      ]).then(async ([v, a, d, cvs]) => {
        setVisas(v);
        setApplications(a);
        setDocuments(d);
        
        let searchQuery = "developer";
        if (cvs && cvs.length > 0 && cvs[0].keywordsToAdd && cvs[0].keywordsToAdd.length > 0) {
           searchQuery = cvs[0].keywordsToAdd[0];
        }
        
        const jobs = await fetchJobs({ q: searchQuery });
        setRecommendedJobs(jobs.slice(0, 2)); // Take first 2
        setLoading(false);
      }).catch(err => {
        console.error("Failed to load dashboard data:", err);
        setLoading(false);
      });
    }
  }, [user]);

  const activeVisa = visas.find(v => v.status === 'active') || visas[0];
  const daysRemaining = activeVisa && activeVisa.expiryDate 
    ? differenceInDays(parseISO(activeVisa.expiryDate), new Date()) 
    : 0;
  
  const savedJobsCount = applications.filter(a => a.status === 'saved').length;
  const appliedJobsCount = applications.filter(a => a.status === 'applied').length;

  // Create a dynamic activity feed
  const safeDate = (dateStr?: string) => {
    if (!dateStr) return new Date();
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const activities = [
    ...applications.map(a => ({
      id: a.id,
      type: 'application',
      title: a.status === 'saved' ? 'Job Saved' : 'Application Updated',
      desc: `Status changed to ${a.status}`,
      date: safeDate(a.updatedAt),
      icon: Briefcase,
      color: 'blue'
    })),
    ...documents.map(d => ({
      id: d.id,
      type: 'document',
      title: 'Document Uploaded',
      desc: `Added ${d.name} to vault`,
      date: safeDate(d.createdAt),
      icon: FileText,
      color: 'emerald'
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 4);

  if (loading) return <div className="p-12 text-center">Loading dashboard...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-12">
      
      {/* Top Section: Visa Status & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Golden Visa Card */}
        <div className="lg:col-span-2 bg-blue-700 rounded-3xl p-8 text-white relative overflow-hidden shadow-lg shadow-blue-900/20">
          {/* Decorative Background Element */}
          <div className="absolute right-0 top-0 w-64 h-64 bg-blue-600/50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
              <h2 className="text-4xl font-bold tracking-tight mb-2">
                {activeVisa ? `${activeVisa.type.charAt(0).toUpperCase() + activeVisa.type.slice(1)} Visa Status` : 'No Active Visa'}
              </h2>
              <p className="text-blue-200 text-lg font-medium">
                {activeVisa ? `Sponsored by ${activeVisa.sponsor}` : 'Add your visa details to track expiry'}
              </p>
            </div>
            
            <div className="flex flex-wrap items-end justify-between gap-6 mt-12">
              <div className="flex gap-12">
                <div>
                  <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-1">Days Remaining</p>
                  <p className="text-5xl font-bold tracking-tight">{activeVisa ? Math.max(0, daysRemaining) : '--'}</p>
                </div>
                <div className="w-px bg-blue-500/50" />
                <div>
                  <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-1">Expiry Date</p>
                  <p className="text-2xl font-bold mt-3">{activeVisa && activeVisa.expiryDate ? new Date(activeVisa.expiryDate).toLocaleDateString() : '--'}</p>
                </div>
              </div>
              
              <Link to="/dashboard/visa" className="bg-white text-blue-700 hover:bg-blue-50 px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors shadow-sm">
                <RefreshCw className="w-4 h-4" />
                Manage Visas
              </Link>
            </div>
          </div>
          
          {/* Large Checkmark Badge */}
          <div className="absolute top-8 right-12 opacity-90 hidden sm:block">
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M60 0L68.5 15.5L85.5 11L89.5 28L106.5 29.5L104 46.5L118 53.5L109.5 68.5L118 83.5L104 90.5L106.5 107.5L89.5 109L85.5 126L68.5 121.5L60 137L51.5 121.5L34.5 126L30.5 109L13.5 107.5L16 90.5L2 83.5L10.5 68.5L2 53.5L16 46.5L13.5 29.5L30.5 28L34.5 11L51.5 15.5L60 0Z" fill="#3B82F6" opacity="0.8"/>
              <path d="M45 68L55 78L80 53" stroke="#1D4ED8" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* Right Column: Insights & Actions */}
        <div className="space-y-6">
          {/* AI Insight */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Your Activity</h3>
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-full">Live</span>
            </div>
            <p className="text-gray-600 text-sm italic leading-relaxed mb-4">
              You have <strong className="text-emerald-600 font-bold not-italic">{savedJobsCount}</strong> saved jobs and have applied to <strong className="text-blue-600 font-bold not-italic">{appliedJobsCount}</strong> roles. You also have <strong className="text-orange-600 font-bold not-italic">{documents.length}</strong> documents in your vault.
            </p>
            <Link to="/dashboard/jobs" className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:text-blue-700 transition-colors">
              View Saved Jobs <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Update Passport */}
          <Link to="/dashboard/vault" className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center gap-4 cursor-pointer hover:border-blue-200 hover:shadow-md transition-all group block">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-900 text-sm">Document Vault</h4>
              <p className="text-xs text-gray-500 mt-0.5">{documents.length} files stored securely</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-600 transition-colors" />
          </Link>
        </div>
      </div>

      {/* Recommended For You */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Recommended for You</h2>
          <Link to="/dashboard/jobs" className="text-blue-600 font-bold text-sm hover:text-blue-700 transition-colors">
            Browse Job Board
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {recommendedJobs.map(job => (
            <div key={job.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center text-white font-bold text-xs">
                  {job.company.substring(0, 2).toUpperCase()}
                </div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-full">
                  {job.source}
                </span>
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-1 truncate">{job.title}</h3>
              <p className="text-sm text-gray-500 mb-6 truncate">{job.company} • {job.location}</p>
              <div className="flex items-center gap-4 text-xs font-semibold text-gray-600">
                <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-gray-400" /> {job.salaryMin ? formatCurrency(job.salaryMin) : 'Negotiable'}</span>
                <span className="flex items-center gap-1.5"><Globe className="w-4 h-4 text-gray-400" /> {job.jobType.replace('_', ' ')}</span>
              </div>
            </div>
          ))}

          {/* Explore More */}
          <Link to="/dashboard/jobs" className="bg-gray-50 rounded-3xl p-6 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center hover:bg-gray-100 transition-colors group">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform shadow-md shadow-blue-600/20">
              <Plus className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">Explore More Opportunities</h3>
            <p className="text-sm text-gray-500">Based on your CV analysis</p>
          </Link>
        </div>
      </div>

      {/* Bottom Section: Activity & Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Recent Activity */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Activity</h2>
          <div className="bg-white rounded-3xl p-2 border border-gray-100 shadow-sm">
            
            {activities.length > 0 ? activities.map(activity => (
              <div key={activity.id} className="flex items-start gap-4 p-4 hover:bg-gray-50 rounded-2xl transition-colors">
                <div className={`w-10 h-10 bg-${activity.color}-50 rounded-full flex items-center justify-center text-${activity.color}-600 shrink-0 mt-1`}>
                  <activity.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-gray-900 text-sm">{activity.title}</h4>
                    <span className="text-xs text-gray-400 font-medium">{formatDate(activity.date.toISOString())}</span>
                  </div>
                  <p className="text-xs text-gray-500">{activity.desc}</p>
                </div>
              </div>
            )) : (
              <div className="p-8 text-center text-gray-500">
                <p>No recent activity found.</p>
              </div>
            )}

          </div>
        </div>

        {/* Compliance Checklist */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Compliance Checklist</h2>
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="space-y-5 relative z-10">
              
              <label className="flex items-center gap-4 cursor-pointer group">
                {activeVisa ? <CheckSquare className="w-6 h-6 text-blue-600 shrink-0" /> : <Square className="w-6 h-6 text-gray-300 group-hover:text-blue-400 transition-colors shrink-0" />}
                <span className={`text-sm font-semibold transition-colors ${activeVisa ? 'text-gray-900 group-hover:text-blue-700' : 'text-gray-600 group-hover:text-gray-900'}`}>Visa Tracked</span>
              </label>

              <label className="flex items-center gap-4 cursor-pointer group">
                {documents.length > 0 ? <CheckSquare className="w-6 h-6 text-blue-600 shrink-0" /> : <Square className="w-6 h-6 text-gray-300 group-hover:text-blue-400 transition-colors shrink-0" />}
                <span className={`text-sm font-semibold transition-colors ${documents.length > 0 ? 'text-gray-900 group-hover:text-blue-700' : 'text-gray-600 group-hover:text-gray-900'}`}>Documents Uploaded</span>
              </label>

              <label className="flex items-center gap-4 cursor-pointer group">
                {applications.length > 0 ? <CheckSquare className="w-6 h-6 text-blue-600 shrink-0" /> : <Square className="w-6 h-6 text-gray-300 group-hover:text-blue-400 transition-colors shrink-0" />}
                <span className={`text-sm font-semibold transition-colors ${applications.length > 0 ? 'text-gray-900 group-hover:text-blue-700' : 'text-gray-600 group-hover:text-gray-900'}`}>Jobs Saved/Applied</span>
              </label>

            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {Math.round(((activeVisa ? 1 : 0) + (documents.length > 0 ? 1 : 0) + (applications.length > 0 ? 1 : 0)) / 3 * 100)}% Overall Completion
                </span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600 rounded-full transition-all duration-500" style={{ width: `${((activeVisa ? 1 : 0) + (documents.length > 0 ? 1 : 0) + (applications.length > 0 ? 1 : 0)) / 3 * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
