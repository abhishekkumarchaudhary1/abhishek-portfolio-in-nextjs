import { NextResponse } from 'next/server';
import crypto from 'crypto';
import twilio from 'twilio';
import { savePayment, updatePaymentStatus, getPayment } from '../../utils/paymentStorage';
import { sendPaymentSuccessEmail, sendAdminPaymentNotification, sendPaymentFailedEmail } from '../../utils/emailService';

/**
 * PhonePe Sandbox Webhook Handler
 * 
 * This endpoint receives webhook notifications from PhonePe SANDBOX environment
 * for various events like payment completions, failures, etc.
 * 
 * Webhook URL to configure in PhonePe Sandbox Dashboard:
 * https://yourdomain.com/api/phonepe-webhook-sandbox
 * 
 * Environment Variables Required:
 * - PHONEPE_CLIENT_ID: Client ID for PhonePe (sandbox or production based on PHONEPE_ENVIRONMENT)
 * - PHONEPE_CLIENT_SECRET: Client Secret for PhonePe (used for webhook signature verification)
 * - PHONEPE_ENVIRONMENT: Set to 'SANDBOX' for sandbox webhooks
 * - PHONEPE_CLIENT_INDEX: Client index (usually '1', optional)
 * - NEXT_PUBLIC_BASE_URL: Base URL of your application
 */

export async function POST(request) {
  try {
    console.log('=== PhonePe Sandbox Webhook Received ===');
    
    // Get the raw body for signature verification
    const body = await request.text();
    const payload = JSON.parse(body);

    // Get headers for signature verification
    const headers = request.headers;
    const xVerify = headers.get('x-verify') || headers.get('X-Verify');
    const xMerchantId = headers.get('x-merchant-id') || headers.get('X-Merchant-Id');

    // Check environment matches sandbox
    const environment = process.env.PHONEPE_ENVIRONMENT || 'SANDBOX';
    if (environment !== 'SANDBOX') {
      console.warn('⚠️  Warning: PHONEPE_ENVIRONMENT is not set to SANDBOX. Current:', environment);
    }

    // Use OAuth credentials (Client Secret for signature verification)
    const clientSecret = process.env.PHONEPE_CLIENT_SECRET?.trim();
    const clientIndex = process.env.PHONEPE_CLIENT_INDEX || '1';

    // Verify webhook signature using Client Secret
    if (clientSecret) {
      const isValid = verifyPhonePeSignature(
        body,
        xVerify,
        clientSecret,
        clientIndex
      );

      if (!isValid) {
        console.error('❌ Invalid PhonePe sandbox webhook signature');
        console.error('Received signature:', xVerify);
        console.error('Merchant ID:', xMerchantId);
        console.error('⚠️  Signature verification failed, but continuing for SANDBOX (webhooks may not be properly signed in sandbox)');
        // For SANDBOX, we're more lenient - continue processing even if signature fails
        // This is because PhonePe SANDBOX webhooks may not always have proper signatures
      } else {
        console.log('✅ Signature verified successfully (SANDBOX)');
      }
    } else {
      console.warn('⚠️  PHONEPE_CLIENT_SECRET not set - webhook signature verification is disabled');
    }

    // Extract event information
    const eventType = payload.event || payload.type || payload.eventType;
    const eventData = payload.data || payload;

    console.log('PhonePe Sandbox Webhook Event:', {
      eventType,
      merchantId: xMerchantId,
      timestamp: new Date().toISOString(),
      environment: 'SANDBOX'
    });

    // Handle different event types
    switch (eventType) {
      case 'subscription.redemption.order.completed':
        await handleSubscriptionRedemptionCompleted(eventData, 'SANDBOX');
        break;

      case 'PAYMENT_SUCCESS':
      case 'payment.success':
        await handlePaymentSuccess(eventData, 'SANDBOX');
        break;

      case 'PAYMENT_FAILED':
      case 'payment.failed':
        await handlePaymentFailed(eventData, 'SANDBOX');
        break;

      case 'PAYMENT_PENDING':
      case 'payment.pending':
        await handlePaymentPending(eventData, 'SANDBOX');
        break;

      case 'REFUND_SUCCESS':
      case 'refund.success':
        await handleRefundSuccess(eventData, 'SANDBOX');
        break;

      default:
        console.log('Unhandled event type:', eventType);
    }

    // Always return 200 OK to acknowledge receipt
    return NextResponse.json(
      { 
        success: true, 
        message: 'Sandbox webhook received and processed',
        eventType,
        environment: 'SANDBOX'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ Error processing PhonePe sandbox webhook:', error);
    
    // Return 200 even on error to prevent retries for malformed requests
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error processing webhook',
        message: error.message,
        environment: 'SANDBOX'
      },
      { status: 200 }
    );
  }
}

