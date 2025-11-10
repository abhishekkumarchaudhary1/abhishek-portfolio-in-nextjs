import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * PhonePe Payment Order Creation
 * 
 * This endpoint creates a payment order with PhonePe and returns
 * the payment URL to redirect the user to PhonePe's payment page.
 */

export async function POST(request) {
  try {
    const { amount, serviceId, serviceName, customerDetails } = await request.json();

    if (!amount || amount < 1) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Check if PhonePe credentials are configured
    if (!process.env.PHONEPE_MERCHANT_ID || !process.env.PHONEPE_SALT_KEY) {
      return NextResponse.json(
        { error: 'PhonePe credentials not configured. Please set PHONEPE_MERCHANT_ID, PHONEPE_SALT_KEY, and PHONEPE_SALT_INDEX in your environment variables.' },
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

    // Generate unique transaction ID
    const merchantTransactionId = `TXN${Date.now()}_${serviceId || 'SERVICE'}`;
    
    // Amount in paise (PhonePe expects amount in smallest currency unit)
    const amountInPaise = Math.round(parseFloat(amount));

    // Create payload
    const payload = {
      merchantId: merchantId,
      merchantTransactionId: merchantTransactionId,
      amount: amountInPaise,
      merchantUserId: customerDetails?.email || `USER_${Date.now()}`,
      redirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://abhishek-portfolio-in-nextjs.vercel.app'}/payment/success?transactionId=${merchantTransactionId}`,
      redirectMode: 'REDIRECT',
      callbackUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://abhishek-portfolio-in-nextjs.vercel.app'}/api/phonepe-callback`,
      mobileNumber: customerDetails?.phone || '',
      paymentInstrument: {
        type: 'PAY_PAGE'
      }
    };

    // Convert payload to base64
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');

    // Generate X-VERIFY header (signature)
    // PhonePe signature: SHA256(base64Payload + /pg/v1/pay + saltKey) + ### + saltIndex
    const stringToHash = base64Payload + '/pg/v1/pay' + saltKey;
    const sha256Hash = crypto.createHash('sha256').update(stringToHash).digest('hex');
    const xVerify = sha256Hash + '###' + saltIndex;

    // Make API call to PhonePe
    const phonePeResponse = await fetch(`${baseUrl}/pg/v1/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-VERIFY': xVerify,
        'X-MERCHANT-ID': merchantId
      },
      body: JSON.stringify({
        request: base64Payload
      })
    });

    const responseData = await phonePeResponse.json();

    if (!phonePeResponse.ok) {
      console.error('PhonePe API Error:', responseData);
      return NextResponse.json(
        { error: 'Failed to create payment order', details: responseData.message || 'Unknown error' },
        { status: 500 }
      );
    }

    // PhonePe response structure: { success: true, code: 'PAYMENT_INITIATED', data: { ... } }
    // The data field contains base64 encoded response
    let paymentUrl;
    
    try {
      if (responseData.data) {
        // Decode the base64 response
        const decodedData = JSON.parse(Buffer.from(responseData.data, 'base64').toString());
        
        // Extract payment URL from decoded response
        if (decodedData.instrumentResponse?.redirectInfo?.url) {
          paymentUrl = decodedData.instrumentResponse.redirectInfo.url;
        } else if (decodedData.url) {
          paymentUrl = decodedData.url;
        } else if (typeof responseData.data === 'string' && responseData.data.startsWith('http')) {
          // Sometimes PhonePe returns URL directly
          paymentUrl = responseData.data;
        }
      }
      
      // Fallback: check if URL is in response directly
      if (!paymentUrl && responseData.url) {
        paymentUrl = responseData.url;
      }
      
      if (!paymentUrl) {
        throw new Error('Payment URL not found in response');
      }
    } catch (error) {
      console.error('Error parsing PhonePe response:', error);
      console.error('Response data:', responseData);
      return NextResponse.json(
        { error: 'Failed to parse payment response', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      merchantTransactionId: merchantTransactionId,
      paymentUrl: paymentUrl,
      amount: amountInPaise,
      serviceId: serviceId,
      serviceName: serviceName,
      customerDetails: customerDetails
    });

  } catch (error) {
    console.error('Error creating PhonePe order:', error);
    return NextResponse.json(
      { error: 'Failed to create payment order', details: error.message },
      { status: 500 }
    );
  }
}

