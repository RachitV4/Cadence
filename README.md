  ─────Cadence
  AI-Powered Commercial Intelligence & Autonomous Accounts Receivable

    We don't just chase overdue invoices. We understand why they haven't been paid, and decide what should happen next.
      
    The Problem •
    The Solution •
    Features •
    Tech Stack •
    Getting Started──────
  ## 🛑 The Problem

  In B2B services, getting paid isn't as simple as sending a Stripe link. When a $50,000 invoice is 30 days late, it's
  rarely because the client "forgot."

  • Are they disputing a deliverable based on a clause in the MSA?
  • Did they promise to pay "next Friday" in an email thread three weeks ago?
  • Is the late fee penalty actually enforceable based on the signed SOW?

  Sending an aggressive, automated "PAY NOW" email destroys client relationships. But manually cross-referencing
  contracts, emails, and invoices takes hours.

  ## ✨ The Solution: Cadence
  Cadence is an intelligent platform that sits at the intersection of your Contracts, your Invoices, and your Inbox.

  Using a multi-agent AI architecture powered by NVIDIA NIM (Llama 3 70B), Cadence automatically extracts legal
  constraints from heavy PDFs, reads the latest context from your email threads, and generates highly-tuned,
  relationship-preserving emails to negotiate payments safely.
  ──────
  ## 🚀 Core Features

  ### 📄 Intelligent Contract Parsing (Edge AI)

  Upload massive, dense 20-page Master Services Agreements (MSAs) or SOWs. Cadence dynamically chunks the document,
  extracting up to 25,000 characters per pass. It instantly identifies Payment Terms, Late Fee constraints, IP
  ownership, and hidden termination risks—highlighting them directly on the PDF.

  ### 🧠 Multi-Agent Negotiation & Thread Context

  Cadence doesn't write blind emails. When drafting a payment reminder, our Edge Functions scrape the client's recent
  Gmail replies. The AI acts as a multi-agent negotiator, analyzing the specific context of their last email and
  dynamically drafting a counter-proposal that directly addresses their concerns without violating the contract.
  ### 🎛️ 0-100 Emotional Tone Simulator
  Instead of generic "casual" or "strict" settings, Cadence features a dynamic 0-100 toneLevel slider. Dial in the
  exact level of empathy or aggression required for the situation. The slider values are injected directly into the
  LLM system prompt to instantly rewrite the email's emotional weight.

  ### 🚨 Smart Alerts & High-Risk Detection
  Cadence monitors "Payment Promises" (e.g., "We will pay next Friday"). If a promise is broken, or if late fees hit a
  critical threshold, the UI triggers a pulsing High-Risk anomaly alert, warning you to shift from a collaborative
  tone to a protective legal tone.

  ### ⚡ Real-Time, Premium UI
  Built for speed and aesthetic perfection.

  • Live Syncing: Powered by Supabase Realtime Postgres subscriptions—when a client is added or an analysis finishes
  in the background, the UI updates instantly without a refresh.
  • Command Palette: Press Cmd+K anywhere to instantly search clients or jump to invoices.
  • Premium B2B Design: A beautiful Deep Navy and Electric Lavender dark-mode interface, smoothed by Framer Motion
  animations and delightful interactive overlays.
  ──────
  ## 🏗 Architecture & Tech Stack

  Frontend:

  • React 18 & Vite: Lightning-fast HMR and optimized builds.
  • Tailwind CSS & Framer Motion: For a premium, fluid dark-mode UI.
  • Recharts: For dynamic Cash Flow and Risk visualizations.
  Backend & Infrastructure:

  • Supabase (PostgreSQL): Relational database with Row Level Security.
  • Supabase Realtime: WebSocket-based live UI updates and toast notifications.
  • Supabase Storage: Secure PDF contract storage.

  AI & Processing:
  • Supabase Edge Functions (Deno): Serverless architecture for background processing, contract extraction, and Gmail
  scraping.
  • NVIDIA NIM (Llama 3 70B Instruct): Powering the complex multi-agent extraction and negotiation logic with blazing
  fast inference.
  ──────
  ## 🚦 Getting Started
  ### Prerequisites
  • Node.js (v18+)
  • A Supabase project
  • An NVIDIA NIM API Key

  ### Local Setup
  1. Clone the repository
    git clone https://github.com/RachitV4/Cadence.git
    cd cadence-main

  2. Install dependencies
    npm install

  3. Environment Variables
  Create a .env file in the root directory:
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
  Note: Ensure your NIM_API_KEY and NIM_API_URL are securely added to your Supabase Edge Function secrets.
  4. Run the development server
    npm run dev

  ──────
  ## 👥 The Team

  Built with ❤️ during the hackathon by:

  • Rachit — Business Model, Target Customer, Value Proposition
  • Surya — Technical Feasibility, Architecture, AI Implementation
  • Nisanth — Market Validation, User Research
  • Rishaan — Competitive Analysis & Feature Logic***
