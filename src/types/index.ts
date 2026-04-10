export type VisaType = "employment" | "visit" | "freelance" | "golden";
export type VisaStatus = "active" | "expired" | "cancelled";

export interface Visa {
  id: string;
  userId: string;
  type: VisaType;
  sponsor: string;
  expiryDate: string;
  status: VisaStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type JobSource = "linkedin" | "bayt" | "indeed" | "naukrigulf" | "gulf_talent" | "manual";
export type JobType = "full_time" | "part_time" | "contract" | "freelance";
export type ExperienceLevel = "entry" | "mid" | "senior" | "manager";

export interface Job {
  id: string;
  externalId: string;
  source: JobSource;
  sourceUrl: string;
  contactEmail?: string;
  title: string;
  company: string;
  industry?: string;
  location: string;
  description: string;
  salaryMin?: number;
  salaryMax?: number;
  currency: string;
  jobType: JobType;
  experienceLevel: ExperienceLevel;
  skills: string[];
  postedAt: string;
  expiresAt?: string;
  isVerified: boolean;
  isActive: boolean;
  isRemote?: boolean;
  companyCulture?: string[];
}

export type ApplicationStatus = "saved" | "applied" | "interview" | "offer" | "rejected";

export interface Application {
  id: string;
  userId: string;
  jobId: string;
  status: ApplicationStatus;
  notes?: string;
  appliedAt: string;
  updatedAt: string;
}

export interface WorkExperience {
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
}

export interface CVData {
  summary: string;
  experience: WorkExperience[];
  education: Education[];
  skills: string[];
  languages: string[];
  certifications?: string[];
  dateOfBirth?: string;
  nationality?: string;
  visaStatus?: string;
  noticePeriod: string;
  linkedin: string;
  github?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  photoUrl?: string;
  cvUrl?: string;
  cvText?: string;
  headline?: string;
  location?: string;
  nationality?: string;
  visaStatus?: string;
  github?: string;
  cvData?: CVData;
  subscriptionTier: "free" | "premium";
  role?: "super_admin" | "admin" | "publisher" | "editor" | "user";
  status?: "active" | "suspended";
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  userId: string;
  name: string;
  type: string;
  size: string;
  url?: string;
  storagePath?: string;
  isFolder: boolean;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
}
