import nodemailer from 'nodemailer';
const { createTransport } = nodemailer;
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Email Service for Payment Notifications
 * Uses GoDaddy Titan Mail (smtpout.secureserver.net)
 * 
 * IMPORTANT: Deduplication is handled by paymentStorage.trySetEmailsSent()
 * which persists to disk/memory. The email service just sends emails.
 */

// Track emails being sent RIGHT NOW (in-flight lock to prevent parallel sends)
// This is a short-lived lock for the current process only
const emailsInFlight = {
  customer: new Set(),
  admin: new Set()
};

/**
 * Try to acquire in-flight lock (prevents parallel sends within same process)
 */
function tryAcquireInFlightLock(merchantTransactionId, emailType) {
  const lockSet = emailsInFlight[emailType];
  if (lockSet.has(merchantTransactionId)) {
    console.log(`🔒 Email already in-flight: ${emailType} for ${merchantTransactionId} - SKIPPING`);
    return false;
  }
  lockSet.add(merchantTransactionId);
  console.log(`✅ In-flight lock acquired: ${emailType} for ${merchantTransactionId}`);
  return true;
}

/**
 * Release in-flight lock after email is sent
 */
function releaseInFlightLock(merchantTransactionId, emailType) {
  emailsInFlight[emailType].delete(merchantTransactionId);
  console.log(`🔓 In-flight lock released: ${emailType} for ${merchantTransactionId}`);
}

