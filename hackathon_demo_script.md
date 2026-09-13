# Cadence Hackathon Demo Script
**Total Time:** 3:00 Minutes  
**Goal:** Prove Cadence is a fully-integrated, highly polished AI agent for Accounts Receivable.

---

### Part 1: The Hook & Problem (0:00 - 1:30)
*(Note: Do this with slides or just talking directly to the camera/judges)*

* **0:00 - 0:30 (The Problem):** "B2B service businesses lose millions every year because they sign contracts with terrible payment terms embedded in the fine print, and then spend hours manually chasing down invoices. It's a massive coordination problem between sales, legal, and accounting."
* **0:30 - 1:00 (The Solution):** "Meet Cadence. Cadence isn't just a dashboard—it's an autonomous Accounts Receivable co-pilot. It ingests your contracts, finds the risky terms, tracks your invoices, and integrates directly with Gmail to chase down payments on autopilot."
* **1:00 - 1:30 (The Tech Stack Flex):** "We built this using React, Vite, and Tailwind, deployed on Vercel. Our backend relies on Supabase Edge Functions processing raw data through Nvidia NIM's Llama 3 70B model, hooking directly into the Gmail API."

---

### Part 2: The Live Product Demo (1:30 - 3:00)
*(Switch screen share to the live Cadence application)*

**1:30 - 1:45 | The Dashboard & Accessibility**
* *Action:* Show the main Dashboard with populated charts. 
* *Talk Track:* "Here is the Cadence command center. We built this with extreme polish and accessibility in mind. Notice the instant multi-theme switcher—I can toggle from Light to Dark to our custom 'Parchment' theme for reading legal documents."
* *Action:* Toggle the theme switcher in the top right. Hit `Cmd+K` to open the search menu.
* *Talk Track:* "We also built power-user keyboard shortcuts. Hitting `Cmd+K` lets me instantly navigate across my entire workspace."

**1:45 - 2:05 | Real-time UX & Contract Ingestion**
* *Action:* Use the `Cmd+K` menu to go to "Create Client". Create a new client (e.g., "Acme Corp"). 
* *Talk Track:* "Let's onboard a new client. Because our frontend state is completely reactive, Acme Corp appears in our sidebar instantly without a page reload."
* *Action:* Click on Acme Corp. Upload a massive Master Service Agreement PDF.
* *Talk Track:* "Now we drop in their Master Service Agreement. We engineered our ingestion pipeline to handle up to 25,000 characters, feeding it directly into Nvidia NIM."

**2:05 - 2:30 | The "Aha!" Moment (AI Analysis)**
* *Action:* The AI finishes analyzing. Show the extracted "High Risk Terms" (e.g., Net-90 payment terms).
* *Talk Track:* "Instantly, Llama 3 parses the legalese and flags a massive risk: Acme snuck a Net-90 payment term into the fine print. Instead of finding out 3 months from now, Cadence alerts us immediately."

**2:30 - 2:55 | The Autopilot Integration (Gmail)**
* *Action:* Navigate to the "Tones & Outreach" or "Invoices" tab. Show an AI-generated email draft.
* *Talk Track:* "But Cadence doesn't just warn us, it takes action. Because we are integrated with the Gmail API, Cadence automatically drafts an email to Acme Corp addressing the invoice discrepancy. We use a 'Process-Blaming' psychological tone so the AI blames the accounting software, preserving your personal relationship with the client."
* *Action:* Click 'Send' or show the terminal integration / confetti pop.
* *Talk Track:* "One click, and the email is dispatched."

**2:55 - 3:00 | The Closer**
* *Talk Track:* "Cadence secures your cash flow before the work even begins. Thank you."
