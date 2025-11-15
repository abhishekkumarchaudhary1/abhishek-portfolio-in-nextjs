import nodemailer from 'nodemailer';

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
    service: 'gmail',
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
    const { transactionId, amount, serviceName, merchantTransactionId } = paymentData;
    const amountInRupees = (amount / 100).toFixed(2);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: customerEmail,
      subject: `Payment Successful - Pre-Registration Confirmed`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .success-icon { font-size: 48px; margin-bottom: 20px; }
            .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .detail-row:last-child { border-bottom: none; }
            .label { font-weight: bold; color: #666; }
            .value { color: #333; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
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
              
              <div class="details">
                <div class="detail-row">
                  <span class="label">Service:</span>
                  <span class="value">${serviceName || 'N/A'}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Amount Paid:</span>
                  <span class="value">₹${amountInRupees}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Transaction ID:</span>
                  <span class="value">${transactionId || merchantTransactionId || 'N/A'}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Payment Date:</span>
                  <span class="value">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
                </div>
              </div>

              <p><strong>What's Next?</strong></p>
              <p>Your pre-registration has been confirmed. We will contact you shortly to discuss your project requirements and proceed with the service.</p>
              
              <p>If you have any questions, please feel free to reach out to us.</p>
              
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
        
        Service: ${serviceName || 'N/A'}
        Amount Paid: ₹${amountInRupees}
        Transaction ID: ${transactionId || merchantTransactionId || 'N/A'}
        Payment Date: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
        
        What's Next?
        Your pre-registration has been confirmed. We will contact you shortly to discuss your project requirements and proceed with the service.
        
        If you have any questions, please feel free to reach out to us.
        
        Best regards,
        Abhishek Kumar Chaudhary
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Payment success email sent to ${customerEmail}`);
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
      to: process.env.EMAIL_USER, // Send to yourself
      subject: `💰 New Pre-Registration Payment Received - ₹${amountInRupees}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .detail-row:last-child { border-bottom: none; }
            .label { font-weight: bold; color: #666; }
            .value { color: #333; }
            .highlight { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; }
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
                  <span class="value">${customerEmail || 'N/A'}</span>
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
                  <span class="value">${transactionId || merchantTransactionId || 'N/A'}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Merchant Order ID:</span>
                  <span class="value">${merchantTransactionId || 'N/A'}</span>
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

