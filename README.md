# VisaMate - Expat Concierge & Career Platform

VisaMate is a comprehensive, AI-powered platform designed to help expats manage their visas, find vetted jobs, track applications, build professional CVs, and protect themselves from employment scams.

## 🌟 Key Features

### For Users
*   **🛂 Visa Tracker**: Keep track of your visa status, sponsor details, and expiry dates. Get a clear view of days remaining and compliance checklists.
*   **💼 Job Board**: Browse curated, vetted job opportunities. Features an instant, client-side global search across job titles, descriptions, companies, and skills.
*   **📊 Job Tracker**: A Kanban-style drag-and-drop board to manage your job applications across different stages (Saved, Applied, Interviewing, Offer, Rejected).
*   **✨ AI CV Builder**: Build ATS-friendly CVs tailored for the UAE market. Use AI to generate summaries, enhance experience descriptions, or even extract data from old CVs. Includes a credit system and Premium tier badges.
*   **🔍 CV Analyzer**: Upload your CV and get instant AI feedback on how to improve it for specific job roles.
*   **📁 Document Vault**: Securely store, organize, and manage your important documents with full folder navigation support.
*   **🛡️ Scam Detector**: Paste job offers or emails to get an instant AI analysis of potential red flags and fraud indicators.
*   **📚 Resources & Guides**: Access dynamic, markdown-rendered guides, FAQs, and announcements.

### For Administrators
*   **👥 User Management**: View all users, change roles (User, Editor, Publisher, Admin, Super Admin), manage subscription tiers, allocate Bonus AI Credits, suspend accounts, and delete user data.
*   **🏢 Job Management**: Add, edit, and verify job postings.
*   **📝 Content Management**: Create and manage dynamic content blocks, announcements, and resource pages using Markdown.

## 🛠️ Tech Stack

*   **Frontend**: React 18, TypeScript, Vite
*   **Styling**: Tailwind CSS
*   **Icons**: Lucide React
*   **Animations**: Motion (Framer Motion)
*   **Drag & Drop**: `@dnd-kit/core`
*   **Backend & Auth**: Supabase (PostgreSQL, Authentication, Storage)
*   **AI Integration**: Google Gemini API (`@google/genai`)
*   **Markdown Rendering**: `react-markdown`

## 🚀 Getting Started

### Prerequisites
Ensure you have Node.js installed on your machine. You will also need a Supabase project and a Google Gemini API key.

### Environment Variables
Create a `.env` file in the root directory and add the following variables:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_google_gemini_api_key
```

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## 🗄️ Database Setup (Supabase)

This project requires specific tables in Supabase:
*   `users`: Extended user profiles, roles, subscription tiers, and AI credits.
*   `jobs`: Job listings and metadata.
*   `applications`: User job applications linked to jobs.
*   `visas`: User visa records.
*   `documents`: Metadata for files stored in Supabase Storage.
*   `content`: Dynamic content blocks for the Resources page and announcements.

*Note: Ensure Row Level Security (RLS) policies are correctly configured to prevent infinite recursion, especially on the `users` table for admin access.*

## 📄 License

Designed and Developed by Appmatix Solutions. All Rights Reserved.
