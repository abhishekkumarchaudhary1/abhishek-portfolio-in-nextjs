import { NextResponse } from 'next/server';
import crypto from 'crypto';
import twilio from 'twilio';
import { savePayment, updatePaymentStatus, getPayment } from '../../utils/paymentStorage';
import { sendPaymentSuccessEmail, sendAdminPaymentNotification, sendPaymentFailedEmail } from '../../utils/emailService';

/**
 * PhonePe Production Webhook Handler
 * 
 * This endpoint receives webhook notifications from PhonePe PRODUCTION environment
 * for various events like payment completions, failures, etc.
 * 
 * Webhook URL to configure in PhonePe Production Dashboard:
 * https://yourdomain.com/api/phonepe-webhook-production
 * 
 * IMPORTANT: This is for LIVE payments. Make sure:
 * 1. Signature verification is enabled and working
 * 2. All credentials are production credentials
 * 3. Proper error handling and logging is in place
 * 4. Database updates are transactional
 * 
 * Environment Variables Required:
 * - PHONEPE_CLIENT_ID: Client ID for PhonePe (production credentials)
 * - PHONEPE_CLIENT_SECRET: Client Secret for PhonePe (used for webhook signature verification)
 * - PHONEPE_ENVIRONMENT: Set to 'PRODUCTION' for production webhooks
 * - PHONEPE_CLIENT_INDEX: Client index (usually '1', optional)
 * - NEXT_PUBLIC_BASE_URL: Base URL of your application
 */

export async function POST(request) {
  try {
    console.log('=== PhonePe Production Webhook Received ===');
    
    // Get the raw body for signature verification
    const body = await request.text();
    const payload = JSON.parse(body);

    // Get headers for signature verification
    const headers = request.headers;
    const xVerify = headers.get('x-verify') || headers.get('X-Verify');
    const xMerchantId = headers.get('x-merchant-id') || headers.get('X-Merchant-Id');

    // Check environment matches production
    const environment = process.env.PHONEPE_ENVIRONMENT || 'SANDBOX';
    if (environment !== 'PRODUCTION') {
      console.error('❌ CRITICAL: PHONEPE_ENVIRONMENT is not set to PRODUCTION. Current:', environment);
      return NextResponse.json(
        { 
          error: 'Webhook configuration error', 
          environment: 'PRODUCTION',
          message: 'PHONEPE_ENVIRONMENT must be set to PRODUCTION for production webhooks'
        },
        { status: 500 }
      );
    }

    // Use OAuth credentials (Client Secret for signature verification)
    const clientSecret = process.env.PHONEPE_CLIENT_SECRET?.trim();
    const clientIndex = process.env.PHONEPE_CLIENT_INDEX || '1';

    // CRITICAL: Always verify signature in production
    if (!clientSecret) {
      console.error('❌ CRITICAL: PHONEPE_CLIENT_SECRET not set!');
      return NextResponse.json(
        { error: 'Webhook configuration error', environment: 'PRODUCTION' },
        { status: 500 }
      );
    }

    const isValid = verifyPhonePeSignature(
      body,
      xVerify,
      clientSecret,
      clientIndex
    );

    if (!isValid) {
      console.error('❌ CRITICAL: Invalid PhonePe production webhook signature');
      console.error('Received signature:', xVerify);
      console.error('Merchant ID:', xMerchantId);
      console.error('Timestamp:', new Date().toISOString());
      
      // Always reject invalid signatures in production
      return NextResponse.json(
        { 
          error: 'Invalid signature', 
          environment: 'PRODUCTION',
          message: 'Webhook signature verification failed'
        },
        { status: 401 }
      );
    }

    console.log('✅ Signature verified successfully (PRODUCTION)');

    // Extract event information
    const eventType = payload.event || payload.type || payload.eventType;
    const eventData = payload.data || payload;

    console.log('PhonePe Production Webhook Event:', {
      eventType,
      merchantId: xMerchantId,
      timestamp: new Date().toISOString(),
      environment: 'PRODUCTION'
    });

    // Handle different event types
    switch (eventType) {
      case 'subscription.redemption.order.completed':
        await handleSubscriptionRedemptionCompleted(eventData, 'PRODUCTION');
        break;

      case 'PAYMENT_SUCCESS':
      case 'payment.success':
        await handlePaymentSuccess(eventData, 'PRODUCTION');
        break;

      case 'PAYMENT_FAILED':
      case 'payment.failed':
        await handlePaymentFailed(eventData, 'PRODUCTION');
        break;

      case 'PAYMENT_PENDING':
      case 'payment.pending':
        await handlePaymentPending(eventData, 'PRODUCTION');
        break;

      case 'REFUND_SUCCESS':
      case 'refund.success':
        await handleRefundSuccess(eventData, 'PRODUCTION');
        break;

      default:
        console.log('Unhandled event type:', eventType);
    }

    // Always return 200 OK to acknowledge receipt
    return NextResponse.json(
      { 
        success: true, 
        message: 'Production webhook received and processed',
        eventType,
        environment: 'PRODUCTION'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ CRITICAL Error processing PhonePe production webhook:', error);
    console.error('Error stack:', error.stack);
    
    // In production, we still return 200 to prevent retries for malformed requests
    // But log everything for investigation
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error processing webhook',
        message: error.message,
        environment: 'PRODUCTION'
      },
      { status: 200 }
    );
  }
}

