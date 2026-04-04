import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "./FirebaseProvider";
import { getOrCreateUserProfile, saveCVData } from "../services/userService";
import { UserProfile, CVData, WorkExperience, Education } from "../types";
import { enhanceSummary, extractCVData, enhanceExperienceDescription } from "../services/cvService";
import CVPreview from "./CVPreview";
import { 
  Plus, Trash2, Save, Sparkles, Loader2, 
  Briefcase, GraduationCap, User, Wrench, 
  Globe, ChevronRight, ChevronLeft, Layout, 
  Edit3, Eye, CheckCircle2, Upload
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function CVBuilder() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [cvData, setCvData] = useState<CVData>({
    summary: "",
    experience: [],
    education: [],
    skills: [],
    languages: [],
    noticePeriod: "",
    linkedin: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [enhancingExp, setEnhancingExp] = useState<Record<number, boolean>>({});
  const [extracting, setExtracting] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [activeSection, setActiveSection] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoad = useRef(true);

  const sections = [
    { id: "personal", label: "Personal Info", icon: User },
    { id: "summary", label: "Professional Summary", icon: Edit3 },
    { id: "experience", label: "Work Experience", icon: Briefcase },
    { id: "education", label: "Education", icon: GraduationCap },
    { id: "skills", label: "Skills & Languages", icon: Wrench },
  ];

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Auto-save effect
  useEffect(() => {
    if (isInitialLoad.current) {
      if (!loading) isInitialLoad.current = false;
      return;
    }
    
    if (!user) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await saveCVData(user.uid, cvData);
        setLastSaved(new Date());
      } catch (error) {
        console.error("Auto-save failed:", error);
      } finally {
        setSaving(false);
      }
    }, 1500); // 1.5 second debounce

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [cvData, user, loading]);

  const loadData = async () => {
    try {
      const p = await getOrCreateUserProfile(user!);
      setProfile(p);
      if (p.cvData) {
        setCvData(p.cvData);
      } else {
        // Initial sync from profile
        setCvData(prev => ({
          ...prev,
          summary: p.headline ? `Experienced professional specializing in ${p.headline}.` : "",
          linkedin: ""
        }));
      }
    } catch (error) {
      console.error("Error loading CV data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await saveCVData(user.uid, cvData);
      setLastSaved(new Date());
    } catch (error) {
      console.error("Error saving CV data:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleEnhanceSummary = async () => {
    if (!cvData.summary || !profile) return;
    setEnhancing(true);
    try {
      const enhanced = await enhanceSummary(cvData.summary, profile.headline || "");
      setCvData(prev => ({ ...prev, summary: enhanced }));
    } catch (error) {
      console.error("Error enhancing summary:", error);
    } finally {
      setEnhancing(false);
    }
  };

  const handleEnhanceExperience = async (index: number) => {
    const exp = cvData.experience[index];
    if (!exp.description || !exp.position || !exp.company) {
      alert("Please fill in Position, Company, and Description before enhancing.");
      return;
    }
    
    setEnhancingExp(prev => ({ ...prev, [index]: true }));
    try {
      const enhanced = await enhanceExperienceDescription(exp.description, exp.position, exp.company);
      updateExperience(index, "description", enhanced);
    } catch (error) {
      console.error("Error enhancing experience:", error);
    } finally {
      setEnhancingExp(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setExtracting(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        const extractedData = await extractCVData(base64String, file.type);
        
        setCvData(prev => ({
          ...prev,
          summary: extractedData.summary || prev.summary,
          experience: extractedData.experience || prev.experience,
          education: extractedData.education || prev.education,
          skills: extractedData.skills || prev.skills,
          languages: extractedData.languages || prev.languages,
          noticePeriod: extractedData.noticePeriod || prev.noticePeriod,
          linkedin: extractedData.linkedin || prev.linkedin,
          github: extractedData.github || prev.github
        }));
        
        // Explicitly trigger save after extraction
        if (user) {
           await saveCVData(user.uid, {
             ...cvData,
             ...extractedData
           });
           setLastSaved(new Date());
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error extracting CV data:", error);
      alert("Failed to extract CV data. Please try again or enter manually.");
    } finally {
      setExtracting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const addExperience = () => {
    const newExp: WorkExperience = {
      company: "",
      position: "",
      location: "",
      startDate: "",
      endDate: "",
      current: false,
      description: ""
    };
    setCvData(prev => ({ ...prev, experience: [...prev.experience, newExp] }));
  };

  const removeExperience = (index: number) => {
    setCvData(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index)
    }));
  };

  const updateExperience = (index: number, field: keyof WorkExperience, value: any) => {
    const updated = [...cvData.experience];
    updated[index] = { ...updated[index], [field]: value };
    setCvData(prev => ({ ...prev, experience: updated }));
  };

  const addEducation = () => {
    const newEdu: Education = {
      institution: "",
      degree: "",
      field: "",
      startDate: "",
      endDate: ""
    };
    setCvData(prev => ({ ...prev, education: [...prev.education, newEdu] }));
  };

  const removeEducation = (index: number) => {
    setCvData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }));
  };

  const updateEducation = (index: number, field: keyof Education, value: string) => {
    const updated = [...cvData.education];
    updated[index] = { ...updated[index], [field]: value };
    setCvData(prev => ({ ...prev, education: updated }));
  };

  const handleSkillAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && e.currentTarget.value) {
      const skill = e.currentTarget.value.trim();
      if (!cvData.skills.includes(skill)) {
        setCvData(prev => ({ ...prev, skills: [...prev.skills, skill] }));
      }
      e.currentTarget.value = '';
    }
  };

  const removeSkill = (skill: string) => {
    setCvData(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));
  };

  const handleLanguageAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && e.currentTarget.value) {
      const lang = e.currentTarget.value.trim();
      if (!cvData.languages.includes(lang)) {
        setCvData(prev => ({ ...prev, languages: [...prev.languages, lang] }));
      }
      e.currentTarget.value = '';
    }
  };

  const removeLanguage = (lang: string) => {
    setCvData(prev => ({ ...prev, languages: prev.languages.filter(l => l !== lang) }));
  };

  const handleCertificationAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && e.currentTarget.value) {
      const cert = e.currentTarget.value.trim();
      const currentCerts = cvData.certifications || [];
      if (!currentCerts.includes(cert)) {
        setCvData(prev => ({ ...prev, certifications: [...currentCerts, cert] }));
      }
      e.currentTarget.value = '';
    }
  };

  const removeCertification = (cert: string) => {
    setCvData(prev => ({ ...prev, certifications: (prev.certifications || []).filter(c => c !== cert) }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-2">AI CV Builder</h1>
          <p className="text-gray-600">Create a professional, ATS-friendly CV tailored for the UAE market.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {lastSaved && (
            <div className="text-xs text-gray-500 flex items-center gap-1 mr-2">
              {saving ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Saving...</>
              ) : (
                <><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Saved {lastSaved.toLocaleTimeString()}</>
              )}
            </div>
          )}
          <div className="relative">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.doc,.docx,.txt"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={extracting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 disabled:opacity-50"
            >
              {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {extracting ? "Extracting..." : "Upload Old CV"}
            </button>
          </div>

          <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
            <button
              onClick={() => setActiveTab("edit")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
                activeTab === "edit" 
                  ? "bg-blue-600 text-white shadow-md" 
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Edit3 className="w-4 h-4" /> Edit
            </button>
            <button
              onClick={() => setActiveTab("preview")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
                activeTab === "preview" 
                  ? "bg-blue-600 text-white shadow-md" 
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Eye className="w-4 h-4" /> Preview
            </button>
          </div>
        </div>
      </div>

      {activeTab === "edit" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-3 space-y-2">
            {sections.map((section, index) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(index)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all text-left ${
                  activeSection === index
                    ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600"
                    : "bg-white text-gray-500 hover:bg-gray-50 border-l-4 border-transparent"
                }`}
              >
                <section.icon className="w-5 h-5" />
                {section.label}
              </button>
            ))}
            
            <div className="pt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-blue-700 text-white px-6 py-4 rounded-2xl font-bold hover:bg-blue-800 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Save Progress
              </button>
            </div>
          </div>

          {/* Main Form Area */}
          <div className="lg:col-span-9">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 min-h-[600px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Personal Info Section */}
                  {activeSection === 0 && (
                    <div className="space-y-8">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                          <User className="w-5 h-5" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">Personal Information</h2>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700">Full Name</label>
                          <input 
                            type="text" 
                            value={profile?.name} 
                            disabled 
                            className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-gray-500 cursor-not-allowed" 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700">Email</label>
                          <input 
                            type="text" 
                            value={profile?.email} 
                            disabled 
                            className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-gray-500 cursor-not-allowed" 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700">LinkedIn Profile URL</label>
                          <input 
                            type="text" 
                            value={cvData.linkedin}
                            onChange={(e) => setCvData(prev => ({ ...prev, linkedin: e.target.value }))}
                            placeholder="linkedin.com/in/username"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all" 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700">Notice Period</label>
                          <select
                            value={cvData.noticePeriod}
                            onChange={(e) => setCvData(prev => ({ ...prev, noticePeriod: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-white"
                          >
                            <option value="">Select Notice Period</option>
                            <option value="Immediate">Immediate</option>
                            <option value="15 Days">15 Days</option>
                            <option value="1 Month">1 Month</option>
                            <option value="2 Months">2 Months</option>
                            <option value="3 Months">3 Months</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700">Date of Birth</label>
                          <input 
                            type="text" 
                            value={cvData.dateOfBirth || ""}
                            onChange={(e) => setCvData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                            placeholder="e.g. 24 May 2001"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all" 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700">Nationality</label>
                          <input 
                            type="text" 
                            value={cvData.nationality || profile?.nationality || ""}
                            onChange={(e) => setCvData(prev => ({ ...prev, nationality: e.target.value }))}
                            placeholder="e.g. Indian"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all" 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700">Visa Status</label>
                          <input 
                            type="text" 
                            value={cvData.visaStatus || profile?.visaStatus || ""}
                            onChange={(e) => setCvData(prev => ({ ...prev, visaStatus: e.target.value }))}
                            placeholder="e.g. Resident Visa (UAE)"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all" 
                          />
                        </div>
                      </div>

                      <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shrink-0 shadow-sm">
                            <Globe className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-blue-900 mb-1">UAE Market Sync</h3>
                            <p className="text-sm text-blue-700 leading-relaxed">
                              We've automatically synced your <strong>Nationality</strong> and <strong>Visa Status</strong> from your profile if available. These are critical for UAE employers.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Summary Section */}
                  {activeSection === 1 && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                            <Edit3 className="w-5 h-5" />
                          </div>
                          <h2 className="text-2xl font-bold text-gray-900">Professional Summary</h2>
                        </div>
                        <button
                          onClick={handleEnhanceSummary}
                          disabled={enhancing || !cvData.summary}
                          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50"
                        >
                          {enhancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          AI Enhance
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Write a brief summary of your career and key strengths</label>
                        <textarea
                          value={cvData.summary}
                          onChange={(e) => setCvData(prev => ({ ...prev, summary: e.target.value }))}
                          rows={8}
                          className="w-full px-4 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all resize-none leading-relaxed"
                          placeholder="e.g. Dedicated Software Engineer with 5+ years of experience in building scalable web applications..."
                        />
                      </div>
                    </div>
                  )}

                  {/* Experience Section */}
                  {activeSection === 2 && (
                    <div className="space-y-8">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                            <Briefcase className="w-5 h-5" />
                          </div>
                          <h2 className="text-2xl font-bold text-gray-900">Work Experience</h2>
                        </div>
                        <button
                          onClick={addExperience}
                          className="flex items-center gap-2 text-blue-600 font-bold hover:bg-blue-50 px-4 py-2 rounded-xl transition-all"
                        >
                          <Plus className="w-5 h-5" /> Add Role
                        </button>
                      </div>

                      <div className="space-y-6">
                        {cvData.experience.map((exp, index) => (
                          <div key={index} className="p-6 rounded-2xl border border-gray-100 bg-gray-50/50 relative group">
                            <button
                              onClick={() => removeExperience(index)}
                              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Company Name</label>
                                <input
                                  type="text"
                                  value={exp.company}
                                  onChange={(e) => updateExperience(index, 'company', e.target.value)}
                                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Job Title</label>
                                <input
                                  type="text"
                                  value={exp.position}
                                  onChange={(e) => updateExperience(index, 'position', e.target.value)}
                                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Location</label>
                                <input
                                  type="text"
                                  value={exp.location}
                                  onChange={(e) => updateExperience(index, 'location', e.target.value)}
                                  placeholder="e.g. Dubai, UAE"
                                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Start Date</label>
                                  <input
                                    type="text"
                                    value={exp.startDate}
                                    onChange={(e) => updateExperience(index, 'startDate', e.target.value)}
                                    placeholder="MM/YYYY"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">End Date</label>
                                  <input
                                    type="text"
                                    value={exp.endDate}
                                    disabled={exp.current}
                                    onChange={(e) => updateExperience(index, 'endDate', e.target.value)}
                                    placeholder={exp.current ? "Present" : "MM/YYYY"}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-600 outline-none transition-all disabled:bg-gray-100"
                                  />
                                </div>
                              </div>
                              <div className="md:col-span-2 flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id={`current-${index}`}
                                  checked={exp.current}
                                  onChange={(e) => updateExperience(index, 'current', e.target.checked)}
                                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                />
                                <label htmlFor={`current-${index}`} className="text-sm font-bold text-gray-700">I currently work here</label>
                              </div>
                              <div className="md:col-span-2 space-y-2">
                                <div className="flex items-center justify-between">
                                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Achievements & Responsibilities</label>
                                  <button
                                    onClick={() => handleEnhanceExperience(index)}
                                    disabled={enhancingExp[index] || !exp.description}
                                    className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1.5 rounded-lg font-bold hover:shadow-md transition-all disabled:opacity-50"
                                  >
                                    {enhancingExp[index] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                    AI Enhance
                                  </button>
                                </div>
                                <textarea
                                  value={exp.description}
                                  onChange={(e) => updateExperience(index, 'description', e.target.value)}
                                  rows={4}
                                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-600 outline-none transition-all resize-none"
                                  placeholder="Describe your key achievements using bullet points..."
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {cvData.experience.length === 0 && (
                          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-3xl">
                            <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p className="text-gray-500 font-medium">No work experience added yet.</p>
                            <button onClick={addExperience} className="mt-4 text-blue-600 font-bold hover:underline">Add your first role</button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Education Section */}
                  {activeSection === 3 && (
                    <div className="space-y-8">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                            <GraduationCap className="w-5 h-5" />
                          </div>
                          <h2 className="text-2xl font-bold text-gray-900">Education</h2>
                        </div>
                        <button
                          onClick={addEducation}
                          className="flex items-center gap-2 text-blue-600 font-bold hover:bg-blue-50 px-4 py-2 rounded-xl transition-all"
                        >
                          <Plus className="w-5 h-5" /> Add Education
                        </button>
                      </div>

                      <div className="space-y-6">
                        {cvData.education.map((edu, index) => (
                          <div key={index} className="p-6 rounded-2xl border border-gray-100 bg-gray-50/50 relative group">
                            <button
                              onClick={() => removeEducation(index)}
                              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Institution</label>
                                <input
                                  type="text"
                                  value={edu.institution}
                                  onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Degree</label>
                                <input
                                  type="text"
                                  value={edu.degree}
                                  onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Field of Study</label>
                                <input
                                  type="text"
                                  value={edu.field}
                                  onChange={(e) => updateEducation(index, 'field', e.target.value)}
                                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Start Date</label>
                                  <input
                                    type="text"
                                    value={edu.startDate}
                                    onChange={(e) => updateEducation(index, 'startDate', e.target.value)}
                                    placeholder="YYYY"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">End Date</label>
                                  <input
                                    type="text"
                                    value={edu.endDate}
                                    onChange={(e) => updateEducation(index, 'endDate', e.target.value)}
                                    placeholder="YYYY"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Skills Section */}
                  {activeSection === 4 && (
                    <div className="space-y-10">
                      <div className="space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                            <Wrench className="w-5 h-5" />
                          </div>
                          <h2 className="text-2xl font-bold text-gray-900">Skills & Expertise</h2>
                        </div>
                        
                        <div className="space-y-4">
                          <label className="text-sm font-bold text-gray-700">Add technical and soft skills (Press Enter to add)</label>
                          <input
                            type="text"
                            onKeyDown={handleSkillAdd}
                            placeholder="e.g. Project Management, React, Python..."
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                          />
                          <div className="flex flex-wrap gap-2">
                            {cvData.skills.map((skill, index) => (
                              <span key={index} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-bold text-sm group">
                                {skill}
                                <button onClick={() => removeSkill(skill)} className="text-blue-300 hover:text-blue-600">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                            <Globe className="w-5 h-5" />
                          </div>
                          <h2 className="text-2xl font-bold text-gray-900">Languages</h2>
                        </div>
                        
                        <div className="space-y-4">
                          <label className="text-sm font-bold text-gray-700">Add languages you speak (Press Enter to add)</label>
                          <input
                            type="text"
                            onKeyDown={handleLanguageAdd}
                            placeholder="e.g. English, Arabic, Hindi..."
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                          />
                          <div className="flex flex-wrap gap-2">
                            {cvData.languages.map((lang, index) => (
                              <span key={index} className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg font-bold text-sm group">
                                {lang}
                                <button onClick={() => removeLanguage(lang)} className="text-emerald-300 hover:text-emerald-600">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <h2 className="text-2xl font-bold text-gray-900">Certifications</h2>
                        </div>
                        
                        <div className="space-y-4">
                          <label className="text-sm font-bold text-gray-700">Add your certifications (Press Enter to add)</label>
                          <input
                            type="text"
                            onKeyDown={handleCertificationAdd}
                            placeholder="e.g. Certified Professional Coder (CPC) - AAPC"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                          />
                          <div className="flex flex-wrap gap-2">
                            {(cvData.certifications || []).map((cert, index) => (
                              <span key={index} className="flex items-center gap-2 bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg font-bold text-sm group">
                                {cert}
                                <button onClick={() => removeCertification(cert)} className="text-purple-300 hover:text-purple-600">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="mt-12 pt-8 border-t border-gray-100 flex items-center justify-between">
                <button
                  onClick={() => setActiveSection(prev => Math.max(0, prev - 1))}
                  disabled={activeSection === 0}
                  className="flex items-center gap-2 text-gray-500 font-bold hover:text-gray-900 disabled:opacity-30 transition-all"
                >
                  <ChevronLeft className="w-5 h-5" /> Previous
                </button>
                
                <div className="flex items-center gap-2">
                  {sections.map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-1.5 rounded-full transition-all ${
                        activeSection === i ? "w-8 bg-blue-600" : "w-1.5 bg-gray-200"
                      }`} 
                    />
                  ))}
                </div>

                {activeSection < sections.length - 1 ? (
                  <button
                    onClick={() => setActiveSection(prev => Math.min(sections.length - 1, prev + 1))}
                    className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 transition-all"
                  >
                    Next <ChevronRight className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveTab("preview")}
                    className="flex items-center gap-2 text-emerald-600 font-bold hover:text-emerald-800 transition-all"
                  >
                    Preview CV <Eye className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          {profile && <CVPreview profile={profile} cvData={cvData} />}
        </div>
      )}
    </div>
  );
}
