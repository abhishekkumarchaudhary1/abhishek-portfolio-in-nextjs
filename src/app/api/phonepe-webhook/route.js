import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * PhonePe Webhook Handler
 * 
 * This endpoint receives webhook notifications from PhonePe for various events
 * like payment completions, subscription redemptions, etc.
 * 
 * Webhook URL to configure in PhonePe Dashboard:
 * https://yourdomain.com/api/phonepe-webhook
 * 
 * For local testing, use ngrok or similar tool:
 * ngrok http 3000
 * Then use: https://your-ngrok-url.ngrok.io/api/phonepe-webhook
 * 
 * IMPORTANT: Salt Key Configuration
 * ==================================
 * The Salt Key is NOT always visible in PhonePe Business Dashboard.
 * 
 * To get your Salt Key:
 * 1. Contact PhonePe Support: support@phonepe.com
 * 2. Request "Salt Key and Salt Index for webhook integration"
 * 3. Include your Merchant ID in the request
 * 
 * The webhook works WITHOUT Salt Key for testing, but signature
 * verification will be disabled. For production, always enable
 * signature verification by setting PHONEPE_SALT_KEY.
 */

export async function POST(request) {
  try {
    // Get the raw body for signature verification
    const body = await request.text();
    const payload = JSON.parse(body);

    // Get headers for signature verification
    const headers = request.headers;
    const xVerify = headers.get('x-verify') || headers.get('X-Verify');
    const xMerchantId = headers.get('x-merchant-id') || headers.get('X-Merchant-Id');

    // Verify webhook signature (PhonePe sends signature in x-verify header)
    // Skip verification in development if salt key is not set (for testing)
    if (process.env.PHONEPE_SALT_KEY) {
      const isValid = verifyPhonePeSignature(
        body,
        xVerify,
        process.env.PHONEPE_SALT_KEY,
        process.env.PHONEPE_SALT_INDEX || '1'
      );

      if (!isValid) {
        console.error('Invalid PhonePe webhook signature');
        // In production, reject invalid signatures
        // In development, you might want to log and continue for testing
        if (process.env.NODE_ENV === 'production') {
          return NextResponse.json(
            { error: 'Invalid signature' },
            { status: 401 }
          );
        } else {
          console.warn('⚠️  Signature verification failed, but continuing in development mode');
        }
      }
    } else {
      console.warn('⚠️  PHONEPE_SALT_KEY not set - webhook signature verification is disabled');
    }

    // Extract event information
    const eventType = payload.event || payload.type || payload.eventType;
    const eventData = payload.data || payload;

    console.log('PhonePe Webhook Received:', {
      eventType,
      merchantId: xMerchantId,
      timestamp: new Date().toISOString(),
    });

    // Handle different event types
    switch (eventType) {
      case 'subscription.redemption.order.completed':
        await handleSubscriptionRedemptionCompleted(eventData);
        break;

      case 'PAYMENT_SUCCESS':
      case 'payment.success':
        await handlePaymentSuccess(eventData);
        break;

      case 'PAYMENT_FAILED':
      case 'payment.failed':
        await handlePaymentFailed(eventData);
        break;

      case 'PAYMENT_PENDING':
      case 'payment.pending':
        await handlePaymentPending(eventData);
        break;

      case 'REFUND_SUCCESS':
      case 'refund.success':
        await handleRefundSuccess(eventData);
        break;

      default:
        console.log('Unhandled event type:', eventType);
        // Still return success to acknowledge receipt
    }

    // Always return 200 OK to acknowledge receipt
    // PhonePe will retry if it doesn't receive a 200 response
    return NextResponse.json(
      { 
        success: true, 
        message: 'Webhook received and processed',
        eventType 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error processing PhonePe webhook:', error);
    
    // Return 200 even on error to prevent retries for malformed requests
    // Log the error for debugging
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error processing webhook',
        message: error.message 
      },
      { status: 200 }
    );
  }
}