/**
 * Verify PhonePe webhook signature using OAuth Client Secret
 * PhonePe OAuth webhooks use Client Secret for signature verification
 */
function verifyPhonePeSignature(payload, receivedSignature, clientSecret, clientIndex) {
  try {
    if (!receivedSignature || !clientSecret) {
      console.warn('Missing signature or client secret for verification');
      return false;
    }

    // PhonePe sends signature in format: {signature}###{index}
    const signatureParts = receivedSignature.split('###');
    const receivedSig = signatureParts[0];
    const receivedIndex = signatureParts[1] || clientIndex;

    // Try different signature calculation methods (PhonePe OAuth webhook signatures)
    // Method 1: SHA256(payload + /pg/v1/webhook/{clientSecret} + index)
    const method1 = crypto
      .createHash('sha256')
      .update(payload + `/pg/v1/webhook/${clientSecret}` + receivedIndex)
      .digest('hex');

    // Method 2: SHA256(base64(payload) + /pg/v1/webhook/{clientSecret} + index)
    const base64Payload = Buffer.from(payload).toString('base64');
    const method2 = crypto
      .createHash('sha256')
      .update(base64Payload + `/pg/v1/webhook/${clientSecret}` + receivedIndex)
      .digest('hex');

    // Method 3: HMAC-SHA256 with clientSecret as secret
    const method3 = crypto
      .createHmac('sha256', clientSecret)
      .update(payload)
      .digest('hex');

    // Method 4: SHA256(payload + clientSecret + index)
    const method4 = crypto
      .createHash('sha256')
      .update(payload + clientSecret + receivedIndex)
      .digest('hex');

    const isValid = method1 === receivedSig || method2 === receivedSig || method3 === receivedSig || method4 === receivedSig;

    if (!isValid) {
      console.warn('Signature verification failed. Received:', receivedSig);
      console.warn('Calculated (method1):', method1);
      console.warn('Calculated (method2):', method2);
      console.warn('Calculated (method3):', method3);
      console.warn('Calculated (method4):', method4);
    }

    return isValid;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Handle subscription redemption order completed event
 */
async function handleSubscriptionRedemptionCompleted(data, environment) {
  console.log(`[${environment}] Subscription Redemption Completed:`, data);
  
  const orderId = data.orderId || data.merchantTransactionId;
  const amount = data.amount || data.amountPaid;

  // TODO: Implement your business logic here
  // Save to database, send emails, etc.
  // IMPORTANT: Use transactions for database operations in production

  console.log(`[${environment}] Subscription redemption processed: Order ${orderId}, Amount: ${amount}`);
}

/**
 * Handle payment success event
 */
async function handlePaymentSuccess(data, environment) {
  console.log(`[${environment}] Payment Success:`, data);
  
  try {
    const transactionId = data.transactionId || data.phonepeTransactionId;
    const merchantTransactionId = data.merchantTransactionId || data.orderId;
    const amount = data.amount;
    const paymentId = data.paymentId || data.phonepeTransactionId;
    const paymentMode = data.paymentMode;
    
    // Get existing payment record if available
    let payment = getPayment(merchantTransactionId);
    
    // Extract customer details from payment record or webhook data
    const customerName = payment?.customerName || data.customerName || data.name;
    const customerEmail = payment?.customerEmail || data.customerEmail || data.email;
    const customerPhone = payment?.customerPhone || data.customerPhone || data.phone;
    const serviceName = payment?.serviceName || data.serviceName;
    const serviceId = payment?.serviceId || data.serviceId;
    const customerMessage = payment?.customerMessage || data.message;

    // Update or create payment record
    const paymentData = {
      merchantTransactionId,
      transactionId,
      status: 'completed',
      amount,
      serviceId,
      serviceName,
      customerName,
      customerEmail,
      customerPhone,
      customerMessage,
      paymentMode,
      paymentState: 'COMPLETED',
      environment
    };

    payment = savePayment(paymentData);
    console.log(`[${environment}] ✅ Payment record saved: ${merchantTransactionId}`);

    // Send confirmation email to customer
    if (customerEmail && customerName) {
      await sendPaymentSuccessEmail(customerEmail, customerName, {
        transactionId,
        merchantTransactionId,
        amount,
        serviceName
      });
    }

    // Send notification to admin
    await sendAdminPaymentNotification({
      customerName,
      customerEmail,
      customerPhone,
      transactionId,
      merchantTransactionId,
      amount,
      serviceName,
      message: customerMessage
    });

    // Send SMS notification if Twilio is configured
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER && process.env.MY_PHONE_NUMBER) {
      try {
        const client = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );

        // Format phone numbers to E.164 format
        const formatPhoneNumber = (phone) => {
          if (!phone) return null;
          let formatted = phone.replace(/[\s\-\(\)]/g, '');
          if (!formatted.startsWith('+')) {
            formatted = '+' + formatted;
          }
          return formatted;
        };

        const twilioPhone = formatPhoneNumber(process.env.TWILIO_PHONE_NUMBER);
        const recipientPhone = formatPhoneNumber(process.env.MY_PHONE_NUMBER);

        if (twilioPhone && recipientPhone && /^\+[1-9]\d{1,14}$/.test(twilioPhone) && /^\+[1-9]\d{1,14}$/.test(recipientPhone)) {
          const amountInRupees = (amount / 100).toFixed(2);
          const smsMessage = `💰 New Payment Received!\n\nCustomer: ${customerName}\nService: ${serviceName}\nAmount: ₹${amountInRupees}\nTransaction ID: ${transactionId || merchantTransactionId}\n\nContact: ${customerEmail || customerPhone || 'N/A'}`;

          await client.messages.create({
            body: smsMessage,
            from: twilioPhone,
            to: recipientPhone,
          });

          console.log(`[${environment}] ✅ SMS notification sent to ${recipientPhone}`);
        }
      } catch (smsError) {
        console.error(`[${environment}] ⚠️  Error sending SMS notification:`, smsError.message || smsError);
        // Don't fail the webhook if SMS fails
      }
    }

    console.log(`[${environment}] ✅ Payment successful: Transaction ${transactionId}, Amount: ₹${(amount / 100).toFixed(2)}, Payment ID: ${paymentId}`);
  } catch (error) {
    console.error(`[${environment}] ❌ CRITICAL Error handling payment success:`, error);
    // In production, we log but don't throw to prevent webhook retries
    // Consider implementing a retry mechanism or dead letter queue
  }
}

