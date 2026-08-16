const PDFDocument = require('pdfkit');
const fs = require('fs');

function generateMSA() {
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream('E:/Real_MSA_TechFlow_Solutions.pdf'));

  doc.fontSize(20).text('MASTER SERVICES AGREEMENT', { align: 'center' });
  doc.moveDown();
  
  doc.fontSize(12).text('This Master Services Agreement ("Agreement") is made effective as of January 15, 2026, by and between TechFlow Solutions ("Provider") and Zenith Corporation ("Client").');
  doc.moveDown();
  
  doc.fontSize(14).text('1. SERVICES AND CONTRACT VALUE');
  doc.fontSize(12).text('Provider agrees to perform the software development services outlined in the attached Statement of Work (SOW). The total contract value for Phase 1 of this engagement is Twenty-Five Thousand Dollars ($25,000.00 USD).');
  doc.moveDown();
  
  doc.fontSize(14).text('2. PAYMENT TERMS');
  doc.fontSize(12).text('Client shall pay all undisputed invoices within fifteen (15) days of receipt (Net 15). All payments shall be made in US Dollars via wire transfer to the Provider\'s designated account.');
  doc.moveDown();
  
  doc.fontSize(14).text('3. LATE FEES');
  doc.fontSize(12).text('If Client fails to pay any undisputed amount by the due date, Provider reserves the right to charge a late fee of one point five percent (1.5%) per month on the outstanding balance, or the maximum rate permitted by law, whichever is lower.');
  doc.moveDown();
  
  doc.fontSize(14).text('4. EFFECTIVE DATE AND EXPIRATION');
  doc.fontSize(12).text('This Agreement shall commence on the Effective Date (January 15, 2026) and shall expire on December 31, 2026, unless terminated earlier in accordance with Section 5.');
  doc.moveDown();
  
  doc.fontSize(14).text('5. TERMINATION');
  doc.fontSize(12).text('Either party may terminate this Agreement for convenience upon thirty (30) days prior written notice to the other party. Upon termination, Client shall pay for all services rendered up to the date of termination.');
  doc.moveDown();
  
  doc.fontSize(14).text('6. CONFIDENTIALITY AND IP');
  doc.fontSize(12).text('All intellectual property created during the engagement shall transfer to the Client upon full payment of all outstanding invoices. Both parties agree to maintain strict confidentiality regarding proprietary business information.');

  doc.end();
  console.log('Generated: E:/Real_MSA_TechFlow_Solutions.pdf');
}

function generateInvoice() {
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream('E:/Real_Invoice_INV-2026-089.pdf'));

  doc.fontSize(24).text('INVOICE', { align: 'right' });
  doc.moveDown();
  
  doc.fontSize(12).text('TechFlow Solutions\n123 Innovation Drive\nSan Francisco, CA 94105');
  doc.moveDown(2);
  
  doc.text('BILL TO:\nZenith Corporation\n456 Corporate Blvd\nNew York, NY 10001');
  
  doc.moveUp(3);
  doc.text('Invoice Number: INV-2026-089', { align: 'right' });
  doc.text('Issue Date: July 1, 2026', { align: 'right' });
  doc.text('Due Date: July 16, 2026', { align: 'right' });
  
  doc.moveDown(4);
  
  doc.fontSize(14).text('DESCRIPTION OF SERVICES');
  doc.moveDown(0.5);
  doc.fontSize(12).text('Software Development Services - Phase 1 Deliverables as per MSA.');
  
  doc.moveDown(2);
  doc.fontSize(16).text('TOTAL AMOUNT DUE: $25,000.00', { align: 'right' });
  
  doc.moveDown();
  doc.fontSize(10).text('Please make payment via wire transfer within 15 days (Net 15) to avoid late fees of 1.5% per month as stipulated in the MSA.', { align: 'center', color: 'grey' });

  doc.end();
  console.log('Generated: E:/Real_Invoice_INV-2026-089.pdf');
}

generateMSA();
generateInvoice();
