# [Cadence] — AI Commercial Relationship Agent

**Contract-aware payment enforcement for micro-agencies.**

When a client goes late on payment, we don't just send a generic reminder. We understand the contract, read the emails, and decide what should actually happen next.

---

## The Problem

Micro-agencies juggle multiple clients, each with their own contracts and payment terms. When payment is late:
- The founder/ops person can't remember what the contract actually said
- They don't have context from recent emails (is there a dispute? a deliverable issue?)
- They end up either sending an aggressive email that damages a valuable relationship, or awkwardly chasing money they've already earned

Today that's a manual, context-free process. We made it intelligent.

---

## The Solution

**[App Name]** reads your contracts, remembers every payment term, monitors client emails, tracks payment promises, and recommends the right action when a payment is late—*not* just a generic reminder, but a context-aware decision based on the full relationship history.

**Key insight:** payment enforcement shouldn't be blind. Before you escalate, the system checks:
- Is there an open dispute? (don't escalate)
- Is payment blocked by a deliverable? (resolve that first)
- Did the client promise to pay? (track that promise)
- Is this client important to you? (soften your tone)

---

## How It Works (High Level)

```
Contract + Invoice + Emails + Payment History
          ↓
    Client Memory
          ↓
   AI Context Analysis
          ↓
 "Why hasn't this client paid?"
          ↓
  Risk + Recommended Action
          ↓
Generate appropriate email
          ↓
  Human approves
          ↓
Memory updated
```

---

## MVP Architecture

The MVP focuses on one core loop: **Contract → Memory → Reason → Action → Email**.

### What's Included

- ✅ **Contract upload & parsing** — extract payment terms, milestones, deliverables
- ✅ **Invoice upload** — due-date detection, amount recognition
- ✅ **Client commercial memory** — persistent profile across contracts, invoices, emails, promises
- ✅ **Email analysis** — detect disputes, promises, sentiment, delays
- ✅ **Payment promise tracking** — extract and monitor promised payment dates
- ✅ **AI reasoning** — understand why payment is delayed
- ✅ **Recommended actions** — gentle reminder vs. clarification vs. escalation vs. do-nothing
- ✅ **Context-aware email generation** — draft a message based on the full relationship history
- ✅ **Human approval** — user reviews before sending
- ✅ **Simple dashboard** — see clients, invoices, risks, recommended actions

### What's *Not* Included (Planned Future)

- ❌ Live Stripe/QuickBooks integration (payment status is manually tracked for MVP)
- ❌ Multi-seat / team access (single user for MVP)
- ❌ Slack integration
- ❌ Advanced risk-scoring
- ❌ Scope-creep detection
- ❌ Revenue-leakage analysis

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Next.js + TypeScript + Tailwind CSS | Fast iteration, type-safe, styled quickly |
| **Backend** | Python + FastAPI | Strong LLM/AI support, lightweight |
| **Database** | PostgreSQL | Structured client/contract/invoice data |
| **AI** | Claude API (or GPT-4o) | Extraction, classification, reasoning, email generation |
| **Email** | Canned demo data (no live Gmail for MVP) | Fast, controllable, low risk |
| **Deployment** | Vercel (frontend) + Railway/Render (backend) | Managed, scalable, free tier sufficient |

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (frontend)
- **Python** 3.11+ (backend)
- **PostgreSQL** 14+ (database)
- **API key** for Claude (or GPT-4o)
- **Git** (version control)

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/[app-name].git
cd [app-name]
```

### 2. Set up the database

```bash
# Create a PostgreSQL database
createdb [app-name]_dev

# Run migrations (once we have them)
psql [app-name]_dev < migrations/init.sql
```

### 3. Set up the backend

```bash
cd backend

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # on Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create a .env file
cat > .env << EOF
DATABASE_URL=postgresql://user:password@localhost/[app-name]_dev
CLAUDE_API_KEY=your-claude-api-key-here
ENVIRONMENT=development
EOF

# Run the API
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`.

### 4. Set up the frontend

```bash
cd frontend

# Install dependencies
npm install

# Create a .env.local file
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF

# Run the development server
npm run dev
```

The frontend will be available at `http://localhost:3000`.

### 5. Run the demo

1. Visit `http://localhost:3000` in your browser
2. Log in (demo auth — any email/password works)
3. Upload a sample contract (included in `/demo-data/contracts/`)
4. Upload a sample invoice
5. Read the AI's analysis
6. See the recommended action
7. View the AI-generated email

---

## Project Structure

```
[app-name]/
├── backend/
│   ├── main.py                 # FastAPI entry point
│   ├── routes/
│   │   ├── contracts.py        # Contract upload, parsing
│   │   ├── invoices.py         # Invoice upload, extraction
│   │   ├── clients.py          # Client profiles, memory
│   │   ├── emails.py           # Email ingestion, analysis
│   │   └── recommendations.py  # AI reasoning, actions
│   ├── models/
│   │   ├── database.py         # SQLAlchemy ORM models
│   │   ├── schemas.py          # Pydantic schemas
│   │   └── types.py            # TypeScript-style hints
│   ├── services/
│   │   ├── ai_service.py       # LLM calls, prompts
│   │   ├── extraction_service.py # Contract/invoice parsing
│   │   ├── memory_service.py    # Client memory management
│   │   └── recommendation_service.py # Decision logic
│   ├── migrations/
│   │   └── init.sql            # Initial schema
│   ├── requirements.txt         # Python dependencies
│   └── .env.example            # Environment template
├── frontend/
│   ├── pages/
│   │   ├── index.tsx           # Home/dashboard
│   │   ├── login.tsx           # Auth
│   │   ├── client/[id].tsx     # Client profile
│   │   ├── contracts.tsx       # Upload contracts
│   │   └── invoices.tsx        # Upload invoices
│   ├── components/
│   │   ├── ContractUpload.tsx
│   │   ├── InvoiceUpload.tsx
│   │   ├── ClientMemory.tsx
│   │   ├── EmailAnalysis.tsx
│   │   ├── RecommendationCard.tsx
│   │   └── EmailPreview.tsx
│   ├── hooks/
│   │   └── useApi.ts           # API call wrapper
│   ├── styles/
│   │   └── globals.css         # Tailwind setup
│   ├── package.json
│   ├── next.config.js
│   └── .env.local.example
├── demo-data/
│   ├── contracts/
│   │   └── sample-contract.pdf
│   ├── invoices/
│   │   └── sample-invoice.pdf
│   └── emails/
│       └── sample-conversation.json
├── docs/
│   ├── ARCHITECTURE.md         # Deep dive into the design
│   ├── API.md                  # API endpoint reference
│   └── DEMO.md                 # Step-by-step demo flow
├── .gitignore
├── docker-compose.yml          # (Optional) containerization
└── README.md                   # ← You are here
```

---

## Key Concepts

### Client Commercial Memory

Each client has a persistent profile that connects:
- **Contract terms** — payment schedule, late-fee %, milestones, deliverables
- **Invoice history** — outstanding, paid, overdue
- **Email conversations** — promises, disputes, sentiment
- **Payment behavior** — average days to pay, missed promises
- **Current risk** — flags for unresolved issues

Example:

```json
{
  "client_id": "acme-corp",
  "name": "Acme Corporation",
  "contract": {
    "payment_terms": "Net 30",
    "value": 72000,
    "milestones": 4,
    "late_fee": "5%"
  },
  "invoices": [
    {
      "number": "INV-1042",
      "amount": 12000,
      "due_date": "2024-08-15",
      "status": "overdue",
      "days_overdue": 24
    }
  ],
  "promises": [
    {
      "promise": "We'll pay next Friday",
      "promised_date": "2024-08-30",
      "missed": true,
      "extracted_from": "email_2024_08_27"
    }
  ],
  "risk_flags": [
    "payment_overdue",
    "promise_missed",
    "open_dispute"
  ]
}
```

### AI Reasoning

When an invoice is overdue, the system:

1. **Extracts context** from the contract, past invoices, and recent emails
2. **Identifies the likely reason** — administrative delay, cash-flow issue, deliverable dispute, client dissatisfaction, etc.
3. **Checks for relationship risks** — is there an open issue that makes escalation dangerous?
4. **Recommends an action** — gentle reminder, clarification, relationship-focused follow-up, firm reminder, escalation, or no action
5. **Generates an email** that matches the recommendation, tone, and client history

Example logic:

```
IF invoice_overdue AND recent_email_mentions_dispute THEN
  reason = "deliverable_dispute"
  risk = "HIGH" (escalating may damage relationship)
  recommendation = "resolve_deliverable_first"
  tone = "collaborative"
ELSE IF invoice_overdue AND payment_promise_exists THEN
  reason = "missed_promise"
  risk = "MEDIUM"
  recommendation = "firm_follow_up"
  tone = "professional"
ELSE IF invoice_overdue AND client_important THEN
  reason = "unknown_delay"
  risk = "MEDIUM"
  recommendation = "gentle_reminder"
  tone = "relationship_focused"
```

### Payment Promise Tracking

If a client says "we'll pay next Friday," the AI:

1. **Extracts** the promised date and invoice number
2. **Stores** it in the client's memory with status `pending`
3. **Monitors** the date automatically
4. **Alerts** when the promise is missed
5. **Recommends escalation** with evidence of the broken promise

---

## API Endpoints (Backend)

### Contracts

```
POST   /api/contracts/upload      # Upload a contract PDF
GET    /api/contracts/:id         # Get parsed contract
GET    /api/contracts             # List client's contracts
DELETE /api/contracts/:id         # Delete a contract
```

### Invoices

```
POST   /api/invoices/upload       # Upload an invoice PDF
GET    /api/invoices/:id          # Get invoice details
GET    /api/invoices              # List client's invoices
PATCH  /api/invoices/:id/status   # Update invoice status (paid/pending/overdue)
```

### Clients

```
GET    /api/clients               # List all clients
GET    /api/clients/:id           # Get client profile + memory
POST   /api/clients               # Create a client
PATCH  /api/clients/:id           # Update client info
```

### Emails

```
POST   /api/emails/ingest         # Add email to analysis
GET    /api/emails                # List client emails
GET    /api/emails/:id            # Get email + analysis
```

### Recommendations

```
GET    /api/recommendations/:client_id  # Get recommended action
GET    /api/recommendations               # List all recommendations
```

### AI Actions

```
POST   /api/ai/analyze_client    # Get AI analysis of a client
POST   /api/ai/draft_email       # Generate context-aware email
POST   /api/ai/extract_promise   # Extract payment promise from email
```

Full API docs: see `docs/API.md`

---

## Demo Flow (5 Minutes)

This is the exact story shown in the video:

### Act 1 — Contract Decoded (1:30)

1. **Upload** → A contract PDF for "Acme Corporation"
2. **Extract** → System identifies: Net 30 terms, $72k value, 4 milestones, 5% late fee
3. **Memory** → Acme's profile is created with all terms

**The moment:** A scary 20-page contract becomes a clean, readable summary in seconds.

### Act 2 — Intelligent Decision (3:00)

1. **Timeline jump** → "Three months later"
2. **Invoice overdue** → Invoice $12k is 24 days late
3. **Email context** → System reads recent emails and finds: Acme is disputing a deliverable
4. **AI analysis** → "Payment is blocked by a deliverable dispute. The contract ties payment to milestone acceptance. Don't escalate now."
5. **Email draft** → System generates: *"We noticed you have a question about the dashboard—let's resolve that first, then we can finalize payment."*

**The moment:** The AI stops you from sending a relationship-damaging email and recommends the right thing instead.

### Close (0:30)

- Show the AI's reasoning (transparent flags + evidence)
- Mention the Pro tier + future Enterprise features
- Restate the spine: *"We don't just chase the money. We understand why it hasn't arrived and decide what should happen next."*

---

## Running the Demo

The demo uses **canned data** (pre-loaded contracts and emails), not live Gmail, for speed and reproducibility.

### Demo Mode

```bash
# In backend/.env
DEMO_MODE=true
```

When demo mode is on:
- Sample contracts and invoices are pre-loaded
- Email data comes from `/demo-data/emails/`
- No live Gmail API required
- Payment status is manually triggered

### Demo Script

See `docs/DEMO.md` for the exact script, timing, and click flow.

---

## Development

### Adding a Feature

1. **Decide the layer:** is this data ingestion (upload), extraction (parsing), memory (storage), or reasoning (AI)?
2. **Add the database table** if needed (update `migrations/init.sql` and backend ORM models)
3. **Write the API endpoint** in the relevant `routes/` file
4. **Write the AI prompt** in `services/ai_service.py` if reasoning is involved
5. **Add the frontend component** in `components/` and wire it into a page
6. **Test locally** with sample data from `demo-data/`

### Testing

```bash
# Backend
cd backend
python -m pytest tests/

# Frontend
cd frontend
npm test
```

### Environment Variables

**Backend** (`.env`):
```
DATABASE_URL=postgresql://...
CLAUDE_API_KEY=sk-...
ENVIRONMENT=development|production
DEMO_MODE=true|false
```

**Frontend** (`.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Deployment

### Frontend (Vercel)

```bash
cd frontend
vercel deploy
```

### Backend (Railway / Render)

```bash
cd backend
# Push to a git repo that Railway/Render is connected to
git push origin main
```

### Database

Use a managed PostgreSQL provider (Supabase, Railway, Heroku, AWS RDS).

---

## Known Limitations (MVP)

- ⚠️ **No live Gmail integration.** We use canned email data for the MVP. Live Gmail/OAuth can be added later.
- ⚠️ **No real payment data.** Invoice status (paid/overdue) is manually tracked or simulated. Stripe integration is future.
- ⚠️ **Single user only.** No multi-seat / team features in MVP. Will be added in Enterprise tier.
- ⚠️ **AI reasoning is deterministic.** The decision logic follows explicit rules + LLM prompts, not a trained model. Keeps it interpretable and fast.
- ⚠️ **Limited to contracts/invoices/emails.** No CRM integration, project management data, or other business systems (future architecture).

---

## Roadmap

### Phase 1 (MVP / This Hackathon)
- ✅ Contract upload + parsing
- ✅ Invoice recognition
- ✅ Client memory
- ✅ Email analysis
- ✅ Payment promise tracking
- ✅ AI recommendations
- ✅ Email generation
- ✅ Simple dashboard

### Phase 2 (Next)
- 🔄 Live Gmail integration
- 🔄 Multi-seat access
- 🔄 Risk scoring dashboard
- 🔄 Scope-creep detection
- 🔄 Revenue-leakage alerts
- 🔄 Stripe integration

### Phase 3 (Long-term)
- 🔄 QuickBooks / Xero sync
- 🔄 CRM integration (HubSpot, Salesforce)
- 🔄 Slack integration
- 🔄 Custom AI-driven workflows
- 🔄 Full commercial operations platform

---

## Contributing

This is a hackathon project, but if you want to contribute:

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'Add feature'`
4. Push: `git push origin feature/your-feature`
5. Open a pull request

---

## License

MIT License. See `LICENSE` for details.

---

## Team

- **Rachit** — Business Model, Target Customer, Value Proposition
- **Surya** — Technical Feasibility, Architecture, AI Implementation
- **Nisanth** — Market Validation, User Research
- **Rishaan** — Competitive Analysis

---

## Questions?

- **Technical issues:** Open a GitHub issue or check `docs/ARCHITECTURE.md`
- **Product questions:** See `docs/README.md` or the main pitch deck
- **Demo details:** See `docs/DEMO.md`

---

## One-Liner

**We don't just chase overdue invoices. We understand why they haven't been paid and decide what should actually happen next.**

Good luck with the hackathon. 🚀
