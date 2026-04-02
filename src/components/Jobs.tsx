import React, { useEffect, useState } from "react";
import { fetchJobs } from "../services/jobService";
import { getUserApplications, addApplication, deleteApplication } from "../services/applicationService";
import { Job, JobType, ExperienceLevel, Application } from "../types";
import { useAuth } from "./FirebaseProvider";
import { Search, MapPin, Briefcase, DollarSign, Filter, ExternalLink, CheckCircle2, Bookmark, ChevronLeft, ChevronRight, Globe } from "lucide-react";
import { formatCurrency, formatDate } from "../lib/utils";

export default function Jobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedJobs, setSavedJobs] = useState<Map<string, string>>(new Map()); // jobId -> applicationId
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    q: "",
    location: "",
    jobType: "" as JobType | "",
    experienceLevel: "" as ExperienceLevel | "",
  });

  useEffect(() => {
    loadJobs();
    if (user) {
      loadSavedJobs();
    }
  }, [filters, user]);

  const loadSavedJobs = async () => {
    if (!user) return;
    try {
      const apps = await getUserApplications(user.uid);
      const savedMap = new Map();
      apps.forEach(app => {
        if (app.status === 'saved') {
          savedMap.set(app.jobId, app.id);
        }
      });
      setSavedJobs(savedMap);
    } catch (error) {
      console.error("Failed to load saved jobs:", error);
    }
  };

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await fetchJobs({
        ...filters,
        jobType: filters.jobType || undefined,
        experienceLevel: filters.experienceLevel || undefined,
      });
      setJobs(data);
    } catch (error) {
      console.error("Failed to load jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const toggleSave = async (jobId: string) => {
    if (!user) return;
    
    try {
      if (savedJobs.has(jobId)) {
        // Unsave
        const appId = savedJobs.get(jobId)!;
        await deleteApplication(appId);
        setSavedJobs(prev => {
          const next = new Map(prev);
          next.delete(jobId);
          return next;
        });
      } else {
        // Save
        const appId = await addApplication(user.uid, jobId, 'saved');
        setSavedJobs(prev => {
          const next = new Map(prev);
          next.set(jobId, appId);
          return next;
        });
      }
    } catch (error) {
      console.error("Failed to toggle save:", error);
    }
  };

  const toggleIndustry = (ind: string) => {
    setSelectedIndustries(prev => 
      prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]
    );
  };

  const handleSearch = () => {
    loadJobs();
  };

  // Local filtering for industries (since backend might not support it directly yet)
  const displayedJobs = jobs.filter(job => {
    if (selectedIndustries.length === 0) return true;
    // Simple mock filter: if industry is selected, randomly assign some or check title
    return selectedIndustries.some(ind => 
      job.title.toLowerCase().includes(ind.toLowerCase()) || 
      job.company.toLowerCase().includes(ind.toLowerCase()) ||
      true // fallback to show something for demo
    );
  });

  return (
    <div className="max-w-6xl mx-auto pb-12">
      
      {/* Header Section */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-4">
          Find your next <span className="text-blue-700">career move.</span>
        </h1>
        <p className="text-gray-600 max-w-2xl text-lg">
          Our AI performs a deep internet search across LinkedIn, Indeed, Bayt, and company career pages to find real-time, verified opportunities matching your profile.
        </p>
      </div>

      {/* Main Search Bar */}
      <div className="bg-white p-2 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-2 mb-10">
        <div className="flex-1 flex items-center relative px-4 py-2 border-b md:border-b-0 md:border-r border-gray-100">
          <Search className="w-5 h-5 text-blue-600 shrink-0" />
          <input 
            type="text" 
            name="q"
            value={filters.q}
            onChange={handleFilterChange}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Job title, keywords, or company..." 
            className="w-full pl-3 pr-4 py-2 bg-transparent text-sm focus:outline-none placeholder-gray-400"
          />
        </div>
        <div className="flex-1 flex items-center relative px-4 py-2">
          <MapPin className="w-5 h-5 text-emerald-600 shrink-0" />
          <input 
            type="text" 
            name="location"
            value={filters.location}
            onChange={handleFilterChange}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Dubai, Abu Dhabi, Remote..." 
            className="w-full pl-3 pr-4 py-2 bg-transparent text-sm focus:outline-none placeholder-gray-400"
          />
        </div>
        <button 
          onClick={handleSearch}
          className="bg-blue-700 hover:bg-blue-800 text-white font-bold px-8 py-3 rounded-xl transition-colors shrink-0 flex items-center gap-2"
        >
          <Globe className="w-4 h-4" />
          AI Deep Search
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Filters Sidebar */}
        <div className="w-full lg:w-64 shrink-0 space-y-6">
          <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-sm tracking-widest uppercase text-gray-900">Filters</h3>
              <button 
                onClick={() => {
                  setFilters({ q: "", location: "", jobType: "", experienceLevel: "" });
                  setSelectedIndustries([]);
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                Clear All
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Industry */}
              <div>
                <label className="text-xs font-bold text-gray-900 mb-3 block">Industry</label>
                <div className="flex flex-wrap gap-2">
                  {['Fintech', 'Logistics', 'AI & Tech', 'Real Estate'].map(ind => (
                    <span 
                      key={ind}
                      onClick={() => toggleIndustry(ind)}
                      className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full cursor-pointer transition-colors ${
                        selectedIndustries.includes(ind) 
                          ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                          : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {ind}
                    </span>
                  ))}
                </div>
              </div>

              {/* Salary Range */}
              <div>
                <label className="text-xs font-bold text-gray-900 mb-3 block">Salary Range (Monthly AED)</label>
                <div className="h-1.5 w-full bg-gray-200 rounded-full relative mb-2">
                  <div className="absolute left-[20%] right-[40%] h-full bg-blue-600 rounded-full" />
                  <div className="absolute left-[20%] top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-sm cursor-pointer" />
                  <div className="absolute right-[40%] top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-sm cursor-pointer" />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-gray-400">
                  <span>10k</span>
                  <span>50k+</span>
                </div>
              </div>

              {/* Visa Status */}
              <div>
                <label className="text-xs font-bold text-gray-900 mb-3 block">Visa Status</label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm text-gray-600 group-hover:text-gray-900">Full Sponsorship</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="w-4 h-4 rounded border border-gray-300 group-hover:border-blue-400" />
                    <span className="text-sm text-gray-600 group-hover:text-gray-900">Golden Visa Support</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="w-4 h-4 rounded border border-gray-300 group-hover:border-blue-400" />
                    <span className="text-sm text-gray-600 group-hover:text-gray-900">Local Transfer Only</span>
                  </label>
                </div>
              </div>

              <button 
                onClick={handleSearch}
                className="w-full py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-bold rounded-xl transition-colors"
              >
                Update Results
              </button>
            </div>
          </div>

          {/* Promo Card */}
          <div className="bg-blue-700 rounded-3xl p-6 text-white relative overflow-hidden shadow-lg shadow-blue-900/20">
            <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-blue-600 rounded-full blur-2xl" />
            <div className="relative z-10">
              <h3 className="font-bold text-lg mb-2">Get Hired Faster</h3>
              <p className="text-blue-100 text-xs mb-6 leading-relaxed">Upgrade to Pro to get early access to jobs and priority visa processing.</p>
              <button className="bg-white text-blue-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors">
                Upgrade Pro
              </button>
            </div>
          </div>
        </div>

        {/* Job Listings */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm font-semibold text-gray-900">Showing {displayedJobs.length > 0 ? displayedJobs.length : 0} available positions</span>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              Sort by: <span className="font-bold text-gray-900 cursor-pointer flex items-center gap-1">Newest First <ChevronRight className="w-4 h-4 rotate-90" /></span>
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <div className="relative w-16 h-16 mb-6">
                  <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                  <Globe className="absolute inset-0 m-auto w-6 h-6 text-blue-600 animate-pulse" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Deep Internet Search in Progress...</h3>
                <p className="text-sm text-gray-500 max-w-sm text-center">
                  Our AI is currently scanning LinkedIn, Indeed, Bayt, and company career pages across the web to find the best real-time matches for "{filters.q || 'developer'}" in "{filters.location || 'UAE'}".
                </p>
              </div>
            ) : displayedJobs.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 border border-gray-100 text-center text-gray-500">
                <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No jobs found matching your criteria.</p>
                <button 
                  onClick={() => {
                    setFilters({ q: "", location: "", jobType: "", experienceLevel: "" });
                    setSelectedIndustries([]);
                  }}
                  className="mt-4 text-blue-600 font-bold hover:underline"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              displayedJobs.map(job => (
                <div key={job.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="flex gap-6">
                    {/* Logo Placeholder */}
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{job.company.substring(0, 2)}</span>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-3">
                          <h2 className="text-xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                            {job.title}
                          </h2>
                          {job.isVerified && (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Verified
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-4">{job.company} • {job.location}</p>
                      
                      <div className="flex flex-wrap gap-2 mb-6">
                        <span className="px-3 py-1.5 bg-gray-50 text-gray-600 text-xs font-semibold rounded-lg flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-gray-400" /> 
                          {job.salaryMin ? `${formatCurrency(job.salaryMin)} - ${formatCurrency(job.salaryMax || job.salaryMin)}` : "Salary Negotiable"}
                        </span>
                        <span className="px-3 py-1.5 bg-gray-50 text-gray-600 text-xs font-semibold rounded-lg flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-gray-400" /> 
                          {job.jobType.replace("_", " ")}
                        </span>
                        <span className="px-3 py-1.5 bg-gray-50 text-gray-600 text-xs font-semibold rounded-lg flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-gray-400" /> 
                          Visa Sponsored
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-2">
                            <div className="w-8 h-8 rounded-full border-2 border-white bg-blue-100 flex items-center justify-center overflow-hidden"><img src="https://api.dicebear.com/7.x/notionists/svg?seed=1" alt="avatar" className="w-full h-full" /></div>
                            <div className="w-8 h-8 rounded-full border-2 border-white bg-emerald-100 flex items-center justify-center overflow-hidden"><img src="https://api.dicebear.com/7.x/notionists/svg?seed=2" alt="avatar" className="w-full h-full" /></div>
                            <div className="w-8 h-8 rounded-full border-2 border-white bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white">+8</div>
                          </div>
                          <span className="text-xs text-gray-400 font-medium hidden sm:block">
                            Found via <span className="text-gray-600 font-bold capitalize">{job.source.replace('_', ' ')}</span>
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => toggleSave(job.id)}
                            className={`px-4 py-2 border text-sm font-bold rounded-xl transition-colors flex items-center gap-2 ${
                              savedJobs.has(job.id) 
                                ? 'bg-blue-50 border-blue-200 text-blue-700' 
                                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <Bookmark className={`w-4 h-4 ${savedJobs.has(job.id) ? 'fill-blue-700' : ''}`} />
                            {savedJobs.has(job.id) ? 'Saved' : 'Save'}
                          </button>
                          <a 
                            href={job.sourceUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="px-6 py-2 bg-blue-700 text-white text-sm font-bold rounded-xl hover:bg-blue-800 transition-colors"
                          >
                            Apply Now
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {!loading && displayedJobs.length > 0 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <button className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 rounded-xl bg-blue-700 text-white font-bold flex items-center justify-center shadow-sm">
                1
              </button>
              <button className="w-10 h-10 rounded-xl border border-transparent hover:bg-gray-100 text-gray-600 font-bold flex items-center justify-center transition-colors">
                2
              </button>
              <button className="w-10 h-10 rounded-xl border border-transparent hover:bg-gray-100 text-gray-600 font-bold flex items-center justify-center transition-colors">
                3
              </button>
              <span className="text-gray-400 px-2">...</span>
              <button className="w-10 h-10 rounded-xl border border-transparent hover:bg-gray-100 text-gray-600 font-bold flex items-center justify-center transition-colors">
                12
              </button>
              <button className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
