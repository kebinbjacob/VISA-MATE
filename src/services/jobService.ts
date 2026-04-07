import { Job, JobSource, JobType, ExperienceLevel } from "../types";
import { GoogleGenAI } from "@google/genai";

export async function fetchJobs(filters?: {
  q?: string;
  location?: string;
  jobType?: JobType;
  experienceLevel?: ExperienceLevel;
  isRemote?: boolean;
  companyCulture?: string[];
  salaryMin?: number;
  salaryMax?: number;
}) {
  try {
    const query = filters?.q || "developer";
    const location = filters?.location || "UAE";
    
    // @ts-ignore
    const apiKey = process.env.GEMINI_API_KEY;
    
    console.log("Job Service - API Key loaded:", !!apiKey);
    
    if (!apiKey) {
      console.warn("No Gemini API key found. Falling back to empty jobs array.");
      return [];
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const searchPrompt = `Perform a deep internet search across all major job boards (LinkedIn, Indeed, Bayt, GulfTalent, NaukriGulf, etc.) and company career pages to find 10 recent, real job postings matching the following criteria:
    - Job Title/Keyword: "${query}"
    - Location: "${location}"
    ${filters?.isRemote ? '- Must be a Remote position' : ''}
    ${filters?.companyCulture && filters.companyCulture.length > 0 ? `- Company Culture should align with: ${filters.companyCulture.join(', ')}` : ''}
    ${filters?.salaryMin ? `- Minimum Salary: ${filters.salaryMin} AED` : ''}
    ${filters?.salaryMax ? `- Maximum Salary: ${filters.salaryMax} AED` : ''}
    
    CRITICAL: The "sourceUrl" MUST be a direct, deep link to the specific job posting where a user can apply. DO NOT provide generic homepages (e.g., do not just provide "https://linkedin.com"). If you cannot find the exact direct link, provide the most specific search result URL possible.
    
    Return the results STRICTLY as a JSON array of objects. Do not include any markdown formatting, conversational text, or explanations. Just the raw JSON array.
    Each object must have the following properties:
    - id: A unique string ID (e.g., "job-123").
    - title: The exact job title.
    - company: The hiring company's name.
    - location: The specific job location (e.g., "Dubai, UAE").
    - description: A short 2-3 sentence summary of the role and requirements.
    - sourceUrl: The DIRECT URL to apply or view the job posting.
    - source: The name of the job board or source (must be one of: "linkedin", "bayt", "indeed", "naukrigulf", "gulf_talent", or "manual" if from a direct company site).
    - jobType: One of "full_time", "part_time", "contract", "freelance".
    - experienceLevel: One of "entry", "mid", "senior", "manager".
    - salaryMin: (Optional) minimum salary in AED (number only).
    - salaryMax: (Optional) maximum salary in AED (number only).
    - isRemote: (Optional) boolean indicating if the job is remote.
    - companyCulture: (Optional) array of strings describing the company culture.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: searchPrompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
      }
    });

    let text = response.text || "[]";
    
    // Clean up potential markdown formatting
    if (text.includes("```json")) {
      text = text.split("```json")[1].split("```")[0].trim();
    } else if (text.includes("```")) {
      text = text.split("```")[1].split("```")[0].trim();
    }

    let rawJobs = [];
    try {
      rawJobs = JSON.parse(text);
    } catch (parseError) {
      console.error("Failed to parse Gemini response as JSON:", text);
      return [];
    }
    
    if (!Array.isArray(rawJobs)) {
      rawJobs = [rawJobs];
    }

    const getFallbackSearchUrl = (title: string, company: string, source: string): string => {
      const q = encodeURIComponent(`${title} ${company} UAE`);
      switch (source) {
        case "linkedin": return `https://www.linkedin.com/jobs/search/?keywords=${q}`;
        case "indeed": return `https://ae.indeed.com/jobs?q=${q}`;
        case "bayt": return `https://www.bayt.com/en/uae/jobs/search/?keyword=${q}`;
        case "naukrigulf": return `https://www.naukrigulf.com/${q.replace(/%20/g, '-')}-jobs-in-uae`;
        default: return `https://www.google.com/search?q=${q}+job+apply`;
      }
    };

    let mappedJobs: Job[] = rawJobs.map((raw: any, index: number) => {
      // Ensure source is one of the allowed types
      let source = (raw.source?.toLowerCase() || "manual") as string;
      const allowedSources = ["linkedin", "bayt", "indeed", "naukrigulf", "gulf_talent", "manual"];
      if (!allowedSources.includes(source)) {
        source = "manual";
      }

      // Validate sourceUrl - if it's too short or just a domain, use a fallback search URL
      let sourceUrl = raw.sourceUrl || "#";
      const isGenericDomain = sourceUrl.length < 25 || 
                             sourceUrl.endsWith(".com") || 
                             sourceUrl.endsWith(".ae") || 
                             sourceUrl.endsWith(".com/") || 
                             sourceUrl.endsWith(".ae/");
      
      if (isGenericDomain || sourceUrl === "#") {
        sourceUrl = getFallbackSearchUrl(raw.title || query, raw.company || "", source);
      }

      return {
        id: raw.id || `gen-job-${Date.now()}-${index}`,
        externalId: raw.id || `ext-${Date.now()}-${index}`,
        source: source as JobSource,
        sourceUrl: sourceUrl,
        title: raw.title || "Unknown Title",
        company: raw.company || "Unknown Company",
        location: raw.location || location,
        description: raw.description || "No description provided.",
        currency: "AED",
        jobType: raw.jobType || "full_time",
        experienceLevel: raw.experienceLevel || "mid",
        salaryMin: raw.salaryMin,
        salaryMax: raw.salaryMax,
        isRemote: raw.isRemote,
        companyCulture: raw.companyCulture || [],
        skills: [],
        postedAt: new Date().toISOString(),
        isVerified: true,
        isActive: true,
      };
    });

    // Apply frontend filters if any
    if (filters?.jobType) {
      mappedJobs = mappedJobs.filter((j) => j.jobType === filters.jobType);
    }

    if (filters?.experienceLevel) {
      mappedJobs = mappedJobs.filter((j) => j.experienceLevel === filters.experienceLevel);
    }

    if (filters?.isRemote) {
      mappedJobs = mappedJobs.filter((j) => j.isRemote || j.location.toLowerCase().includes('remote'));
    }

    if (filters?.salaryMin) {
      mappedJobs = mappedJobs.filter((j) => !j.salaryMax || j.salaryMax >= filters.salaryMin!);
    }

    if (filters?.salaryMax) {
      mappedJobs = mappedJobs.filter((j) => !j.salaryMin || j.salaryMin <= filters.salaryMax!);
    }

    return mappedJobs;
  } catch (error: any) {
    if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("RESOURCE_EXHAUSTED")) {
      console.warn("Gemini API rate limit exceeded. Falling back to mock jobs.");
    } else {
      console.error("Error fetching live jobs via Gemini:", error);
    }
    
    // Fallback mock data in case of API rate limits or errors
    const query = filters?.q || "developer";
    const location = filters?.location || "UAE";
    
    const mockJobs: Job[] = [
      {
        id: `mock-1-${Date.now()}`,
        externalId: `ext-mock-1`,
        source: "linkedin",
        sourceUrl: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query + " " + location)}`,
        title: `Senior ${query.charAt(0).toUpperCase() + query.slice(1)}`,
        company: "TechCorp Middle East",
        location: location,
        description: "We are looking for an experienced professional to join our growing team in the region. Must have strong communication skills and a proven track record.",
        currency: "AED",
        jobType: "full_time",
        experienceLevel: "senior",
        salaryMin: 25000,
        salaryMax: 35000,
        skills: [],
        postedAt: new Date().toISOString(),
        isVerified: true,
        isActive: true,
      },
      {
        id: `mock-2-${Date.now()}`,
        externalId: `ext-mock-2`,
        source: "bayt",
        sourceUrl: `https://www.bayt.com/en/uae/jobs/search/?keyword=${encodeURIComponent(query)}`,
        title: `${query.charAt(0).toUpperCase() + query.slice(1)} Specialist`,
        company: "Global Innovations LLC",
        location: location,
        description: "Exciting opportunity for a specialist to lead new initiatives. We offer full visa sponsorship, health insurance, and annual flight tickets.",
        currency: "AED",
        jobType: "full_time",
        experienceLevel: "mid",
        salaryMin: 15000,
        salaryMax: 22000,
        skills: [],
        postedAt: new Date(Date.now() - 86400000).toISOString(),
        isVerified: true,
        isActive: true,
      },
      {
        id: `mock-3-${Date.now()}`,
        externalId: `ext-mock-3`,
        source: "indeed",
        sourceUrl: `https://ae.indeed.com/jobs?q=${encodeURIComponent(query)}`,
        title: `Lead ${query.charAt(0).toUpperCase() + query.slice(1)}`,
        company: "Future Enterprises",
        location: location,
        description: "Join our dynamic team. This role requires 5+ years of experience and deep knowledge of the local market.",
        currency: "AED",
        jobType: "full_time",
        experienceLevel: "manager",
        skills: [],
        postedAt: new Date(Date.now() - 172800000).toISOString(),
        isVerified: true,
        isActive: true,
      }
    ];
    
    let filteredMockJobs = mockJobs;
    if (filters?.jobType) {
      filteredMockJobs = filteredMockJobs.filter((j) => j.jobType === filters.jobType);
    }
    if (filters?.experienceLevel) {
      filteredMockJobs = filteredMockJobs.filter((j) => j.experienceLevel === filters.experienceLevel);
    }
    if (filters?.isRemote) {
      filteredMockJobs = filteredMockJobs.filter((j) => j.isRemote || j.location.toLowerCase().includes('remote'));
    }
    if (filters?.salaryMin) {
      filteredMockJobs = filteredMockJobs.filter((j) => !j.salaryMax || j.salaryMax >= filters.salaryMin!);
    }
    if (filters?.salaryMax) {
      filteredMockJobs = filteredMockJobs.filter((j) => !j.salaryMin || j.salaryMin <= filters.salaryMax!);
    }
    
    return filteredMockJobs;
  }
}

export async function getJobById(id: string) {
  return null;
}