/**
 * Handle payment failed event
 */
async function handlePaymentFailed(data, environment) {
  console.log(`[${environment}] Payment Failed:`, data);
  
  try {
    const transactionId = data.transactionId || data.phonepeTransactionId;
    const merchantTransactionId = data.merchantTransactionId || data.orderId;
    const reason = data.reason || data.failureReason || data.errorCode || 'Payment failed';
    const amount = data.amount;
    const errorCode = data.errorCode || data.detailedErrorCode;

    // Get existing payment record if available
    let payment = getPayment(merchantTransactionId);
    
    // Extract customer details
    const customerName = payment?.customerName || data.customerName || data.name;
    const customerEmail = payment?.customerEmail || data.customerEmail || data.email;
    const serviceName = payment?.serviceName || data.serviceName;

    // Update payment status
    updatePaymentStatus(merchantTransactionId, 'failed', {
      transactionId,
      errorCode,
      failureReason: reason,
      paymentState: 'FAILED',
      updatedAt: new Date().toISOString()
    });

    console.log(`[${environment}] ✅ Payment status updated to failed: ${merchantTransactionId}`);

    // Send failure notification email to customer
    if (customerEmail && customerName) {
      await sendPaymentFailedEmail(customerEmail, customerName, {
        transactionId,
        reason,
        serviceName
      });
    }

    console.log(`[${environment}] ✅ Payment failed: Transaction ${transactionId}, Reason: ${reason}`);
  } catch (error) {
    console.error(`[${environment}] ❌ CRITICAL Error handling payment failure:`, error);
    // In production, we log but don't throw to prevent webhook retries
  }
}

