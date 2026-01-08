import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
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
    
    // Generate PDF receipt
    const pdfPath = await generatePaymentReceiptPDF({
      customerName,
      transactionId: transactionId || merchantTransactionId,
      merchantTransactionId,
      amount: amountInRupees,
      serviceName,
      customerMessage,
      paymentDate: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'long', timeStyle: 'short' })
    });

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
        
        Note: Please keep this receipt for your records. A downloadable PDF receipt is attached to this email. You can use the Transaction ID for any payment-related queries.
        
        Best regards,
        Abhishek Kumar Chaudhary
      `,
      attachments: [
        {
          filename: `Payment_Receipt_${merchantTransactionId || transactionId}.pdf`,
          path: pdfPath
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    
    // Clean up PDF file after sending
    try {
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
    } catch (cleanupError) {
      console.warn('⚠️  Could not delete temporary PDF file:', cleanupError.message);
    }
    
    console.log(`✅ Payment success email sent to ${customerEmail} with PDF receipt`);
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
 * Generate PDF receipt for payment
 */
async function generatePaymentReceiptPDF(receiptData) {
  return new Promise((resolve, reject) => {
    try {
      const { customerName, transactionId, merchantTransactionId, amount, serviceName, customerMessage, paymentDate } = receiptData;
      
      // Create temporary file path
      const tempDir = os.tmpdir();
      const fileName = `receipt_${merchantTransactionId || transactionId}_${Date.now()}.pdf`;
      const filePath = path.join(tempDir, fileName);
      
      // Create PDF document
      const doc = new PDFDocument({ 
        size: 'A4',
        margin: 50,
        info: {
          Title: 'Payment Receipt',
          Author: 'Abhishek Kumar Chaudhary',
          Subject: 'Pre-Registration Payment Receipt'
        }
      });
      
      // Pipe to file
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      
      // Header
      doc.fontSize(24)
         .fillColor('#667eea')
         .text('PAYMENT RECEIPT', { align: 'center' });
      
      doc.moveDown(0.5);
      doc.fontSize(12)
         .fillColor('#666')
         .text('Pre-Registration Payment Confirmation', { align: 'center' });
      
      doc.moveDown(1);
      doc.strokeColor('#667eea')
         .lineWidth(2)
         .moveTo(50, doc.y)
         .lineTo(550, doc.y)
         .stroke();
      
      doc.moveDown(1.5);
      
      // Receipt Details
      doc.fontSize(11)
         .fillColor('#333');
      
      const leftMargin = 50;
      const rightMargin = 350;
      const lineHeight = 20;
      let yPos = doc.y;
      
      // Customer Name
      doc.fontSize(11)
         .fillColor('#666')
         .text('Customer Name:', leftMargin, yPos);
      doc.fillColor('#333')
         .text(customerName || 'N/A', rightMargin, yPos);
      yPos += lineHeight;
      
      // Service
      doc.fillColor('#666')
         .text('Service:', leftMargin, yPos);
      doc.fillColor('#333')
         .text(serviceName || 'N/A', rightMargin, yPos);
      yPos += lineHeight;
      
      // Transaction ID
      doc.fillColor('#666')
         .text('Transaction ID:', leftMargin, yPos);
      doc.fillColor('#333')
         .font('Courier')
         .fontSize(10)
         .text(transactionId || 'N/A', rightMargin, yPos);
      yPos += lineHeight;
      
      // Merchant Order ID
      doc.font('Helvetica')
         .fontSize(11)
         .fillColor('#666')
         .text('Merchant Order ID:', leftMargin, yPos);
      doc.fillColor('#333')
         .font('Courier')
         .fontSize(10)
         .text(merchantTransactionId || 'N/A', rightMargin, yPos);
      yPos += lineHeight;
      
      // Payment Date
      doc.font('Helvetica')
         .fontSize(11)
         .fillColor('#666')
         .text('Payment Date:', leftMargin, yPos);
      doc.fillColor('#333')
         .text(paymentDate, rightMargin, yPos);
      yPos += lineHeight;
      
      // Payment Status
      doc.fillColor('#666')
         .text('Payment Status:', leftMargin, yPos);
      doc.fillColor('#10b981')
         .text('✅ Completed', rightMargin, yPos);
      yPos += lineHeight + 10;
      
      // Divider
      doc.strokeColor('#eee')
         .lineWidth(1)
         .moveTo(leftMargin, yPos)
         .lineTo(550, yPos)
         .stroke();
      
      yPos += 15;
      
      // Total Amount
      doc.fontSize(16)
         .fillColor('#667eea')
         .font('Helvetica-Bold')
         .text('Total Amount Paid:', leftMargin, yPos);
      doc.text(`₹${amount}`, rightMargin, yPos);
      
      // Project Details (if available)
      if (customerMessage) {
        yPos += 40;
        doc.strokeColor('#667eea')
           .lineWidth(2)
           .moveTo(50, yPos)
           .lineTo(550, yPos)
           .stroke();
        
        yPos += 20;
        doc.fontSize(14)
           .fillColor('#667eea')
           .font('Helvetica-Bold')
           .text('Project Details', leftMargin, yPos);
        
        yPos += 20;
        doc.fontSize(11)
           .fillColor('#333')
           .font('Helvetica')
           .text(customerMessage, leftMargin, yPos, {
             width: 500,
             align: 'left'
           });
      }
      
      // Footer
      const footerY = 750;
      doc.fontSize(9)
         .fillColor('#999')
         .text('This is a computer-generated receipt.', 50, footerY, { align: 'center', width: 500 });
      doc.text('For any queries, please contact: support@abhishek-chaudhary.com', 50, footerY + 15, { align: 'center', width: 500 });
      
      // Finalize PDF
      doc.end();
      
      stream.on('finish', () => {
        resolve(filePath);
      });
      
      stream.on('error', (error) => {
        reject(error);
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

