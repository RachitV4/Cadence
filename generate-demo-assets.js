import fs from 'fs';
import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDir = path.join(__dirname, 'demo-assets');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir);
}

function createPdf(filename, title, content) {
  const doc = new PDFDocument({ margin: 50 });
  const outPath = path.join(outDir, filename);
  doc.pipe(fs.createWriteStream(outPath));
  
  doc.fontSize(20).text(title, { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(12).text(content, { align: 'left', lineGap: 6 });
  
  doc.end();
  console.log(`Generated: ${outPath}`);
}

const msaContent = `MASTER SERVICES AGREEMENT

This Master Services Agreement ("MSA") is entered into by and between Cadence ("Provider") and Omega Logistics ("Client") as of January 1, 2026.

1. SERVICES
Provider agrees to perform services as defined in individual Statements of Work (SOWs) executed by both parties. This MSA governs all subsequent SOWs.

2. PAYMENT TERMS
Client shall pay all undisputed invoices within Net 60 days of the invoice date. All payments must be made in USD.

3. LATE FEES
In the event that Client fails to pay any invoice within the Net 60 period, a late fee penalty of 2.5% per month will be applied to the outstanding balance. 

4. TERMINATION
Either party may terminate this agreement with 30 days written notice. In the event of termination, Client is responsible for all work performed up to the termination date.

IN WITNESS WHEREOF, the parties have executed this MSA.

Omega Logistics: [Signed: CEO]
Date: January 1, 2026`;

createPdf('Omega_Logistics_MSA.pdf', 'MASTER SERVICES AGREEMENT', msaContent);


const sow1Content = `STATEMENT OF WORK #1: Phase 1 Onboarding

This Statement of Work (SOW) is governed by the Master Services Agreement (MSA) dated January 1, 2026.

1. SCOPE OF WORK
Provider will configure and deploy the initial software logistics tracking module for Omega Logistics.

2. TIMELINE
Start Date: February 1, 2026
Completion Date: March 31, 2026

3. BUDGET
The total approved budget for Phase 1 is $35,000.00 USD. This is a fixed-fee engagement.

4. DELIVERABLES
- Logistics Tracking Module implementation.
- User training sessions (2).
- System architecture documentation.

Omega Logistics: [Signed: VP Engineering]
Date: January 15, 2026`;

createPdf('Omega_Logistics_SOW_Phase1.pdf', 'STATEMENT OF WORK #1', sow1Content);


const sow2Content = `STATEMENT OF WORK #2: Phase 2 Automation Expansion

This Statement of Work (SOW) is governed by the Master Services Agreement (MSA) dated January 1, 2026.

1. SCOPE OF WORK
Provider will integrate AI-driven routing optimization into the existing logistics tracking module.

2. TIMELINE
Start Date: April 1, 2026
Completion Date: June 30, 2026

3. BUDGET
The total approved budget for Phase 2 is $50,000.00 USD. This is a fixed-fee engagement. Any overages must be pre-approved in writing.

4. DELIVERABLES
- AI Routing algorithm integration.
- Dashboard analytics deployment.

Omega Logistics: [Signed: VP Engineering]
Date: March 15, 2026`;

createPdf('Omega_Logistics_SOW_Phase2.pdf', 'STATEMENT OF WORK #2', sow2Content);

const invoiceContent = `INVOICE #INV-2026-004

From: Cadence
To: Omega Logistics
Date: July 1, 2026
Due Date: July 15, 2026 (Net 14)

DESCRIPTION:
Phase 2 Automation Expansion - Final Deliverables

AMOUNT DUE:
$65,000.00 USD

Please remit payment within 14 days to avoid disruptions.`;

createPdf('Omega_Logistics_Invoice_65k.pdf', 'INVOICE', invoiceContent);
