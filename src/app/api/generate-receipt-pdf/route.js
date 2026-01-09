import { NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * API endpoint to generate a payment receipt PDF
 * This uses the same PDF generation logic as the email service
 * for consistency between email attachments and frontend downloads
 */
export async function POST(request) {
  try {
    const data = await request.json();
    
    const {
      customerName,
      transactionId,
      merchantTransactionId,
      amount,
      serviceName,
      customerMessage,
    } = data;

    if (!transactionId && !merchantTransactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    // Generate PDF using the same logic as emailService
    const pdfBytes = await generateReceiptPDF({
      customerName: customerName || 'N/A',
      transactionId: transactionId || merchantTransactionId,
      merchantTransactionId: merchantTransactionId || transactionId,
      amount: amount,
      serviceName: serviceName || 'N/A',
      customerMessage: customerMessage || '',
      paymentDate: new Date().toLocaleString('en-IN', { 
        timeZone: 'Asia/Kolkata', 
        dateStyle: 'long', 
        timeStyle: 'short' 
      })
    });

    // Return PDF as binary response
    const filename = `receipt_${transactionId || merchantTransactionId}.pdf`;
    
    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBytes.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating receipt PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Generate PDF receipt (same logic as emailService.js)
 */
async function generateReceiptPDF(receiptData) {
  const { customerName, transactionId, merchantTransactionId, amount, serviceName, customerMessage, paymentDate } = receiptData;

  // Create a new PDFDocument
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();

  // Embed fonts
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();

  // Colors
  const primaryColor = rgb(0.4, 0.49, 0.92); // #667eea
  const textColor = rgb(0.2, 0.2, 0.2);
  const grayColor = rgb(0.4, 0.4, 0.4);
  const successColor = rgb(0.06, 0.72, 0.51); // #10b981

  let yPos = height - 50;

  // Header
  page.drawText('PAYMENT RECEIPT', {
    x: width / 2 - helveticaBoldFont.widthOfTextAtSize('PAYMENT RECEIPT', 24) / 2,
    y: yPos,
    size: 24,
    font: helveticaBoldFont,
    color: primaryColor,
  });

  yPos -= 25;
  const subtitle = 'Pre-Registration Payment Confirmation';
  page.drawText(subtitle, {
    x: width / 2 - helveticaFont.widthOfTextAtSize(subtitle, 12) / 2,
    y: yPos,
    size: 12,
    font: helveticaFont,
    color: grayColor,
  });

  yPos -= 40;

  // Draw a line
  page.drawLine({
    start: { x: 50, y: yPos },
    end: { x: width - 50, y: yPos },
    thickness: 1,
    color: primaryColor,
  });

  yPos -= 30;

  // Receipt details
  const details = [
    { label: 'Customer Name:', value: customerName },
    { label: 'Service:', value: serviceName },
    { label: 'Transaction ID:', value: transactionId || 'N/A' },
    { label: 'Merchant Order ID:', value: merchantTransactionId || 'N/A' },
    { label: 'Payment Date:', value: paymentDate },
    { label: 'Payment Status:', value: 'COMPLETED', isSuccess: true },
  ];

  for (const detail of details) {
    page.drawText(detail.label, {
      x: 50,
      y: yPos,
      size: 11,
      font: helveticaBoldFont,
      color: grayColor,
    });

    page.drawText(detail.value, {
      x: 200,
      y: yPos,
      size: 11,
      font: helveticaFont,
      color: detail.isSuccess ? successColor : textColor,
    });

    yPos -= 22;
  }

  yPos -= 10;

  // Draw a line before amount
  page.drawLine({
    start: { x: 50, y: yPos },
    end: { x: width - 50, y: yPos },
    thickness: 1,
    color: primaryColor,
  });

  yPos -= 25;

  // Amount (convert from paise to rupees if needed)
  const amountValue = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  const amountInRupees = amountValue > 100 ? (amountValue / 100).toFixed(2) : amountValue.toFixed(2);
  
  page.drawText('Total Amount Paid:', {
    x: 50,
    y: yPos,
    size: 14,
    font: helveticaBoldFont,
    color: textColor,
  });

  page.drawText(`Rs. ${amountInRupees}`, {
    x: 200,
    y: yPos,
    size: 14,
    font: helveticaBoldFont,
    color: primaryColor,
  });

  yPos -= 40;

  // Project Details (if available)
  if (customerMessage && customerMessage.trim()) {
    page.drawText('Project Details:', {
      x: 50,
      y: yPos,
      size: 12,
      font: helveticaBoldFont,
      color: primaryColor,
    });

    yPos -= 20;

    // Manual text wrapping for customer message
    const textLines = customerMessage.split('\n');
    const maxWidth = width - 100;
    const fontSize = 11;
    const lineHeight = 15;

    for (const line of textLines) {
      let currentLine = '';
      const words = line.split(' ');
      for (const word of words) {
        const testLine = currentLine === '' ? word : `${currentLine} ${word}`;
        const textWidth = helveticaFont.widthOfTextAtSize(testLine, fontSize);

        if (textWidth < maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine !== '') {
            page.drawText(currentLine, {
              x: 50,
              y: yPos,
              size: fontSize,
              font: helveticaFont,
              color: textColor,
            });
            yPos -= lineHeight;
          }
          currentLine = word;
        }
      }
      if (currentLine !== '') {
        page.drawText(currentLine, {
          x: 50,
          y: yPos,
          size: fontSize,
          font: helveticaFont,
          color: textColor,
        });
        yPos -= lineHeight;
      }
    }
  }

  // Footer
  yPos = 50;
  const footerText1 = 'This is a computer-generated receipt.';
  const footerText2 = 'For any queries, please contact: support@abhishek-chaudhary.com';

  page.drawText(footerText1, {
    x: width / 2 - helveticaFont.widthOfTextAtSize(footerText1, 9) / 2,
    y: yPos,
    size: 9,
    font: helveticaFont,
    color: grayColor,
  });

  page.drawText(footerText2, {
    x: width / 2 - helveticaFont.widthOfTextAtSize(footerText2, 9) / 2,
    y: yPos - 12,
    size: 9,
    font: helveticaFont,
    color: grayColor,
  });

  // Save the PDF
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
