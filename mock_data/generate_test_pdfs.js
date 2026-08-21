import PDFDocument from 'pdfkit';
import fs from 'fs';

function createMSA(filename, clientName, terms, amount) {
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(fs.createWriteStream(filename));

  doc.fontSize(20).text('Master Services Agreement', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`This agreement is between Cadence and ${clientName}.`);
  doc.moveDown();
  doc.fontSize(14).text('1. Payment Terms');
  doc.fontSize(12).text(`The client agrees to pay all invoices within ${terms}. Any late payments will incur a 1.5% monthly late fee.`);
  doc.moveDown();
  doc.fontSize(14).text('2. Approved Budget');
  doc.fontSize(12).text(`The total approved budget for the current phase is $${amount.toLocaleString()}. Cadence shall not exceed this amount without written approval.`);
  doc.moveDown();
  doc.fontSize(14).text('3. Governing Law');
  doc.fontSize(12).text('This agreement shall be governed by the laws of the State of Delaware.');
  
  doc.end();
}

function createInvoice(filename, clientName, invoiceNumber, amount, issueDate, dueDate) {
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(fs.createWriteStream(filename));

  doc.fontSize(24).text('INVOICE', { align: 'right' });
  doc.moveDown();
  
  doc.fontSize(12).text('From:');
  doc.text('Cadence Financials');
  doc.text('123 Tech Lane');
  doc.moveDown();
  
  doc.text(`To:`);
  doc.text(clientName);
  doc.moveDown();

  doc.text(`Invoice Number: ${invoiceNumber}`);
  doc.text(`Issue Date: ${issueDate}`);
  doc.text(`Due Date: ${dueDate}`);
  doc.moveDown(2);

  doc.fontSize(14).text('Services Rendered', { underline: true });
  doc.moveDown();
  doc.fontSize(12).text('Software Development & Integration Consulting');
  doc.moveDown();
  
  doc.fontSize(16).text(`Total Amount Due: $${amount.toLocaleString()}`, { align: 'right' });
  
  doc.end();
}

// Case 1: Strict Net 15 - Matches perfectly
createMSA('mock_data/Case1_MSA_Strict.pdf', 'Alpha Corp', 'Net 15 days', 20000);
createInvoice('mock_data/Case1_Invoice_Match.pdf', 'Alpha Corp', 'INV-ALPHA-01', 20000, '2026-08-01', '2026-08-16');

// Case 2: Lax Net 60 - Invoice violates amount and terms
createMSA('mock_data/Case2_MSA_Lax.pdf', 'Omega Logistics', 'Net 60 days', 50000);
createInvoice('mock_data/Case2_Invoice_Violation.pdf', 'Omega Logistics', 'INV-OMEGA-01', 65000, '2026-08-01', '2026-08-15'); // 65k (over 50k budget) and Net 14 (violates Net 60)

console.log('Test PDFs generated successfully in mock_data/');