/**
 * Handle payment pending event
 */
async function handlePaymentPending(data, environment) {
  console.log(`[${environment}] Payment Pending:`, data);
  
  try {
    const transactionId = data.transactionId || data.phonepeTransactionId;
    const merchantTransactionId = data.merchantTransactionId || data.orderId;
    const amount = data.amount;

    // Update payment status to pending
    updatePaymentStatus(merchantTransactionId, 'pending', {
      transactionId,
      paymentState: 'PENDING',
      updatedAt: new Date().toISOString()
    });

    console.log(`[${environment}] ✅ Payment status updated to pending: ${merchantTransactionId}`);
    console.log(`[${environment}] Payment pending: Transaction ${transactionId}, Amount: ₹${amount ? (amount / 100).toFixed(2) : 'N/A'}`);
    
    // TODO: Set up monitoring/retry mechanism if needed
    // Consider implementing a job queue to check pending payments periodically
  } catch (error) {
    console.error(`[${environment}] ❌ CRITICAL Error handling payment pending:`, error);
    // In production, we log but don't throw to prevent webhook retries
  }
}

/**
 * Handle refund success event
 */
async function handleRefundSuccess(data, environment) {
  console.log(`[${environment}] Refund Success:`, data);
  
  try {
    const transactionId = data.transactionId || data.phonepeTransactionId;
    const merchantTransactionId = data.merchantTransactionId || data.orderId;
    const refundId = data.refundId;
    const refundAmount = data.refundAmount || data.amount;

    // Get existing payment record
    const payment = getPayment(merchantTransactionId);
    
    if (payment) {
      // Update payment status to refunded
      updatePaymentStatus(merchantTransactionId, 'refunded', {
        refundId,
        refundAmount,
        refundedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      console.log(`[${environment}] ✅ Payment status updated to refunded: ${merchantTransactionId}`);
      
      // TODO: Send refund confirmation email to customer if needed
      // if (payment.customerEmail) {
      //   await sendRefundConfirmationEmail(payment.customerEmail, payment.customerName, {
      //     transactionId,
      //     refundId,
      //     refundAmount
      //   });
      // }
      
      // TODO: Update accounting records
      // TODO: Log refund for audit trail
    } else {
      console.warn(`[${environment}] ⚠️  Payment record not found for refund: ${merchantTransactionId}`);
    }

    console.log(`[${environment}] ✅ Refund processed: Transaction ${transactionId}, Amount: ₹${refundAmount ? (refundAmount / 100).toFixed(2) : 'N/A'}, Refund ID: ${refundId}`);
  } catch (error) {
    console.error(`[${environment}] ❌ CRITICAL Error handling refund:`, error);
    // In production, we log but don't throw to prevent webhook retries
  }
}

// Handle GET requests (for webhook verification/testing)
export async function GET(request) {
  const hasClientSecret = !!process.env.PHONEPE_CLIENT_SECRET;
  const environment = process.env.PHONEPE_ENVIRONMENT || 'SANDBOX';
  const isProduction = environment === 'PRODUCTION';
  
  return NextResponse.json({
    message: 'PhonePe Production Webhook Endpoint',
    status: (hasClientSecret && isProduction) ? 'configured' : 'missing_credentials',
    environment: 'PRODUCTION',
    currentEnvironment: environment,
    timestamp: new Date().toISOString(),
    url: '/api/phonepe-webhook-production',
    instructions: 'This endpoint accepts POST requests from PhonePe production webhooks',
    requiredEnvVars: [
      'PHONEPE_CLIENT_ID',
      'PHONEPE_CLIENT_SECRET',
      'PHONEPE_ENVIRONMENT (set to PRODUCTION)',
      'PHONEPE_CLIENT_INDEX (optional, defaults to 1)',
      'NEXT_PUBLIC_BASE_URL'
    ],
    warning: (hasClientSecret && isProduction)
      ? 'Production credentials are configured' 
      : '⚠️ Production credentials not found. Please set PHONEPE_CLIENT_SECRET and PHONEPE_ENVIRONMENT=PRODUCTION'
  });
}