/**
 * Verify PhonePe webhook signature
 * PhonePe uses SHA256 for signature verification
 * 
 * Signature format: SHA256(base64(payload) + /pg/v1/webhook/{saltKey} + saltIndex)
 * PhonePe sends signature in header as: {signature}###{saltIndex}
 * 
 * Note: PhonePe's exact signature format may vary. Check PhonePe documentation
 * and adjust this function if needed. Common variations:
 * - SHA256(payload + saltKey + saltIndex)
 * - SHA256(base64(payload) + /pg/v1/webhook/{saltKey} + saltIndex)
 * - HMAC-SHA256 with saltKey as secret
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

    // Try different signature calculation methods (PhonePe may use different formats)
    
    // Method 1: SHA256(payload + /pg/v1/webhook/{saltKey} + saltIndex)
    const method1 = crypto
      .createHash('sha256')
      .update(payload + `/pg/v1/webhook/${saltKey}` + receivedIndex)
      .digest('hex');

    // Method 2: SHA256(base64(payload) + /pg/v1/webhook/{saltKey} + saltIndex)
    const base64Payload = Buffer.from(payload).toString('base64');
    const method2 = crypto
      .createHash('sha256')
      .update(base64Payload + `/pg/v1/webhook/${saltKey}` + receivedIndex)
      .digest('hex');

    // Method 3: HMAC-SHA256 (like Razorpay)
    const method3 = crypto
      .createHmac('sha256', saltKey)
      .update(payload)
      .digest('hex');

    // Check if any method matches
    const isValid = 
      method1 === receivedSig || 
      method2 === receivedSig || 
      method3 === receivedSig;

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
async function handleSubscriptionRedemptionCompleted(data) {
  console.log('Subscription Redemption Completed:', data);
  
  // Extract relevant information
  const orderId = data.orderId || data.merchantTransactionId;
  const amount = data.amount || data.amountPaid;
  const userId = data.userId || data.customerId;
  const subscriptionId = data.subscriptionId;

  // TODO: Implement your business logic here
  // Examples:
  // 1. Update subscription status in database
  // 2. Send confirmation email to user
  // 3. Activate subscription benefits
  // 4. Update user records
  // 5. Trigger fulfillment process

  try {
    // Example: Save to database (implement your database logic)
    // await db.subscriptions.update({
    //   where: { id: subscriptionId },
    //   data: { status: 'active', redeemedAt: new Date() }
    // });

    // Example: Send email notification
    // await sendEmail({
    //   to: userEmail,
    //   subject: 'Subscription Activated',
    //   body: 'Your subscription has been successfully activated!'
    // });

    console.log(`Subscription redemption processed: Order ${orderId}, Amount: ${amount}`);
  } catch (error) {
    console.error('Error handling subscription redemption:', error);
    throw error;
  }
}

/**
 * Handle payment success event
 */
async function handlePaymentSuccess(data) {
  console.log('Payment Success:', data);
  
  const transactionId = data.transactionId || data.merchantTransactionId;
  const amount = data.amount;
  const paymentId = data.paymentId || data.phonepeTransactionId;

  // TODO: Implement your business logic
  // 1. Update order status to 'paid'
  // 2. Send confirmation email
  // 3. Trigger order fulfillment
  // 4. Update inventory if applicable

  console.log(`Payment successful: Transaction ${transactionId}, Amount: ${amount}`);
}

/**
 * Handle payment failed event
 */
async function handlePaymentFailed(data) {
  console.log('Payment Failed:', data);
  
  const transactionId = data.transactionId || data.merchantTransactionId;
  const reason = data.reason || data.failureReason;

  // TODO: Implement your business logic
  // 1. Update order status to 'failed'
  // 2. Send failure notification email
  // 3. Release reserved inventory
  // 4. Log failure reason for analysis

  console.log(`Payment failed: Transaction ${transactionId}, Reason: ${reason}`);
}

/**
 * Handle payment pending event
 */
async function handlePaymentPending(data) {
  console.log('Payment Pending:', data);
  
  const transactionId = data.transactionId || data.merchantTransactionId;

  // TODO: Implement your business logic
  // 1. Update order status to 'pending'
  // 2. Set up retry mechanism if needed
  // 3. Send pending notification

  console.log(`Payment pending: Transaction ${transactionId}`);
}

/**
 * Handle refund success event
 */
async function handleRefundSuccess(data) {
  console.log('Refund Success:', data);
  
  const transactionId = data.transactionId || data.merchantTransactionId;
  const refundId = data.refundId;
  const amount = data.refundAmount;

  // TODO: Implement your business logic
  // 1. Update order status to 'refunded'
  // 2. Send refund confirmation email
  // 3. Update accounting records
  // 4. Restore inventory if applicable

  console.log(`Refund processed: Transaction ${transactionId}, Amount: ${amount}`);
}

// Handle GET requests (for webhook verification/testing)
export async function GET(request) {
  return NextResponse.json({
    message: 'PhonePe Webhook Endpoint',
    status: 'active',
    timestamp: new Date().toISOString(),
    instructions: 'This endpoint accepts POST requests from PhonePe webhooks'
  });
}

