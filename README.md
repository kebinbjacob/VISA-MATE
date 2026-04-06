# VisaMate | Expat Concierge

VisaMate is a comprehensive, AI-powered dashboard designed specifically for expats navigating the UAE job market and visa processes. It combines intelligent job searching, ATS-optimized CV building, document management, and security tools into a single, unified platform.

## 🌟 Key Features

*   **🤖 AI-Powered Job Board**: Performs deep internet searches across major UAE job boards (LinkedIn, Indeed, Bayt, NaukriGulf) using the Google Gemini API to find real-time, verified opportunities matching your profile.
*   **📄 CV Builder & Exporter**: Create professional, ATS-friendly CVs tailored for the UAE market. Includes an "AI Enhance" feature to automatically rewrite your professional summary for maximum impact. Export directly to PDF.
*   **📊 CV Analyzer**: Upload your existing CV to get an instant ATS compatibility score, missing keyword suggestions, and layout improvement recommendations powered by AI.
*   **🛂 Visa Tracker**: Keep track of your UAE visa status, expiry dates, and sponsorship details.
*   **📁 Document Vault**: Securely store and manage your important documents (passports, certificates, visas) in the cloud.
*   **🛡️ Security Center (Scam Detector)**: Analyze suspicious job offers or emails using AI to detect potential scams and protect yourself from fraud.

## 🛠️ Tech Stack

*   **Frontend**: React 18, TypeScript, Vite
*   **Styling**: Tailwind CSS, Lucide React (Icons)
*   **Backend/BaaS**: Supabase (Authentication, PostgreSQL Database, Storage)
*   **AI Integration**: Google Gemini API (`@google/genai`)
*   **PDF Generation**: `jspdf`, `html2canvas`
*   **Routing**: React Router DOM

## 🚀 Getting Started

### Prerequisites

*   Node.js (v18 or higher)
*   npm or yarn
*   A Supabase project with Authentication, Database, and Storage enabled
*   A Google Gemini API Key

### Environment Variables

Create a `.env` file in the root directory and add your API keys:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## 📂 Project Structure

*   `/src/components`: Contains all React components (Dashboard, CVBuilder, Jobs, Auth, etc.)
*   `/src/services`: Handles external API calls and Supabase interactions (`cvService.ts`, `jobService.ts`, `userService.ts`, etc.)
*   `/src/types`: TypeScript interface definitions for strong typing across the app.
*   `/src/lib`: Utility functions (e.g., date formatting, currency formatting).
*   `/public`: Static assets like the `favicon.svg`.

## 🔒 Security & Privacy

VisaMate is designed with privacy in mind. Authentication is handled securely via Supabase Auth. User data, including CVs and documents, are stored securely in PostgreSQL and Supabase Storage with strict Row Level Security (RLS) rules ensuring users can only access their own data.

## 🚀 Deployment to Vercel

Before your next git push to Vercel, ensure the following Supabase setup steps are completed:

1. **Environment Variables:** Add your Supabase `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` if migrating to Next.js) to your Vercel project's environment variables. Ensure these are correctly configured for your deployment environment (e.g., Production, Preview).
2. **Database Migrations:** If you've made schema changes (like the RLS policies discussed), ensure they are applied to your production Supabase database. You might need to run the SQL scripts directly in your Supabase project's SQL Editor or use the Supabase CLI migration tool compatible with your Vercel deployment workflow.
3. **Storage Bucket Configuration:** Verify that the `documents` storage bucket (and any other necessary buckets) exists in your production Supabase project and that the necessary Row Level Security (RLS) policies are active.
4. **Client-Side Initialization:** Ensure your frontend application correctly initializes the Supabase client using the environment variables (configured in `src/supabase.ts`).

## 📝 License

This project is created for demonstration and educational purposes.
