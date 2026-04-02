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
*   **Backend/BaaS**: Firebase (Authentication, Firestore, Storage)
*   **AI Integration**: Google Gemini API (`@google/genai`)
*   **PDF Generation**: `jspdf`, `html2canvas`
*   **Routing**: React Router DOM

## 🚀 Getting Started

### Prerequisites

*   Node.js (v18 or higher)
*   npm or yarn
*   A Firebase project with Authentication and Firestore enabled
*   A Google Gemini API Key

### Environment Variables

Create a `.env` file in the root directory and add your Gemini API key:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

Ensure you also have your `firebase-applet-config.json` configured in the root directory for Firebase initialization.

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
*   `/src/services`: Handles external API calls and Firebase interactions (`cvService.ts`, `jobService.ts`, `userService.ts`, etc.)
*   `/src/types`: TypeScript interface definitions for strong typing across the app.
*   `/src/lib`: Utility functions (e.g., date formatting, currency formatting).
*   `/public`: Static assets like the `favicon.svg`.

## 🔒 Security & Privacy

VisaMate is designed with privacy in mind. Authentication is handled securely via Firebase Auth. User data, including CVs and documents, are stored securely in Firestore with strict security rules ensuring users can only access their own data.

## 📝 License

This project is created for demonstration and educational purposes.
