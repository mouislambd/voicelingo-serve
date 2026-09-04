# VoiceLingo — Backend Server

Voice-based English Language Learning Platform — backend API.

## Tech Stack
- Express + TypeScript
- MongoDB (Mongoose)
- Better Auth (Bearer token + Google OAuth)
- Groq (Llama models) — conversation AI, feedback, and scoring
- Google Gemini API — image-to-topic generation
- Deployed on Render

## Features
- Authentication (email/password + Google OAuth, with cross-domain cookie handling via Next.js proxy on the frontend)
- Practice session management: start, message, end, history, delete
- AI-generated grammar/pronunciation feedback per message
- Session scoring and summary generation
- Adaptive Practice recommendation endpoint (analyzes user's weak areas to suggest a next topic)
- Custom topic session creation (from user-typed or spoken text)
- Public rate-limited demo feedback endpoint (no auth required)
- 30-day TTL auto-delete on PracticeSession documents (confirmed active via MongoDB index)

## Environment Variables
PORT, NODE_ENV, MONGODB_URI, BETTER_AUTH_SECRET, BETTER_AUTH_URL, CLIENT_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GROQ_API_KEY, GEMINI_API_KEY

## Notable Fixes
- Google OAuth state_mismatch resolved via frontend proxy + baseURL pointing to frontend domain
- Groq model deprecation fixed (updated hardcoded model names)
- Double "/api/api" route prefix bug fixed
