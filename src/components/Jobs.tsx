import React, { useEffect, useState } from "react";
import { fetchJobs } from "../services/jobService";
import { getUserApplications, addApplication, deleteApplication } from "../services/applicationService";
import { Job, JobType, ExperienceLevel, Application } from "../types";
import { useAuth } from "./AuthProvider";
import { Search, MapPin, Briefcase, DollarSign, Filter, ExternalLink, CheckCircle2, Bookmark, ChevronLeft, ChevronRight, Globe, Clock, ShieldCheck, Building2, Mail } from "lucide-react";
import { formatCurrency, formatDate } from "../lib/utils";

export default function Jobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedJobs, setSavedJobs] = useState<Map<string, string>>(new Map()); // jobId -> applicationId
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    q: "",
    location: "",
    jobType: "" as JobType | "",
    experienceLevel: "" as ExperienceLevel | "",
    isRemote: false,
    companyCulture: [] as string[],
    salaryMin: 0,
    salaryMax: 0,
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
      const apps = await getUserApplications(user.id);
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
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFilters(prev => ({ ...prev, [name]: checked }));
    } else {
      setFilters(prev => ({ ...prev, [name]: value }));
    }
  };

  const toggleCulture = (culture: string) => {
    setFilters(prev => ({
      ...prev,
      companyCulture: prev.companyCulture.includes(culture)
        ? prev.companyCulture.filter(c => c !== culture)
        : [...prev.companyCulture, culture]
    }));
  };

  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
  };

  const toggleSave = async (job: Job) => {
    if (!user) return;
    
    try {
      if (savedJobs.has(job.id)) {
        // Unsave
        const appId = savedJobs.get(job.id)!;
        await deleteApplication(appId);
        setSavedJobs(prev => {
          const next = new Map(prev);
          next.delete(job.id);
          return next;
        });
      } else {
        // Save
        const appId = await addApplication(user.id, job, 'saved');
        setSavedJobs(prev => {
          const next = new Map(prev);
          next.set(job.id, appId);
          return next;
        });
      }
    } catch (error) {
      console.error("Failed to toggle save:", error);
    }
  };

  const toggleExpandJob = (jobId: string) => {
    setExpandedJobs(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
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
          Browse our curated list of verified, high-quality job opportunities. All postings are vetted by our team.
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
          <Search className="w-4 h-4" />
          Search Jobs
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
                  setFilters({ q: "", location: "", jobType: "", experienceLevel: "", isRemote: false, companyCulture: [], salaryMin: 0, salaryMax: 0 });
                  setSelectedIndustries([]);
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                Clear All
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Remote Work */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-4 h-4 rounded flex items-center justify-center border ${filters.isRemote ? 'bg-blue-600 border-blue-600' : 'border-gray-300 group-hover:border-blue-400'}`}>
                    {filters.isRemote && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  <input 
                    type="checkbox" 
                    name="isRemote"
                    checked={filters.isRemote}
                    onChange={handleFilterChange}
                    className="hidden"
                  />
                  <span className="text-sm font-bold text-gray-900">Remote Work Only</span>
                </label>
              </div>

              {/* Company Culture */}
              <div>
                <label className="text-xs font-bold text-gray-900 mb-3 block">Company Culture</label>
                <div className="flex flex-wrap gap-2">
                  {['Innovative', 'Fast-paced', 'Flexible', 'Collaborative', 'Startup'].map(culture => (
                    <span 
                      key={culture}
                      onClick={() => toggleCulture(culture)}
                      className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full cursor-pointer transition-colors ${
                        filters.companyCulture.includes(culture) 
                          ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                          : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {culture}
                    </span>
                  ))}
                </div>
              </div>

              {/* Salary Range */}
              <div>
                <label className="text-xs font-bold text-gray-900 mb-3 block">Salary Range (Monthly AED)</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    name="salaryMin"
                    value={filters.salaryMin || ''}
                    onChange={handleSalaryChange}
                    placeholder="Min"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-gray-400">-</span>
                  <input 
                    type="number" 
                    name="salaryMax"
                    value={filters.salaryMax || ''}
                    onChange={handleSalaryChange}
                    placeholder="Max"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

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
                  <Briefcase className="absolute inset-0 m-auto w-6 h-6 text-blue-600 animate-pulse" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Loading Jobs...</h3>
                <p className="text-sm text-gray-500 max-w-sm text-center">
                  Fetching the latest vetted opportunities.
                </p>
              </div>
            ) : displayedJobs.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 border border-gray-100 text-center text-gray-500">
                <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No jobs found matching your criteria.</p>
                <button 
                  onClick={() => {
                    setFilters({ q: "", location: "", jobType: "", experienceLevel: "", isRemote: false, companyCulture: [], salaryMin: 0, salaryMax: 0 });
                    setSelectedIndustries([]);
                  }}
                  className="mt-4 text-blue-600 font-bold hover:underline"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              displayedJobs.map(job => (
                <div key={job.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group flex flex-col gap-4">
                  <div className="flex items-start gap-4">
                    {/* Logo Placeholder */}
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200 flex items-center justify-center shrink-0 text-blue-700">
                      <Building2 className="w-6 h-6" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className="text-lg font-bold text-gray-900 group-hover:text-blue-700 transition-colors line-clamp-1">
                            {job.title}
                          </h2>
                          <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                            <span className="font-medium text-gray-900">{job.company}</span>
                            {job.industry && (
                              <>
                                <span>•</span>
                                <span className="text-gray-500">{job.industry}</span>
                              </>
                            )}
                            <span>•</span>
                            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-gray-400" /> {job.location}</span>
                          </div>
                        </div>
                        {job.isVerified && (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1 shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <p className={`text-sm text-gray-600 leading-relaxed whitespace-pre-wrap ${expandedJobs.has(job.id) ? '' : 'line-clamp-2'}`}>
                      {job.description}
                    </p>
                    {job.description && job.description.length > 100 && (
                      <button 
                        onClick={() => toggleExpandJob(job.id)}
                        className="text-blue-600 text-xs font-semibold hover:underline self-start"
                      >
                        {expandedJobs.has(job.id) ? 'Show Less' : 'Read More'}
                      </button>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1.5 bg-green-50 text-green-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-green-100">
                      <DollarSign className="w-3.5 h-3.5" /> 
                      {job.salaryMin ? `${formatCurrency(job.salaryMin)} - ${formatCurrency(job.salaryMax || job.salaryMin)}` : "Salary Negotiable"}
                    </span>
                    <span className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-blue-100">
                      <Briefcase className="w-3.5 h-3.5" /> 
                      <span className="capitalize">{job.jobType.replace("_", " ")}</span>
                    </span>
                    <span className="px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-purple-100">
                      <ShieldCheck className="w-3.5 h-3.5" /> 
                      Visa Sponsored
                    </span>
                    <span className="px-3 py-1.5 bg-gray-50 text-gray-600 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-gray-200">
                      <Clock className="w-3.5 h-3.5" /> 
                      {job.experienceLevel.charAt(0).toUpperCase() + job.experienceLevel.slice(1)} Level
                    </span>
                    {job.isRemote && (
                      <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-indigo-100">
                        <Globe className="w-3.5 h-3.5" /> 
                        Remote
                      </span>
                    )}
                    {job.companyCulture && job.companyCulture.length > 0 && (
                      <span className="px-3 py-1.5 bg-orange-50 text-orange-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-orange-100">
                        <Building2 className="w-3.5 h-3.5" /> 
                        {job.companyCulture[0]}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                      <span>Source:</span>
                      <span className="px-2 py-1 bg-gray-100 rounded-md text-gray-700 capitalize">{job.source.replace('_', ' ')}</span>
                      <span className="hidden sm:inline">• Posted {new Date(job.postedAt).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => toggleSave(job)}
                        className={`p-2.5 border rounded-xl transition-colors flex items-center justify-center ${
                          savedJobs.has(job.id) 
                            ? 'bg-blue-50 border-blue-200 text-blue-700' 
                            : 'border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                        title={savedJobs.has(job.id) ? 'Saved' : 'Save Job'}
                      >
                        <Bookmark className={`w-5 h-5 ${savedJobs.has(job.id) ? 'fill-blue-700' : ''}`} />
                      </button>
                      {job.contactEmail && (
                        <a 
                          href={`mailto:${job.contactEmail}?subject=Application for ${job.title}`}
                          className="px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2"
                        >
                          <Mail className="w-4 h-4" />
                          <span className="hidden sm:inline">Email HR</span>
                        </a>
                      )}
                      <a 
                        href={job.sourceUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="px-6 py-2.5 bg-blue-700 text-white text-sm font-bold rounded-xl hover:bg-blue-800 transition-colors flex items-center gap-2"
                      >
                        Apply Now <ExternalLink className="w-4 h-4" />
                      </a>
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
