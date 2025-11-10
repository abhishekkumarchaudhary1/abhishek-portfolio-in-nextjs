import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * PhonePe Payment Callback Handler
 * 
 * This endpoint receives callbacks from PhonePe after payment
 * is completed. PhonePe sends payment status updates here.
 */

export async function POST(request) {
  try {
    const body = await request.text();
    const payload = JSON.parse(body);

    // Get headers for signature verification
    const headers = request.headers;
    const xVerify = headers.get('x-verify') || headers.get('X-Verify');
    const xMerchantId = headers.get('x-merchant-id') || headers.get('X-Merchant-Id');

    // Verify signature if salt key is configured
    if (process.env.PHONEPE_SALT_KEY) {
      const saltKey = process.env.PHONEPE_SALT_KEY;
      const saltIndex = process.env.PHONEPE_SALT_INDEX || '1';
      
      // PhonePe callback signature verification
      const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const stringToHash = base64Payload + '/pg/v1/status/' + xMerchantId + saltKey;
      const sha256Hash = crypto.createHash('sha256').update(stringToHash).digest('hex');
      const expectedXVerify = sha256Hash + '###' + saltIndex;

      if (xVerify !== expectedXVerify) {
        console.error('Invalid PhonePe callback signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    // Extract payment information
    const merchantTransactionId = payload.data?.merchantTransactionId;
    const transactionId = payload.data?.transactionId;
    const amount = payload.data?.amount;
    const code = payload.code; // SUCCESS, PAYMENT_ERROR, etc.
    const state = payload.data?.state; // COMPLETED, PENDING, FAILED

    console.log('PhonePe Callback Received:', {
      merchantTransactionId,
      transactionId,
      amount,
      code,
      state,
      timestamp: new Date().toISOString()
    });

    // TODO: Update your database with payment status
    // Example:
    // await updateOrderStatus(merchantTransactionId, {
    //   status: state,
    //   transactionId: transactionId,
    //   amount: amount
    // });

    // Always return success to acknowledge receipt
    return NextResponse.json({
      success: true,
      message: 'Callback received'
    });

  } catch (error) {
    console.error('Error processing PhonePe callback:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 200 } // Return 200 to prevent retries
    );
  }
}

// Handle GET requests (for testing)
export async function GET(request) {
  return NextResponse.json({
    message: 'PhonePe Callback Endpoint',
    status: 'active'
  });
}