// Create email transporter
function createEmailTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  Email credentials not configured. Email sending will be disabled.');
    return null;
  }

  return createTransport({
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
 * Send payment success email to customer with PDF receipt
 */
export async function sendPaymentSuccessEmail(customerEmail, customerName, paymentData) {
  const { merchantTransactionId } = paymentData;
  
  // TRY TO ACQUIRE IN-FLIGHT LOCK - Prevents parallel sends within same process
  if (!tryAcquireInFlightLock(merchantTransactionId, 'customer')) {
    console.log(`⚠️  DUPLICATE PREVENTED: Customer email for ${merchantTransactionId} already in-flight`);
    return false;
  }
  
  const transporter = createEmailTransporter();
  if (!transporter) {
    console.warn('Email transporter not available. Skipping payment success email.');
    releaseInFlightLock(merchantTransactionId, 'customer');
    return false;
  }

  try {
    const { transactionId, amount, serviceName, customerMessage } = paymentData;
    const amountInRupees = (amount / 100).toFixed(2);
    
    // Debug: Log customerMessage to verify it's being passed
    console.log('📧 Email - customerMessage:', customerMessage ? 'Present' : 'Missing', customerMessage ? `(${customerMessage.length} chars)` : '');
    
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
              
              ${customerMessage ? `
              <div class="details">
                <h3 style="margin-top: 0; color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Project Details</h3>
                <p style="white-space: pre-wrap; word-break: break-word; margin: 10px 0;">${customerMessage}</p>
              </div>
              ` : ''}
              
              <div class="highlight">
                <h3 style="margin-top: 0; color: #10b981;">What's Next?</h3>
                <p style="margin: 10px 0;">Your pre-registration has been confirmed. We will contact you shortly to discuss your project requirements and proceed with the service.</p>
              </div>
              
              <p>If you have any questions, please feel free to reach out to us at <a href="mailto:support@abhishek-chaudhary.com" style="color: #667eea;">support@abhishek-chaudhary.com</a>.</p>
              
              ${pdfPath ? '<p style="margin-top: 20px; padding: 15px; background: #f0f9ff; border-left: 4px solid #667eea; border-radius: 4px;"><strong>Note:</strong> A PDF receipt is attached to this email for your records.</p>' : ''}
              
              <div class="footer">
                <p>This is an automated email. Please do not reply directly to this message.</p>
                <p>&copy; ${new Date().getFullYear()} Abhishek Kumar Chaudhary. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Payment Successful!
        
        Dear ${customerName},
        
        Thank you for your pre-registration payment. Your payment has been successfully processed.
        
        PAYMENT RECEIPT
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
        
        Best regards,
        Abhishek Kumar Chaudhary
        support@abhishek-chaudhary.com
      `,
    };

    // Attach PDF receipt if available
    if (pdfPath) {
      const fs = require('fs');
      if (fs.existsSync(pdfPath)) {
        mailOptions.attachments = [
          {
            filename: `receipt_${merchantTransactionId}.pdf`,
            path: pdfPath,
          },
        ];
      }
    }

    console.log(`📧 Sending email to ${customerEmail}...`);
    const emailResult = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent successfully. Message ID: ${emailResult.messageId}`);
    
    // Release the in-flight lock after successful send
    releaseInFlightLock(merchantTransactionId, 'customer');
    
    console.log(`✅ Payment success email sent to ${customerEmail}${pdfPath ? ' with PDF receipt' : ' (PDF generation skipped)'}`);
    // Return PDF path so it can be reused for admin email (don't delete yet)
    return pdfPath || true;
  } catch (error) {
    console.error('❌ Error sending payment success email:', error);
    releaseInFlightLock(merchantTransactionId, 'customer');
    return false;
  }
}

/**
 * Send payment notification to admin
 */
export async function sendAdminPaymentNotification(paymentData) {
  const { merchantTransactionId } = paymentData;
  
  // TRY TO ACQUIRE IN-FLIGHT LOCK - Prevents parallel sends within same process
  if (!tryAcquireInFlightLock(merchantTransactionId, 'admin')) {
    console.log(`⚠️  DUPLICATE PREVENTED: Admin email for ${merchantTransactionId} already in-flight`);
    return false;
  }
  
  const transporter = createEmailTransporter();
  if (!transporter) {
    console.warn('Email transporter not available. Skipping admin payment notification.');
    releaseInFlightLock(merchantTransactionId, 'admin');
    return false;
  }

  try {
    const { customerName, customerEmail, customerPhone, transactionId, amount, serviceName, message, pdfPath } = paymentData;
    const amountInRupees = (amount / 100).toFixed(2);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // support@abhishek-chaudhary.com only
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
              <p style="margin: 10px 0; font-size: 24px; font-weight: bold;">₹${amountInRupees}</p>
            </div>
            <div class="content">
              <h2 style="color: #10b981; margin-top: 0;">Payment Details</h2>
              
              <div class="details">
                <div class="detail-row">
                  <span class="label">Customer Name:</span>
                  <span class="value">${customerName || 'N/A'}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Customer Email:</span>
                  <span class="value" style="font-family: monospace; font-size: 13px;">${customerEmail || 'N/A'}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Customer Phone:</span>
                  <span class="value">${customerPhone || 'N/A'}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Service:</span>
                  <span class="value">${serviceName || 'N/A'}</span>
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
                  <span class="label">Amount:</span>
                  <span class="value" style="font-size: 18px; font-weight: bold; color: #10b981;">₹${amountInRupees}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Payment Date:</span>
                  <span class="value">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'long', timeStyle: 'short' })}</span>
                </div>
              </div>
              
              ${message ? `
              <div class="details">
                <h3 style="margin-top: 0; color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Project Details</h3>
                <p style="white-space: pre-wrap; word-break: break-word; margin: 10px 0;">${message}</p>
              </div>
              ` : ''}
              
              <div class="highlight">
                <h3 style="margin-top: 0; color: #059669;">Action Required</h3>
                <p style="margin: 10px 0;">Contact the customer to discuss project requirements and proceed with the service.</p>
              </div>
              
              ${pdfPath ? '<p style="margin-top: 20px; padding: 15px; background: #f0f9ff; border-left: 4px solid #667eea; border-radius: 4px;"><strong>Note:</strong> A PDF receipt is attached to this email for your records.</p>' : ''}
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        New Pre-Registration Payment Received
        
        Payment Details:
        ============================================
        Customer Name: ${customerName || 'N/A'}
        Customer Email: ${customerEmail || 'N/A'}
        Customer Phone: ${customerPhone || 'N/A'}
        Service: ${serviceName || 'N/A'}
        Transaction ID: ${transactionId || merchantTransactionId || 'N/A'}
        Merchant Order ID: ${merchantTransactionId || 'N/A'}
        Amount: ₹${amountInRupees}
        Payment Date: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'long', timeStyle: 'short' })}
        
        ============================================
        
        Action Required: Contact the customer to discuss project requirements and proceed with the service.
      `,
    };

    // Attach PDF receipt if available
    if (pdfPath) {
      const fs = require('fs');
      if (fs.existsSync(pdfPath)) {
        mailOptions.attachments = [
          {
            filename: `receipt_${merchantTransactionId}.pdf`,
            path: pdfPath,
          },
        ];
      }
    }

    console.log(`📧 Sending admin email to ${mailOptions.to}...`);
    const emailResult = await transporter.sendMail(mailOptions);
    console.log(`📧 Admin email sent successfully. Message ID: ${emailResult.messageId}`);
    
    // Release the in-flight lock after successful send
    releaseInFlightLock(merchantTransactionId, 'admin');
    
    console.log('✅ Admin payment notification sent with PDF receipt');
    return true;
  } catch (error) {
    console.error('❌ Error sending admin payment notification:', error);
    releaseInFlightLock(merchantTransactionId, 'admin');
    return false;
  }
}

/**
 * Send payment failed email to customer
 */
export async function sendPaymentFailedEmail(customerEmail, customerName, paymentData) {
  const transporter = createEmailTransporter();
  if (!transporter) {
    console.warn('Email transporter not available. Skipping payment failed email.');
    return false;
  }

  try {
    const { transactionId, amount, serviceName, errorMessage } = paymentData;
    const amountInRupees = (amount / 100).toFixed(2);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: customerEmail,
      subject: 'Payment Failed - Action Required',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .error-icon { font-size: 48px; margin-bottom: 20px; }
            .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .detail-row:last-child { border-bottom: none; }
            .label { font-weight: bold; color: #666; }
            .value { color: #333; }
            .highlight { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; }
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
              <p>Unfortunately, your payment could not be processed. Please review the details below and try again.</p>
              
              <div class="details">
                <div class="detail-row">
                  <span class="label">Service:</span>
                  <span class="value">${serviceName || 'N/A'}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Transaction ID:</span>
                  <span class="value">${transactionId || 'N/A'}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Amount:</span>
                  <span class="value">₹${amountInRupees}</span>
                </div>
                ${errorMessage ? `
                <div class="detail-row">
                  <span class="label">Error:</span>
                  <span class="value">${errorMessage}</span>
                </div>
                ` : ''}
              </div>
              
              <div class="highlight">
                <h3 style="margin-top: 0; color: #dc2626;">What to do next?</h3>
                <p style="margin: 10px 0;">Please try making the payment again. If the issue persists, contact us for assistance.</p>
              </div>
              
              <p>If you have any questions or need help, please reach out to us at <a href="mailto:support@abhishek-chaudhary.com" style="color: #667eea;">support@abhishek-chaudhary.com</a>.</p>
              
              <div class="footer">
                <p>This is an automated email. Please do not reply directly to this message.</p>
                <p>&copy; ${new Date().getFullYear()} Abhishek Kumar Chaudhary. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Payment Failed
        
        Dear ${customerName},
        
        Unfortunately, your payment could not be processed.
        
        Payment Details:
        Service: ${serviceName || 'N/A'}
        Transaction ID: ${transactionId || 'N/A'}
        Amount: ₹${amountInRupees}
        ${errorMessage ? `Error: ${errorMessage}` : ''}
        
        What to do next?
        Please try making the payment again. If the issue persists, contact us for assistance.
        
        Best regards,
        Abhishek Kumar Chaudhary
        support@abhishek-chaudhary.com
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

    // Create a new PDFDocument
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();

    // Embed fonts
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Define colors
    const primaryColor = rgb(0.4, 0.46, 0.92); // #667eea
    const secondaryColor = rgb(0.06, 0.72, 0.5); // #10b981 (for success)
    const textColor = rgb(0.2, 0.2, 0.2); // #333
    const lightGray = rgb(0.9, 0.9, 0.9); // #eee
    const darkGray = rgb(0.4, 0.4, 0.4); // #666

    const { width, height } = page.getSize();
    let yPos = height - 50; // Start from top with margin

    // Header
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
      color: darkGray,
    });

    yPos -= 30;

    // Divider
    page.drawLine({
      start: { x: 50, y: yPos },
      end: { x: width - 50, y: yPos },
      thickness: 2,
      color: primaryColor,
    });

    yPos -= 40;

    // Receipt Details
    const drawLabelValue = (label, value, isMonospace = false, isStatus = false) => {
      const labelWidth = helveticaBoldFont.widthOfTextAtSize(label, 11);
      const valueFont = isMonospace ? helveticaFont : helveticaFont; // Use helvetica for monospace too
      const valueSize = isMonospace ? 10 : 11;
      const valueColor = isStatus ? secondaryColor : textColor;

      page.drawText(label, {
        x: 50,
        y: yPos,
        size: 11,
        font: helveticaBoldFont,
        color: darkGray,
      });

      const valueWidth = valueFont.widthOfTextAtSize(value, valueSize);
      page.drawText(value, {
        x: width - 50 - valueWidth,
        y: yPos,
        size: valueSize,
        font: valueFont,
        color: valueColor,
      });

      yPos -= 20;
    };

    drawLabelValue('Customer Name:', customerName || 'N/A');
    drawLabelValue('Service:', serviceName || 'N/A');
    drawLabelValue('Transaction ID:', transactionId || 'N/A', true);
    drawLabelValue('Merchant Order ID:', merchantTransactionId || 'N/A', true);
    drawLabelValue('Payment Date:', paymentDate);
    drawLabelValue('Payment Status:', 'COMPLETED', false, true); // Replaced emoji

    yPos -= 20;

    // Divider
    page.drawLine({
      start: { x: 50, y: yPos },
      end: { x: width - 50, y: yPos },
      thickness: 1,
      color: lightGray,
    });

    yPos -= 20;

    // Total Amount
    const totalLabel = 'Total Amount Paid:';
    const totalValue = `Rs. ${amount}`; // Replaced ₹
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
      page.drawLine({
        start: { x: 50, y: yPos },
        end: { x: width - 50, y: yPos },
        thickness: 2,
        color: primaryColor,
      });

      yPos -= 30;

      const projectDetailsHeader = 'Project Details';
      const projectDetailsHeaderWidth = helveticaBoldFont.widthOfTextAtSize(projectDetailsHeader, 14);
      page.drawText(projectDetailsHeader, {
        x: 50,
        y: yPos,
        size: 14,
        font: helveticaBoldFont,
        color: primaryColor,
      });

      yPos -= 20;

      // Text wrapping for customer message
      const textLines = customerMessage.split('\n');
      const maxWidth = width - 100;
      const fontSize = 11;
      
      for (const line of textLines) {
        // Manual text wrapping since splitTextIntoLines may not be available
        const words = line.split(' ');
        let currentLine = '';
        
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const testWidth = helveticaFont.widthOfTextAtSize(testLine, fontSize);
          
          if (testWidth > maxWidth && currentLine) {
            // Draw current line and start new one
            page.drawText(currentLine, {
              x: 50,
              y: yPos,
              size: fontSize,
              font: helveticaFont,
              color: textColor,
            });
            yPos -= 15;
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        
        // Draw remaining text
        if (currentLine) {
          page.drawText(currentLine, {
            x: 50,
            y: yPos,
            size: fontSize,
            font: helveticaFont,
            color: textColor,
          });
          yPos -= 15;
        }
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
      color: darkGray,
    });

    page.drawText(footerText2, {
      x: (width - footer2Width) / 2,
      y: footerY,
      size: 9,
      font: helveticaFont,
      color: darkGray,
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
