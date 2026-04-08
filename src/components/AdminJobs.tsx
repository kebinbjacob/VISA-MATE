import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { Job, JobType, ExperienceLevel } from "../types";
import { Plus, Search, Edit2, Trash2, UploadCloud, Loader2, Image as ImageIcon, CheckCircle, Sparkles, Globe, X } from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import { searchJobsWithAI, enhanceJobDescription } from "../services/jobService";

export default function AdminJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  const [isAiSearchModalOpen, setIsAiSearchModalOpen] = useState(false);
  const [aiSearchQuery, setAiSearchQuery] = useState("");
  const [aiSearchLocation, setAiSearchLocation] = useState("UAE");
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiSearchResults, setAiSearchResults] = useState<Job[]>([]);

  const [formData, setFormData] = useState<Partial<Job>>({
    title: "",
    company: "",
    location: "",
    description: "",
    jobType: "full_time",
    experienceLevel: "mid",
    sourceUrl: "",
    contactEmail: "",
    source: "manual",
    isActive: true,
  });

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('posted_at', { ascending: false });
        
      if (error) throw error;
      
      // Map snake_case to camelCase
      const mappedJobs = (data || []).map(job => ({
        id: job.id,
        externalId: job.external_id,
        source: job.source,
        sourceUrl: job.source_url,
        title: job.title,
        company: job.company,
        location: job.location,
        description: job.description,
        salaryMin: job.salary_min,
        salaryMax: job.salary_max,
        currency: job.currency,
        jobType: job.job_type,
        experienceLevel: job.experience_level,
        skills: job.skills || [],
        postedAt: job.posted_at,
        expiresAt: job.expires_at,
        isVerified: job.is_verified,
        isActive: job.is_active,
        isRemote: job.is_remote,
        companyCulture: job.company_culture || [],
      }));
      
      setJobs(mappedJobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanSuccess(false);
    
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        const mimeType = file.type;

        // @ts-ignore
        const apiKey = process.env.GEMINI_API_KEY;
        const ai = new GoogleGenAI({ apiKey });

        const prompt = `Analyze this job posting image and extract the details into a strict JSON object with the following keys:
        - title (string)
        - company (string)
        - location (string)
        - description (string, summarize in 2-3 sentences)
        - jobType (string, one of: "full_time", "part_time", "contract", "freelance")
        - experienceLevel (string, one of: "entry", "mid", "senior", "manager")
        - salaryMin (number or null, extract numbers only)
        - salaryMax (number or null, extract numbers only)
        - skills (array of strings)
        
        Return ONLY the raw JSON object. No markdown formatting, no backticks.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [
            prompt,
            { inlineData: { data: base64String, mimeType } }
          ]
        });

        let text = response.text || "{}";
        if (text.includes("\`\`\`json")) {
          text = text.split("\`\`\`json")[1].split("\`\`\`")[0].trim();
        } else if (text.includes("\`\`\`")) {
          text = text.split("\`\`\`")[1].split("\`\`\`")[0].trim();
        }

        const extractedData = JSON.parse(text);
        
        setFormData(prev => ({
          ...prev,
          title: extractedData.title || prev.title,
          company: extractedData.company || prev.company,
          location: extractedData.location || prev.location,
          description: extractedData.description || prev.description,
          jobType: extractedData.jobType || prev.jobType,
          experienceLevel: extractedData.experienceLevel || prev.experienceLevel,
          salaryMin: extractedData.salaryMin || prev.salaryMin,
          salaryMax: extractedData.salaryMax || prev.salaryMax,
          skills: extractedData.skills || prev.skills,
        }));
        
        setScanSuccess(true);
        setTimeout(() => setScanSuccess(false), 3000);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error scanning image:", error);
      alert("Failed to scan image. Please try again or enter details manually.");
    } finally {
      setIsScanning(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const jobData = {
        external_id: `manual-${Date.now()}`,
        title: formData.title,
        company: formData.company,
        location: formData.location,
        description: formData.description,
        job_type: formData.jobType,
        experience_level: formData.experienceLevel,
        source_url: formData.sourceUrl || '#',
        contact_email: formData.contactEmail || null,
        source: formData.source || 'manual',
        salary_min: formData.salaryMin,
        salary_max: formData.salaryMax,
        currency: 'AED',
        skills: formData.skills || [],
        is_active: formData.isActive,
        is_verified: true,
        posted_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('jobs')
        .insert([jobData]);

      if (error) throw error;

      alert("Job saved successfully!");
      setIsModalOpen(false);
      setFormData({
        title: "",
        company: "",
        location: "",
        description: "",
        jobType: "full_time",
        experienceLevel: "mid",
        sourceUrl: "",
        contactEmail: "",
        source: "manual",
        isActive: true,
      });
      
      // Refresh the jobs list
      fetchJobs();
    } catch (error: any) {
      console.error("Error saving job:", error);
      alert(`Failed to save job: ${error.message}`);
    }
  };

  const handleEnhanceDescription = async () => {
    if (!formData.description) return;
    setIsEnhancing(true);
    try {
      const enhanced = await enhanceJobDescription(formData.description);
      setFormData(prev => ({ ...prev, description: enhanced }));
    } catch (error) {
      console.error("Failed to enhance description:", error);
      alert("Failed to enhance description.");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAiSearching(true);
    try {
      const results = await searchJobsWithAI({ q: aiSearchQuery, location: aiSearchLocation });
      setAiSearchResults(results);
    } catch (error) {
      console.error("AI Search failed:", error);
      alert("AI Search failed.");
    } finally {
      setIsAiSearching(false);
    }
  };

  const handleApproveAiJob = async (job: Job) => {
    try {
      const jobData = {
        external_id: job.externalId || `ai-${Date.now()}`,
        title: job.title,
        company: job.company,
        location: job.location,
        description: job.description,
        job_type: job.jobType,
        experience_level: job.experienceLevel,
        source_url: job.sourceUrl || '#',
        contact_email: job.contactEmail || null,
        source: job.source || 'manual',
        salary_min: job.salaryMin,
        salary_max: job.salaryMax,
        currency: 'AED',
        skills: job.skills || [],
        is_active: true,
        is_verified: true,
        posted_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('jobs').insert([jobData]);
      if (error) throw error;

      alert("Job approved and added to the board!");
      setAiSearchResults(prev => prev.filter(j => j.id !== job.id));
      fetchJobs();
    } catch (error: any) {
      console.error("Error approving job:", error);
      alert(`Failed to approve job: ${error.message}`);
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this job?")) return;
    try {
      const { error } = await supabase.from('jobs').delete().eq('id', id);
      if (error) throw error;
      setJobs(jobs.filter(j => j.id !== id));
    } catch (error: any) {
      console.error("Error deleting job:", error);
      alert("Failed to delete job.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Postings</h1>
          <p className="text-gray-500 text-sm">Manage job listings and use AI to scan new postings.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsAiSearchModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            <Globe className="w-5 h-5" />
            AI Job Search
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Job
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
            <input 
              type="text"
              placeholder="Search jobs..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
                <th className="p-4 font-medium">Job Title</th>
                <th className="p-4 font-medium">Company</th>
                <th className="p-4 font-medium">Location</th>
                <th className="p-4 font-medium">Type</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">Loading jobs...</td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">No jobs found. Add one to get started.</td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium text-gray-900">{job.title}</td>
                    <td className="p-4 text-gray-600">{job.company}</td>
                    <td className="p-4 text-gray-600">{job.location}</td>
                    <td className="p-4 text-gray-600 capitalize">{job.jobType.replace('_', ' ')}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${job.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {job.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4 flex justify-end gap-2">
                      <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteJob(job.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Job Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:rounded-2xl max-w-3xl shadow-xl flex flex-col">
            <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold text-gray-900">Add New Job</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              {/* AI Scanner Section */}
              <div className="mb-8 p-6 bg-blue-50 border border-blue-100 rounded-2xl">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-blue-900 mb-1">AI Job Scanner</h3>
                    <p className="text-sm text-blue-700 mb-4">
                      Upload a screenshot of a job posting. Our AI will automatically extract the details and fill the form below.
                    </p>
                    
                    <div className="relative">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isScanning}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <div className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed transition-colors ${isScanning ? 'border-blue-300 bg-blue-100/50' : scanSuccess ? 'border-green-400 bg-green-50 text-green-700' : 'border-blue-300 bg-white text-blue-600 hover:bg-blue-50'}`}>
                        {isScanning ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="font-medium">Scanning image...</span>
                          </>
                        ) : scanSuccess ? (
                          <>
                            <CheckCircle className="w-5 h-5" />
                            <span className="font-medium">Data extracted successfully!</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-5 h-5" />
                            <span className="font-medium">Upload Screenshot</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <form id="add-job-form" onSubmit={handleSaveJob} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
                    <input 
                      type="text" 
                      required
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company *</label>
                    <input 
                      type="text" 
                      required
                      value={formData.company}
                      onChange={e => setFormData({...formData, company: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                    <input 
                      type="text" 
                      required
                      value={formData.location}
                      onChange={e => setFormData({...formData, location: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Source URL</label>
                    <input 
                      type="url" 
                      value={formData.sourceUrl}
                      onChange={e => setFormData({...formData, sourceUrl: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                    <input 
                      type="email" 
                      value={formData.contactEmail || ''}
                      onChange={e => setFormData({...formData, contactEmail: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="hr@company.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Type</label>
                    <select 
                      value={formData.jobType}
                      onChange={e => setFormData({...formData, jobType: e.target.value as JobType})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="full_time">Full Time</option>
                      <option value="part_time">Part Time</option>
                      <option value="contract">Contract</option>
                      <option value="freelance">Freelance</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Experience Level</label>
                    <select 
                      value={formData.experienceLevel}
                      onChange={e => setFormData({...formData, experienceLevel: e.target.value as ExperienceLevel})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="entry">Entry Level</option>
                      <option value="mid">Mid Level</option>
                      <option value="senior">Senior Level</option>
                      <option value="manager">Manager/Director</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Salary (AED)</label>
                    <input 
                      type="number" 
                      value={formData.salaryMin || ''}
                      onChange={e => setFormData({...formData, salaryMin: parseInt(e.target.value) || undefined})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Salary (AED)</label>
                    <input 
                      type="number" 
                      value={formData.salaryMax || ''}
                      onChange={e => setFormData({...formData, salaryMax: parseInt(e.target.value) || undefined})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">Description *</label>
                    <button
                      type="button"
                      onClick={handleEnhanceDescription}
                      disabled={isEnhancing || !formData.description}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 disabled:opacity-50"
                    >
                      {isEnhancing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      Enhance with AI
                    </button>
                  </div>
                  <textarea 
                    required
                    rows={6}
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-y"
                  />
                </div>

              </form>
            </div>

            <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50 shrink-0 flex justify-end gap-3 sm:rounded-b-2xl">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                form="add-job-form"
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm"
              >
                Save Job
              </button>
            </div>
          </div>
        </div>
      )}
      {/* AI Search Modal */}
      {isAiSearchModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:rounded-2xl max-w-4xl shadow-xl flex flex-col">
            <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Globe className="w-6 h-6 text-indigo-600" />
                AI Job Search
              </h2>
              <button 
                onClick={() => setIsAiSearchModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50 shrink-0">
              <form onSubmit={handleAiSearch} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1">
                  <input 
                    type="text" 
                    placeholder="Job Title or Keywords (e.g. Frontend Developer)"
                    value={aiSearchQuery}
                    onChange={e => setAiSearchQuery(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
                <div className="w-full sm:w-48">
                  <input 
                    type="text" 
                    placeholder="Location (e.g. UAE)"
                    value={aiSearchLocation}
                    onChange={e => setAiSearchLocation(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isAiSearching}
                  className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
                >
                  {isAiSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  Search Web
                </button>
              </form>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              {isAiSearching ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-600" />
                  <p>AI is scouring the web for job postings...</p>
                </div>
              ) : aiSearchResults.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No results yet. Enter a query and search to find jobs.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {aiSearchResults.map((job) => (
                    <div key={job.id} className="border border-gray-200 rounded-xl p-4 hover:border-indigo-300 transition-colors bg-white">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                        <div>
                          <h3 className="font-bold text-lg text-gray-900">{job.title}</h3>
                          <p className="text-sm text-gray-600 font-medium">{job.company} • {job.location}</p>
                        </div>
                        <button 
                          onClick={() => handleApproveAiJob(job)}
                          className="w-full sm:w-auto px-4 py-2 sm:py-1.5 bg-green-100 text-green-700 font-bold text-sm rounded-lg hover:bg-green-200 transition-colors flex items-center justify-center gap-1 shrink-0"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve & Add
                        </button>
                      </div>
                      <p className="text-sm text-gray-700 mb-3 line-clamp-2">{job.description}</p>
                      <div className="flex gap-2 text-xs">
                        <span className="px-2 py-1 bg-gray-100 rounded text-gray-600 capitalize">{job.jobType.replace('_', ' ')}</span>
                        <span className="px-2 py-1 bg-gray-100 rounded text-gray-600 capitalize">{job.experienceLevel}</span>
                        <a href={job.sourceUrl} target="_blank" rel="noreferrer" className="px-2 py-1 bg-blue-50 text-blue-600 rounded hover:underline">View Source</a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
