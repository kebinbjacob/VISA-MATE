# UAE Expat Hub & Career Portal

A comprehensive, AI-powered platform designed to assist expats in the UAE with their career journey, visa management, and document organization. Built with React, Tailwind CSS, Supabase, and Google Gemini AI.

## 🌟 Core Features

### 1. 📊 Interactive Dashboard
* **Overview Metrics**: Get a quick glance at your active job applications, document vault status, and visa validity.
* **Quick Actions**: Fast access to essential tools like the CV Builder, Scam Detector, and Job Board.

### 2. 🧳 Visa Dashboard
* **Visa Tracking**: Monitor your UAE visa status, expiration dates, and renewal requirements.
* **Guidance & Resources**: Access up-to-date information regarding UAE visa regulations, grace periods, and application processes.

### 3. 💼 Smart Job Board
* **Advanced Filtering**: Search for jobs by title, location, industry, job type (Full-time, Contract, etc.), and remote availability.
* **AI Job Search**: Integrated AI search that scours the web for job postings matching your criteria and automatically parses them into the platform.
* **Direct Apply**: Seamlessly apply to jobs and automatically add them to your Job Tracker.

### 4. 📌 Kanban Job Tracker
* **Drag-and-Drop Interface**: Visually manage your job applications across different stages (Saved, Applied, Interviewing, Offer Received, Rejected).
* **Manual Entry**: Add jobs manually with detailed information including salary ranges, company culture, and source URLs.
* **Status Updates**: Easily update application statuses with real-time visual feedback.

### 5. 📄 AI-Powered CV Builder & Analyzer
* **CV Analyzer**: Upload your existing CV (PDF/DOCX) and receive an AI-generated ATS (Applicant Tracking System) compatibility score, complete with actionable feedback tailored for the UAE market.
* **CV Builder**: Create a professional CV from scratch or extract data from an existing one.
* **AI Bullet Enhancement**: Automatically improve your experience descriptions using Google Gemini AI to make them more impactful and metric-driven.

### 6. 🛡️ Scam Shield (Fraud Detector)
* **AI Scam Detection**: Paste job offers, emails, or contract text to analyze them for predatory patterns common in UAE employment scams.
* **Risk Scoring**: Receive a definitive verdict (Safe, Suspicious, Scam) along with a detailed breakdown of red flags (e.g., requests for visa fees, unofficial email addresses).
* **Community Reporting**: Save scam reports to help build a safer community.

### 7. 📁 Secure Document Vault
* **Cloud Storage**: Securely upload, store, and manage essential documents like your Passport, Emirates ID, Visa copies, and CVs.
* **Categorization**: Automatically categorizes files with visual icons for quick retrieval.
* **File Management**: View, download, and delete files directly from the platform.

### 8. 👤 Profile Management
* **Personal Details**: Manage your contact information, professional title, and location.
* **Preferences**: Set your job search preferences and notification settings.

---

## 🔐 Admin Features

The platform includes a dedicated Admin panel for managing the ecosystem:

### 1. 📈 Admin Dashboard
* **Platform Analytics**: View total users, active jobs, scam reports, and content metrics.

### 2. 🛠️ Job Management
* **CRUD Operations**: Add, edit, and delete job postings.
* **AI Image Scanner**: Upload a screenshot of a job posting (e.g., from LinkedIn or a company website), and the AI will automatically extract the title, company, description, salary, and requirements to instantly create a structured job listing.
* **AI Description Enhancement**: Automatically rewrite and format job descriptions for better clarity and appeal.

### 3. 📝 Content Management
* **Dynamic Content**: Manage platform content, FAQs, and resources dynamically without touching the codebase.

### 4. 👥 User Management
* **Role Assignment**: View all registered users and assign roles (Admin/User).
* **Account Creation**: Manually create new user accounts.

---

## 🎨 UI/UX Highlights
* **Toast Notifications**: Non-blocking, elegant pop-up notifications for success and error messages using `react-hot-toast`.
* **Confirmation Modals**: Secure, blocking modals for destructive actions (like deleting a job or document) to prevent accidental data loss.
* **Responsive Design**: Fully optimized for desktop, tablet, and mobile devices using Tailwind CSS.
* **Smooth Animations**: Fluid drag-and-drop interactions and page transitions.

---

## 💻 Tech Stack

* **Frontend**: React 18, React Router DOM, Vite
* **Styling**: Tailwind CSS, Lucide React (Icons)
* **Backend/Database**: Supabase (PostgreSQL, Auth, Storage)
* **AI Integration**: Google Gemini API (`@google/genai`)
* **Drag & Drop**: `@dnd-kit/core`
* **Notifications**: `react-hot-toast`

---

## 🚀 Setup & Installation

1. **Clone the repository**
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Environment Variables**:
   Create a `.env` file in the root directory and add the following:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   GEMINI_API_KEY=your_google_gemini_api_key
   ```
4. **Database Setup**:
   Run the provided `supabase-schema.sql` in your Supabase SQL Editor to set up the required tables, storage buckets, and Row Level Security (RLS) policies.
5. **Start the development server**:
   ```bash
   npm run dev
   ```
