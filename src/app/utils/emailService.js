import nodemailer from 'nodemailer';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Email Service for Payment Notifications
 * Reusable email service for sending payment-related emails
 */

// Create email transporter
function createTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  Email credentials not configured. Email sending will be disabled.');
    return null;
  }

  return nodemailer.createTransport({
    host: 'smtpout.secureserver.net',
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

/**
 * Send payment success email to customer
 */
export async function sendPaymentSuccessEmail(customerEmail, customerName, paymentData) {
  const transporter = createTransporter();
  if (!transporter) {
    console.warn('Email transporter not available. Skipping payment success email.');
    return false;
  }

  try {
    const { transactionId, amount, serviceName, merchantTransactionId, customerMessage } = paymentData;
    const amountInRupees = (amount / 100).toFixed(2);
    
    // Generate PDF receipt (with error handling for serverless environments)
    let pdfPath = null;
    try {
      pdfPath = await generatePaymentReceiptPDF({
        customerName,
        transactionId: transactionId || merchantTransactionId,
        merchantTransactionId,
        amount: amountInRupees,
        serviceName,
        customerMessage,
        paymentDate: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'long', timeStyle: 'short' })
      });
    } catch (pdfError) {
      console.warn('⚠️  PDF generation failed, sending email without PDF attachment:', pdfError.message);
      // Continue without PDF - email will still be sent
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: customerEmail,
      subject: `Payment Successful - Pre-Registration Confirmed`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .success-icon { font-size: 48px; margin-bottom: 20px; }
            .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; align-items: flex-start; }
            .detail-row:last-child { border-bottom: none; }
            .label { font-weight: bold; color: #666; min-width: 140px; flex-shrink: 0; }
            .value { color: #333; word-break: break-all; word-wrap: break-word; text-align: right; flex: 1; }
            .receipt { background: white; border: 2px solid #667eea; border-radius: 8px; padding: 25px; margin: 20px 0; }
            .receipt-header { text-align: center; border-bottom: 2px solid #667eea; padding-bottom: 15px; margin-bottom: 20px; }
            .receipt-header h2 { margin: 0; color: #667eea; font-size: 24px; }
            .receipt-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; }
            .receipt-row:last-child { border-bottom: none; border-top: 2px solid #667eea; margin-top: 10px; padding-top: 15px; }
            .receipt-label { font-weight: bold; color: #666; min-width: 150px; }
            .receipt-value { color: #333; word-break: break-all; word-wrap: break-word; text-align: right; flex: 1; }
            .receipt-total { font-size: 18px; font-weight: bold; color: #667eea; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            @media only screen and (max-width: 600px) {
              .container { width: 100% !important; padding: 10px !important; }
              .detail-row, .receipt-row { flex-direction: column; }
              .value, .receipt-value { text-align: left !important; margin-top: 5px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="success-icon">✅</div>
              <h1>Payment Successful!</h1>
            </div>
            <div class="content">
              <p>Dear ${customerName},</p>
              <p>Thank you for your pre-registration payment. Your payment has been successfully processed.</p>
              
              <p style="margin-top: 25px; margin-bottom: 15px;"><strong>Below is the payment receipt of your pre-registration:</strong></p>
              
              <div class="receipt">
                <div class="receipt-header">
                  <h2>PAYMENT RECEIPT</h2>
                  <p style="margin: 5px 0; color: #666; font-size: 14px;">Pre-Registration Payment Confirmation</p>
                </div>
                
                <div class="receipt-row">
                  <span class="receipt-label">Service:</span>
                  <span class="receipt-value">${serviceName || 'N/A'}</span>
                </div>
                <div class="receipt-row">
                  <span class="receipt-label">Transaction ID:</span>
                  <span class="receipt-value" style="font-family: monospace; font-size: 13px;">${transactionId || merchantTransactionId || 'N/A'}</span>
                </div>
                <div class="receipt-row">
                  <span class="receipt-label">Merchant Order ID:</span>
                  <span class="receipt-value" style="font-family: monospace; font-size: 13px;">${merchantTransactionId || 'N/A'}</span>
                </div>
                <div class="receipt-row">
                  <span class="receipt-label">Payment Date:</span>
                  <span class="receipt-value">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'long', timeStyle: 'short' })}</span>
                </div>
                <div class="receipt-row">
                  <span class="receipt-label">Payment Status:</span>
                  <span class="receipt-value" style="color: #10b981; font-weight: bold;">✅ Completed</span>
                </div>
                <div class="receipt-row">
                  <span class="receipt-label receipt-total">Total Amount Paid:</span>
                  <span class="receipt-value receipt-total">₹${amountInRupees}</span>
                </div>
              </div>

              <p><strong>What's Next?</strong></p>
              <p>Your pre-registration has been confirmed. We will contact you shortly to discuss your project requirements and proceed with the service.</p>
              
              <p>If you have any questions, please feel free to reach out to us.</p>
              
              ${customerMessage ? `
              <div class="details" style="margin-top: 25px;">
                <h3 style="margin-top: 0; color: #667eea;">Project Details</h3>
                <p style="white-space: pre-wrap; word-wrap: break-word;">${customerMessage}</p>
              </div>
              ` : ''}
              
              <p style="margin-top: 20px; padding: 15px; background: #f0f9ff; border-left: 4px solid #667eea; border-radius: 4px;">
                <strong>Note:</strong> Please keep this receipt for your records. A downloadable PDF receipt is attached to this email. You can use the Transaction ID for any payment-related queries.
              </p>
              
              <div class="footer">
                <p>Best regards,<br>Abhishek Kumar Chaudhary</p>
                <p>This is an automated email. Please do not reply.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Payment Successful - Pre-Registration Confirmed
        
        Dear ${customerName},
        
        Thank you for your pre-registration payment. Your payment has been successfully processed.
        
        Below is the payment receipt of your pre-registration:
        
        ============================================
        PAYMENT RECEIPT
        Pre-Registration Payment Confirmation
        ============================================
        
        Service: ${serviceName || 'N/A'}
        Transaction ID: ${transactionId || merchantTransactionId || 'N/A'}
        Merchant Order ID: ${merchantTransactionId || 'N/A'}
        Payment Date: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'long', timeStyle: 'short' })}
        Payment Status: ✅ Completed
        Total Amount Paid: ₹${amountInRupees}
        
        ============================================
        
        What's Next?
        Your pre-registration has been confirmed. We will contact you shortly to discuss your project requirements and proceed with the service.
        
        If you have any questions, please feel free to reach out to us.
        
        ${customerMessage ? `\nProject Details:\n${customerMessage}\n` : ''}
        
        Note: Please keep this receipt for your records.${pdfPath ? ' A downloadable PDF receipt is attached to this email.' : ''} You can use the Transaction ID for any payment-related queries.
        
        Best regards,
        Abhishek Kumar Chaudhary
      `,
      attachments: pdfPath ? [
        {
          filename: `Payment_Receipt_${merchantTransactionId || transactionId}.pdf`,
          path: pdfPath
        }
      ] : []
    };

    await transporter.sendMail(mailOptions);
    
    // Clean up PDF file after sending (if it was created)
    if (pdfPath) {
      try {
        if (fs.existsSync(pdfPath)) {
          fs.unlinkSync(pdfPath);
        }
      } catch (cleanupError) {
        console.warn('⚠️  Could not delete temporary PDF file:', cleanupError.message);
      }
    }
    
    console.log(`✅ Payment success email sent to ${customerEmail}${pdfPath ? ' with PDF receipt' : ' (PDF generation skipped)'}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending payment success email:', error);
    return false;
  }
}

/**
 * Send payment success notification to admin
 */
export async function sendAdminPaymentNotification(paymentData) {
  const transporter = createTransporter();
  if (!transporter) {
    console.warn('Email transporter not available. Skipping admin notification.');
    return false;
  }

  try {
    const { customerName, customerEmail, customerPhone, transactionId, amount, serviceName, merchantTransactionId, message } = paymentData;
    const amountInRupees = (amount / 100).toFixed(2);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: [
        process.env.EMAIL_USER, // support@abhishek-chaudhary.com
        'allencarrierinst@gmail.com' // Secondary email
      ],
      subject: `💰 New Pre-Registration Payment Received - ₹${amountInRupees}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; align-items: flex-start; }
            .detail-row:last-child { border-bottom: none; }
            .label { font-weight: bold; color: #666; min-width: 140px; flex-shrink: 0; }
            .value { color: #333; word-break: break-all; word-wrap: break-word; text-align: right; flex: 1; }
            .highlight { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; }
            @media only screen and (max-width: 600px) {
              .container { width: 100% !important; padding: 10px !important; }
              .detail-row { flex-direction: column; }
              .value { text-align: left !important; margin-top: 5px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💰 New Payment Received</h1>
            </div>
            <div class="content">
              <div class="highlight">
                <h2 style="margin-top: 0;">Pre-Registration Payment: ₹${amountInRupees}</h2>
              </div>
              
              <div class="details">
                <h3>Customer Details</h3>
                <div class="detail-row">
                  <span class="label">Name:</span>
                  <span class="value">${customerName || 'N/A'}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Email:</span>
                  <span class="value" style="font-family: monospace; font-size: 13px;">${customerEmail || 'N/A'}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Phone:</span>
                  <span class="value">${customerPhone || 'N/A'}</span>
                </div>
              </div>

              <div class="details">
                <h3>Payment Details</h3>
                <div class="detail-row">
                  <span class="label">Service:</span>
                  <span class="value">${serviceName || 'N/A'}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Amount:</span>
                  <span class="value">₹${amountInRupees}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Transaction ID:</span>
                  <span class="value" style="font-family: monospace; font-size: 13px;">${transactionId || merchantTransactionId || 'N/A'}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Merchant Order ID:</span>
                  <span class="value" style="font-family: monospace; font-size: 13px;">${merchantTransactionId || 'N/A'}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Payment Date:</span>
                  <span class="value">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
                </div>
              </div>

              ${message ? `
              <div class="details">
                <h3>Project Details</h3>
                <p>${message}</p>
              </div>
              ` : ''}

              <p><strong>Action Required:</strong> Contact the customer to discuss project requirements and proceed with the service.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        New Pre-Registration Payment Received - ₹${amountInRupees}
        
        Customer Details:
        Name: ${customerName || 'N/A'}
        Email: ${customerEmail || 'N/A'}
        Phone: ${customerPhone || 'N/A'}
        
        Payment Details:
        Service: ${serviceName || 'N/A'}
        Amount: ₹${amountInRupees}
        Transaction ID: ${transactionId || merchantTransactionId || 'N/A'}
        Merchant Order ID: ${merchantTransactionId || 'N/A'}
        Payment Date: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
        
        ${message ? `Project Details: ${message}` : ''}
        
        Action Required: Contact the customer to discuss project requirements and proceed with the service.
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Admin payment notification sent`);
    return true;
  } catch (error) {
    console.error('❌ Error sending admin payment notification:', error);
    return false;
  }
}

/**
 * Send payment failed email to customer
 */
export async function sendPaymentFailedEmail(customerEmail, customerName, paymentData) {
  const transporter = createTransporter();
  if (!transporter) {
    console.warn('Email transporter not available. Skipping payment failed email.');
    return false;
  }

  try {
    const { transactionId, reason, serviceName } = paymentData;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: customerEmail,
      subject: `Payment Failed - Pre-Registration`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ef4444; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .error-icon { font-size: 48px; margin-bottom: 20px; }
            .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="error-icon">❌</div>
              <h1>Payment Failed</h1>
            </div>
            <div class="content">
              <p>Dear ${customerName},</p>
              <p>We're sorry, but your payment for the pre-registration could not be processed.</p>
              
              <div class="details">
                <p><strong>Service:</strong> ${serviceName || 'N/A'}</p>
                ${transactionId ? `<p><strong>Transaction ID:</strong> ${transactionId}</p>` : ''}
                ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
              </div>

              <p><strong>What to do next?</strong></p>
              <ul>
                <li>Please check your payment method and try again</li>
                <li>Ensure you have sufficient balance or credit limit</li>
                <li>If the problem persists, please contact us for assistance</li>
              </ul>
              
              <p>We're here to help! If you need any assistance, please don't hesitate to reach out.</p>
              
              <div class="footer">
                <p>Best regards,<br>Abhishek Kumar Chaudhary</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Payment failed email sent to ${customerEmail}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending payment failed email:', error);
    return false;
  }
}

/**
 * Generate PDF receipt for payment using pdf-lib (serverless-friendly)
 */
async function generatePaymentReceiptPDF(receiptData) {
  try {
    const { customerName, transactionId, merchantTransactionId, amount, serviceName, customerMessage, paymentDate } = receiptData;
    
    // Create temporary file path
    const tempDir = os.tmpdir();
    const fileName = `receipt_${merchantTransactionId || transactionId}_${Date.now()}.pdf`;
    const filePath = path.join(tempDir, fileName);
    
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Embed standard fonts (built-in, no external files needed)
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Add a page
    const page = pdfDoc.addPage([595, 842]); // A4 size in points
    const { width, height } = page.getSize();
    
    // Define colors
    const primaryColor = rgb(0.4, 0.494, 0.918); // #667eea
    const textColor = rgb(0.2, 0.2, 0.2); // #333
    const grayColor = rgb(0.4, 0.4, 0.4); // #666
    const successColor = rgb(0.063, 0.725, 0.506); // #10b981
    const lightGray = rgb(0.933, 0.933, 0.933); // #eee
    
    let yPos = height - 50; // Start from top with margin
    
    // Header - centered
    const headerText = 'PAYMENT RECEIPT';
    const headerWidth = helveticaBoldFont.widthOfTextAtSize(headerText, 24);
    page.drawText(headerText, {
      x: (width - headerWidth) / 2,
      y: yPos,
      size: 24,
      font: helveticaBoldFont,
      color: primaryColor,
    });
    
    yPos -= 30;
    
    // Subheader
    const subheaderText = 'Pre-Registration Payment Confirmation';
    const subheaderWidth = helveticaFont.widthOfTextAtSize(subheaderText, 12);
    page.drawText(subheaderText, {
      x: (width - subheaderWidth) / 2,
      y: yPos,
      size: 12,
      font: helveticaFont,
      color: grayColor,
    });
    
    yPos -= 30;
    
    // Draw line
    page.drawLine({
      start: { x: 50, y: yPos },
      end: { x: width - 50, y: yPos },
      thickness: 2,
      color: primaryColor,
    });
    
    yPos -= 30;
    
    // Helper function to draw label-value pair
    const drawLabelValue = (label, value, isMonospace = false, isStatus = false) => {
      page.drawText(label, {
        x: 50,
        y: yPos,
        size: 11,
        font: helveticaFont,
        color: grayColor,
      });
      
      const valueWidth = (isMonospace ? helveticaFont : helveticaFont).widthOfTextAtSize(value, isMonospace ? 10 : 11);
      page.drawText(value, {
        x: width - 50 - valueWidth,
        y: yPos,
        size: isMonospace ? 10 : 11,
        font: isStatus ? helveticaBoldFont : helveticaFont,
        color: isStatus ? successColor : textColor,
      });
      
      yPos -= 20;
    };
    
    // Receipt Details
    drawLabelValue('Customer Name:', customerName || 'N/A');
    drawLabelValue('Service:', serviceName || 'N/A');
    drawLabelValue('Transaction ID:', transactionId || 'N/A', true);
    drawLabelValue('Merchant Order ID:', merchantTransactionId || 'N/A', true);
    drawLabelValue('Payment Date:', paymentDate);
    drawLabelValue('Payment Status:', 'COMPLETED', false, true);
    
    yPos -= 10;
    
    // Draw divider
    page.drawLine({
      start: { x: 50, y: yPos },
      end: { x: width - 50, y: yPos },
      thickness: 1,
      color: lightGray,
    });
    
    yPos -= 20;
    
    // Total Amount (using ASCII-compatible currency symbol)
    const totalLabel = 'Total Amount Paid:';
    const totalValue = `Rs. ${amount}`;
    const totalLabelWidth = helveticaBoldFont.widthOfTextAtSize(totalLabel, 16);
    const totalValueWidth = helveticaBoldFont.widthOfTextAtSize(totalValue, 16);
    
    page.drawText(totalLabel, {
      x: 50,
      y: yPos,
      size: 16,
      font: helveticaBoldFont,
      color: primaryColor,
    });
    
    page.drawText(totalValue, {
      x: width - 50 - totalValueWidth,
      y: yPos,
      size: 16,
      font: helveticaBoldFont,
      color: primaryColor,
    });
    
    yPos -= 40;
    
    // Project Details (if available)
    if (customerMessage) {
      // Draw line
      page.drawLine({
        start: { x: 50, y: yPos },
        end: { x: width - 50, y: yPos },
        thickness: 2,
        color: primaryColor,
      });
      
      yPos -= 25;
      
      // Project Details header
      page.drawText('Project Details', {
        x: 50,
        y: yPos,
        size: 14,
        font: helveticaBoldFont,
        color: primaryColor,
      });
      
      yPos -= 25;
      
      // Project details text (wrap if needed)
      const maxWidth = width - 100;
      const words = customerMessage.split(' ');
      let line = '';
      const lineHeight = 15;
      
      for (const word of words) {
        const testLine = line + word + ' ';
        const testWidth = helveticaFont.widthOfTextAtSize(testLine, 11);
        
        if (testWidth > maxWidth && line.length > 0) {
          page.drawText(line.trim(), {
            x: 50,
            y: yPos,
            size: 11,
            font: helveticaFont,
            color: textColor,
          });
          yPos -= lineHeight;
          line = word + ' ';
        } else {
          line = testLine;
        }
      }
      
      if (line.length > 0) {
        page.drawText(line.trim(), {
          x: 50,
          y: yPos,
          size: 11,
          font: helveticaFont,
          color: textColor,
        });
      }
    }
    
    // Footer
    const footerY = 50;
    const footerText1 = 'This is a computer-generated receipt.';
    const footerText2 = 'For any queries, please contact: support@abhishek-chaudhary.com';
    
    const footer1Width = helveticaFont.widthOfTextAtSize(footerText1, 9);
    const footer2Width = helveticaFont.widthOfTextAtSize(footerText2, 9);
    
    page.drawText(footerText1, {
      x: (width - footer1Width) / 2,
      y: footerY + 15,
      size: 9,
      font: helveticaFont,
      color: rgb(0.6, 0.6, 0.6),
    });
    
    page.drawText(footerText2, {
      x: (width - footer2Width) / 2,
      y: footerY,
      size: 9,
      font: helveticaFont,
      color: rgb(0.6, 0.6, 0.6),
    });
    
    // Set PDF metadata
    pdfDoc.setTitle('Payment Receipt');
    pdfDoc.setAuthor('Abhishek Kumar Chaudhary');
    pdfDoc.setSubject('Pre-Registration Payment Receipt');
    
    // Save PDF to file
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(filePath, pdfBytes);
    
    return filePath;
  } catch (error) {
    throw error;
  }
}

