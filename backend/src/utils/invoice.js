const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const INVOICE_DIR = path.join(__dirname, '..', '..', 'invoices');
if (!fs.existsSync(INVOICE_DIR)) fs.mkdirSync(INVOICE_DIR, { recursive: true });

/**
 * Generates a GST / Non-GST PDF invoice for a completed booking.
 * Returns the relative file path saved on disk.
 */
function generateInvoicePDF({ booking, invoiceNumber, isGst, subtotal, gstPercent, gstAmount, totalAmount }) {
  return new Promise((resolve, reject) => {
    const fileName = `${invoiceNumber}.pdf`;
    const filePath = path.join(INVOICE_DIR, fileName);
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const companyName = process.env.COMPANY_NAME || 'Sound & DJ Services';
    const companyAddress = process.env.COMPANY_ADDRESS || '';
    const companyPhone = process.env.COMPANY_PHONE || '';
    const companyGstin = process.env.COMPANY_GSTIN || '';

    doc.fontSize(20).text(companyName, { align: 'left' });
    doc.fontSize(10).text(companyAddress);
    doc.text(`Phone: ${companyPhone}`);
    if (isGst) doc.text(`GSTIN: ${companyGstin}`);
    doc.moveDown();

    doc.fontSize(16).text(isGst ? 'TAX INVOICE (GST)' : 'INVOICE (Non-GST)', { align: 'right' });
    doc.fontSize(10).text(`Invoice No: ${invoiceNumber}`, { align: 'right' });
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, { align: 'right' });
    doc.moveDown();

    doc.fontSize(12).text('Bill To:', { underline: true });
    doc.fontSize(10).text(`${booking.customer_name}`);
    doc.text(`Phone: ${booking.customer_phone}`);
    if (booking.customer_address) doc.text(`Address: ${booking.customer_address}`);
    doc.moveDown();

    doc.fontSize(12).text('Booking Details:', { underline: true });
    doc.fontSize(10).text(`Booking Code: ${booking.booking_code}`);
    doc.text(`Event Type: ${booking.event_type}`);
    doc.text(`Event Date: ${new Date(booking.event_date).toLocaleDateString('en-IN')}`);
    if (booking.event_location) doc.text(`Location: ${booking.event_location}`);
    doc.moveDown();

    // Table header
    doc.fontSize(11).text('Description', 50, doc.y, { continued: true, width: 300 });
    doc.text('Amount (₹)', { align: 'right' });
    doc.moveTo(50, doc.y + 2).lineTo(550, doc.y + 2).stroke();
    doc.moveDown(0.5);

    doc.fontSize(10).text('Sound System & DJ Package Charges', 50, doc.y, { continued: true, width: 300 });
    doc.text(subtotal.toFixed(2), { align: 'right' });
    doc.moveDown(0.3);

    if (isGst) {
      doc.text(`GST (${gstPercent}%)`, 50, doc.y, { continued: true, width: 300 });
      doc.text(gstAmount.toFixed(2), { align: 'right' });
      doc.moveDown(0.3);
    }

    doc.moveTo(50, doc.y + 2).lineTo(550, doc.y + 2).stroke();
    doc.moveDown(0.3);
    doc.fontSize(12).text('Total Amount', 50, doc.y, { continued: true, width: 300 });
    doc.text(`₹ ${totalAmount.toFixed(2)}`, { align: 'right' });
    doc.moveDown();

    doc.fontSize(10).text(`Advance Paid: ₹ ${Number(booking.advance_amount).toFixed(2)}`);
    doc.text(`Balance Paid: ₹ ${Number(booking.balance_amount).toFixed(2)}`);
    doc.moveDown(2);

    doc.fontSize(9).fillColor('gray').text('This is a computer-generated invoice.', { align: 'center' });

    doc.end();

    stream.on('finish', () => resolve(`invoices/${fileName}`));
    stream.on('error', reject);
  });
}

module.exports = { generateInvoicePDF, INVOICE_DIR };
