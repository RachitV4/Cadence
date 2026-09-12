# Cadence: AI-Powered Accounts Receivable & Contract Analytics

Cadence is an advanced, AI-driven platform for commercial intelligence. It leverages multi-agent workflows, interactive document visualization, and edge function analysis to prevent revenue from getting stuck in complex contracts. 

## Features
- **Intelligent Contract Parsing**: Upload MSAs and SOWs. The AI agents will automatically process the PDFs to detect payment terms, late fees, and critical legal clauses using Nvidia NIM.
- **Smart Accounts Receivable**: Track overdue invoices and evaluate risk dynamically.
- **Multi-Agent Negotiation**: A built-in multi-agent AI system analyzes email threads, cross-references with contract terms, and generates perfectly toned drafts to negotiate payment.
- **Real-Time Synchronization**: Fully synced dashboards via Supabase real-time channels for new clients and toast notifications.
- **Confetti & Delightful UX**: Beautiful Framer Motion animations, interactive blur overlays, and instant visual feedback on actions like sending emails.

## Architecture
- **Frontend**: React + Vite, Tailwind CSS, Framer Motion, Recharts, Lucide Icons.
- **Backend & Database**: Supabase (Postgres, Storage, Realtime, Edge Functions).
- **AI Processing**: Deno-based Edge Functions calling Nvidia NIM models.

## Environment Variables
Requires \VITE_SUPABASE_URL\, \VITE_SUPABASE_ANON_KEY\ on the frontend, and \NIM_API_KEY\ / \NIM_API_URL\ securely deployed to Supabase Edge Functions.

## Setup
1. \
pm install\
2. \
pm run dev\

