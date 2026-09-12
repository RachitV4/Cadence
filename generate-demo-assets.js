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

const msa1Content = `MASTER SERVICES AGREEMENT

This Master Services Agreement ("MSA") is entered into by and between Cadence ("Provider") and Apex Software Systems ("Client") as of January 1, 2026.

1. SERVICES
Provider agrees to perform enterprise software development and consulting services as defined in individual Statements of Work (SOWs) executed by both parties. This MSA governs all subsequent SOWs and supersedes all prior agreements.

2. PAYMENT TERMS
Client shall pay all undisputed invoices within Net 30 days of the invoice date. All payments must be made in USD via wire transfer. Invoices will be issued monthly based on milestones achieved.

3. LATE FEES AND PENALTIES
In the event that Client fails to pay any invoice within the Net 30 period, a late fee penalty of 2.0% per month will be applied to the outstanding balance. Provider reserves the right to suspend services if payment is overdue by more than 15 days past the grace period.

4. INTELLECTUAL PROPERTY
Upon full payment of all undisputed fees, Provider grants Client a perpetual, non-exclusive license to use the developed software.

IN WITNESS WHEREOF, the parties have executed this MSA.

Apex Software Systems: [Signed: CEO]
Date: January 1, 2026`;

createPdf('Apex_Software_Systems_MSA.pdf', 'MASTER SERVICES AGREEMENT', msa1Content);

const invoice1Content = `INVOICE #INV-2026-042

From: Cadence
To: Apex Software Systems
Date: August 1, 2026
Due Date: August 31, 2026 (Net 30)

DESCRIPTION:
Enterprise Software Development - Q3 Milestone 1 Delivery
Backend infrastructure migration and API endpoints.

AMOUNT DUE:
$120,000.00 USD

Please remit payment within 30 days to avoid disruptions and late fees (2.0% per month).`;

createPdf('Apex_Software_Systems_Invoice_120k.pdf', 'INVOICE', invoice1Content);


const msa2Content = `MASTER SERVICES AGREEMENT

This Master Services Agreement ("MSA") is entered into by and between Cadence ("Provider") and Vertex Global Solutions ("Client") as of March 15, 2026.

1. SERVICES
Provider agrees to perform security auditing, penetration testing, and compliance consulting services as defined in individual Statements of Work (SOWs) executed by both parties.

2. PAYMENT TERMS
Client shall pay all undisputed invoices within Net 45 days of the invoice date. All payments must be made in USD.

3. LATE FEES
In the event that Client fails to pay any invoice within the Net 45 period, a late fee penalty of 1.5% per month will be applied to the outstanding balance.

4. CONFIDENTIALITY
Both parties agree to maintain strict confidentiality regarding any proprietary data, vulnerability reports, or trade secrets exchanged during the course of the engagement. This confidentiality clause survives termination for a period of five (5) years.

IN WITNESS WHEREOF, the parties have executed this MSA.

Vertex Global Solutions: [Signed: CISO]
Date: March 15, 2026`;

createPdf('Vertex_Global_Solutions_MSA.pdf', 'MASTER SERVICES AGREEMENT', msa2Content);


const invoice2Content = `INVOICE #INV-2026-089

From: Cadence
To: Vertex Global Solutions
Date: July 15, 2026
Due Date: August 29, 2026 (Net 45)

DESCRIPTION:
Comprehensive Security Audit and Penetration Test Report
SOC2 Compliance readiness assessment and remediation guide.

AMOUNT DUE:
$85,500.00 USD

Please remit payment within 45 days as per MSA terms.`;

const msa3Content = `MASTER SERVICES AGREEMENT

This Master Services Agreement ("MSA") is entered into by and between Cadence ("Provider") and Lumina Design Studio ("Client") as of May 1, 2026.

1. SERVICES
Provider agrees to perform UI/UX design, brand identity creation, and web development services as defined in individual Statements of Work (SOWs) executed by both parties.

2. PAYMENT TERMS
Client shall pay all undisputed invoices within Net 15 days of the invoice date. All payments must be made in USD.

3. LATE FEES
In the event that Client fails to pay any invoice within the Net 15 period, a late fee penalty of 5% of the outstanding balance will be applied every 30 days until paid. Provider reserves the right to withhold final design assets (Figma files, source code, logos) until full payment is received.

4. REVISIONS AND SCOPE CREEP
Each SOW includes a maximum of two (2) rounds of revisions. Additional revisions will be billed at an hourly rate of $150/hr. 

IN WITNESS WHEREOF, the parties have executed this MSA.

Lumina Design Studio: [Signed: Creative Director]
Date: May 1, 2026`;

createPdf('Lumina_Design_Studio_MSA.pdf', 'MASTER SERVICES AGREEMENT', msa3Content);


const invoice3Content = `INVOICE #INV-2026-112

From: Cadence
To: Lumina Design Studio
Date: September 1, 2026
Due Date: September 16, 2026 (Net 15)

DESCRIPTION:
Comprehensive Brand Identity Redesign & UI System
- Final Logo marks and typography guidelines.
- Figma UI Kit (50+ components).
- 3 rounds of revisions (1 extra billed at $150/hr for 10 hours).

AMOUNT DUE:
$42,500.00 USD

Please remit payment within 15 days to release the final source files.`;

createPdf('Lumina_Design_Studio_Invoice_42k.pdf', 'INVOICE', invoice3Content);
