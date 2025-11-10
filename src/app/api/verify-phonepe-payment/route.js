import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * PhonePe Payment Verification
 * 
 * This endpoint verifies the payment status with PhonePe
 * by checking the transaction status via PhonePe API.
 */

export async function POST(request) {
  try {
    const { merchantTransactionId } = await request.json();

    if (!merchantTransactionId) {
      return NextResponse.json(
        { error: 'Missing merchant transaction ID' },
        { status: 400 }
      );
    }

    // Check if PhonePe credentials are configured
    if (!process.env.PHONEPE_MERCHANT_ID || !process.env.PHONEPE_SALT_KEY) {
      return NextResponse.json(
        { error: 'PhonePe credentials not configured' },
        { status: 500 }
      );
    }

    const merchantId = process.env.PHONEPE_MERCHANT_ID;
    const saltKey = process.env.PHONEPE_SALT_KEY;
    const saltIndex = process.env.PHONEPE_SALT_INDEX || '1';
    
    // Use sandbox for testing, production for live
    const environment = process.env.PHONEPE_ENVIRONMENT || 'SANDBOX';
    const baseUrl = environment === 'PRODUCTION' 
      ? 'https://api.phonepe.com/apis/hermes'
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

    // Create payload for status check
    const payload = {
      merchantId: merchantId,
      merchantTransactionId: merchantTransactionId
    };

    // Convert payload to base64
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');

    // Generate X-VERIFY header (signature)
    // PhonePe signature: SHA256(base64Payload + /pg/v1/status/{merchantId} + saltKey) + ### + saltIndex
    const stringToHash = base64Payload + `/pg/v1/status/${merchantId}` + saltKey;
    const sha256Hash = crypto.createHash('sha256').update(stringToHash).digest('hex');
    const xVerify = sha256Hash + '###' + saltIndex;

    // Make API call to PhonePe to check payment status
    const phonePeResponse = await fetch(`${baseUrl}/pg/v1/status/${merchantId}/${merchantTransactionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-VERIFY': xVerify,
        'X-MERCHANT-ID': merchantId
      }
    });

    const responseData = await phonePeResponse.json();

    if (!phonePeResponse.ok) {
      console.error('PhonePe Status API Error:', responseData);
      return NextResponse.json(
        { success: false, error: 'Failed to verify payment status', details: responseData.message },
        { status: 500 }
      );
    }

    // Decode the response - PhonePe returns base64 encoded data
    let paymentInfo;
    try {
      if (responseData.data) {
        paymentInfo = JSON.parse(Buffer.from(responseData.data, 'base64').toString());
      } else {
        paymentInfo = responseData;
      }
    } catch (error) {
      console.error('Error decoding PhonePe response:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to decode payment response' },
        { status: 500 }
      );
    }

    // Check payment status - PhonePe uses different status codes
    const isSuccess = 
      (paymentInfo.state === 'COMPLETED' || paymentInfo.code === 'PAYMENT_SUCCESS') &&
      paymentInfo.code !== 'PAYMENT_ERROR' &&
      paymentInfo.code !== 'PAYMENT_DECLINED';

    return NextResponse.json({
      success: isSuccess,
      paymentStatus: paymentInfo.state,
      code: paymentInfo.code,
      transactionId: paymentInfo.transactionId,
      merchantTransactionId: paymentInfo.merchantTransactionId,
      amount: paymentInfo.amount,
      paymentInfo: paymentInfo
    });

  } catch (error) {
    console.error('Error verifying PhonePe payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify payment', details: error.message },
      { status: 500 }
    );
  }
}

