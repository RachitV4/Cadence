# Cadence

### AI-Powered Commercial Intelligence for Accounts Receivable

> **We don't just chase overdue invoices. We understand why they haven't been paid — and help decide what should happen next.**

---

## 🛑 The Problem

In B2B services, getting paid isn't always as simple as sending another reminder.

When an invoice is 30 days late, the important question is often **why**.

- Is the client disputing a deliverable based on the contract?
- Did they promise to pay last Friday and miss the commitment?
- What does the agreement actually allow you to do?
- Is a late fee applicable?
- Should the next message be friendly, firm, or escalated?

The information needed to make that decision is fragmented across **contracts, invoices, emails, payment commitments, and client history**.

Generic automated reminders ignore this context. Manually reconstructing it takes time.

---

## ✨ The Solution

**Cadence brings contracts, invoices, client communication, and collection intelligence into one Accounts Receivable workflow.**

Instead of treating an overdue invoice as an isolated number, Cadence builds context around it.

It extracts commercial terms from contracts, connects them to invoices, analyzes payment behavior and communication history, tracks payment promises, identifies risks, recommends actions, and generates context-aware collection emails.

> **From overdue invoice → commercial context → informed action.**

---

## 🚀 Core Features

### 📄 Contract Intelligence

Upload contracts, MSAs, and SOWs. Cadence extracts important commercial terms including payment terms, late fees, contract value, renewal conditions, termination rights, liability, intellectual property, and confidentiality.

Extracted findings remain connected to the source document, allowing users to inspect the relevant page rather than relying only on an AI summary.

### 🧾 Invoice Intelligence

Cadence analyzes invoices alongside their commercial context, including outstanding balance, due date, overdue duration, related contract, payment history, promises, and risk indicators.

This allows Cadence to understand not simply **that an invoice is overdue, but what should happen next**.

### 🧠 AI Collection Advice

Cadence evaluates available contract, invoice, client, and communication context to recommend the next collection action.

Instead of applying the same escalation rule to every invoice, recommendations can account for contract rights, payment behavior, previous promises, outstanding amounts, and recent client responses.

### 💬 AI Inbox & Email Generation

Cadence uses invoice details, contract terms, Gmail communication, payment promises, client history, and risk signals to generate context-aware collection emails.

Users remain in control and can review or modify messages before sending.

### 🎛️ 0–100 Dynamic Tone Control

Rather than limiting users to labels such as "friendly" or "strict," Cadence provides a continuous **0–100 tone control**:

**0 — Humble • 25 — Casual/Friendly • 50 — Formal • 75 — Strict • 100 — Strict/Formal**

Cadence recommends an initial tone based on the situation, while users can override it and regenerate the message without losing important commercial facts.

### 🤝 Payment Promise Tracking

Promises such as *"We'll pay by Friday"* become structured collection context instead of disappearing inside email threads.

Cadence can identify missed commitments and use them when determining risk, recommended actions, alerts, and communication tone.

### 🚨 Smart Alerts & Risk Signals

Cadence surfaces events requiring attention, including overdue invoices, broken payment promises, increasing client risk, important contract constraints, and communication requiring follow-up.

### 🔎 Interactive Document Analysis

Users can navigate uploaded PDFs, review extracted findings, inspect source text, and move from a finding directly to its relevant source page—making AI-assisted extraction easier to verify.

### 📊 Dashboard & Activity

Cadence provides a consolidated view of outstanding invoices, client risk, alerts, recent activity, payment commitments, drafts, and recommended actions, supported by filtering, sorting, responsive layouts, and clear loading and error states.

---

## 🏗 Architecture & Tech Stack

### Frontend

- **React 18 + Vite** — Application framework
- **TypeScript** — Type-safe application logic
- **Tailwind CSS** — Responsive styling
- **Framer Motion** — UI interactions and transitions
- **Recharts** — Dashboard visualizations

### Backend & Infrastructure

- **Supabase PostgreSQL** — Relational application data
- **Supabase Realtime** — Live application updates
- **Supabase Storage** — Document storage
- **Supabase Edge Functions (Deno)** — Server-side processing and integrations

### AI & Integrations

- **NVIDIA NIM** — AI-powered extraction, reasoning, collection advice, and email generation
- **Gmail** — Client communication and reply context
- **PDF Processing** — Contract and invoice intelligence

---

## 🔄 How Cadence Works

1. **Add a client** and relevant commercial context.
2. **Upload a contract** — Cadence extracts important terms.
3. **Upload invoices** and connect them to the client and contract.
4. **Analyze the situation** using overdue status, contract terms, communication, promises, and risk.
5. **Receive a recommended action** and AI-recommended communication tone.
6. **Generate and review an email** before sending.
7. **Track replies, promises, alerts, and activity** as context for the next decision.

---

## 🚦 Getting Started

### Prerequisites

- Node.js 18+
- Supabase project
- NVIDIA NIM API credentials
- Gmail configuration for email functionality

### 1. Clone and install

```bash
git clone https://github.com/RachitV4/Cadence.git
cd Cadence
npm install
```

### 2. Configure environment variables

Create the required local environment file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Store NVIDIA NIM credentials and other sensitive server-side configuration securely as Supabase Edge Function secrets rather than exposing them to the frontend.

### 3. Run Cadence

```bash
npm run dev
```

---

## 👥 The Team

Built during the hackathon by:

- **Rachit** — Business Model, Target Customer & Value Proposition
- **Surya** — Technical Feasibility, Architecture & AI Implementation
- **Nisanth** — Market Validation & User Research
- **Rishaan** — Competitive Analysis & Feature Logic

---

**Cadence — Commercial context for every collection decision.**