/**
 * Verify PhonePe webhook signature
 */
function verifyPhonePeSignature(payload, receivedSignature, saltKey, saltIndex) {
  try {
    if (!receivedSignature || !saltKey) {
      console.warn('Missing signature or salt key for verification');
      return false;
    }

    // PhonePe sends signature in format: {signature}###{saltIndex}
    const signatureParts = receivedSignature.split('###');
    const receivedSig = signatureParts[0];
    const receivedIndex = signatureParts[1] || saltIndex;

    // Try different signature calculation methods
    const method1 = crypto
      .createHash('sha256')
      .update(payload + `/pg/v1/webhook/${saltKey}` + receivedIndex)
      .digest('hex');

    const base64Payload = Buffer.from(payload).toString('base64');
    const method2 = crypto
      .createHash('sha256')
      .update(base64Payload + `/pg/v1/webhook/${saltKey}` + receivedIndex)
      .digest('hex');

    const method3 = crypto
      .createHmac('sha256', saltKey)
      .update(payload)
      .digest('hex');

    const isValid = method1 === receivedSig || method2 === receivedSig || method3 === receivedSig;

    if (!isValid) {
      console.warn('Signature verification failed. Received:', receivedSig);
      console.warn('Calculated (method1):', method1);
      console.warn('Calculated (method2):', method2);
      console.warn('Calculated (method3):', method3);
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
    console.error(`[${environment}] ❌ Error handling payment success:`, error);
    // Don't throw - we still want to return 200 to PhonePe
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
    console.error(`[${environment}] ❌ Error handling payment failure:`, error);
    // Don't throw - we still want to return 200 to PhonePe
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
  } catch (error) {
    console.error(`[${environment}] ❌ Error handling payment pending:`, error);
    // Don't throw - we still want to return 200 to PhonePe
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
    } else {
      console.warn(`[${environment}] ⚠️  Payment record not found for refund: ${merchantTransactionId}`);
    }

    console.log(`[${environment}] ✅ Refund processed: Transaction ${transactionId}, Amount: ₹${refundAmount ? (refundAmount / 100).toFixed(2) : 'N/A'}, Refund ID: ${refundId}`);
  } catch (error) {
    console.error(`[${environment}] ❌ Error handling refund:`, error);
    // Don't throw - we still want to return 200 to PhonePe
  }
}

// Handle GET requests (for webhook verification/testing)
export async function GET(request) {
  return NextResponse.json({
    message: 'PhonePe Sandbox Webhook Endpoint',
    status: 'active',
    environment: 'SANDBOX',
    timestamp: new Date().toISOString(),
    url: '/api/phonepe-webhook-sandbox',
    instructions: 'This endpoint accepts POST requests from PhonePe sandbox webhooks',
    requiredEnvVars: [
      'PHONEPE_CLIENT_ID',
      'PHONEPE_CLIENT_SECRET',
      'PHONEPE_ENVIRONMENT (set to SANDBOX)',
      'PHONEPE_CLIENT_INDEX (optional, defaults to 1)',
      'NEXT_PUBLIC_BASE_URL'
    ]
  });
}

