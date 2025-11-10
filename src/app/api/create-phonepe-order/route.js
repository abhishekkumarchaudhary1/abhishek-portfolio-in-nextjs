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
    const missingVars = [];
    if (!process.env.PHONEPE_MERCHANT_ID) missingVars.push('PHONEPE_MERCHANT_ID');
    if (!process.env.PHONEPE_SALT_KEY) missingVars.push('PHONEPE_SALT_KEY');
    
    if (missingVars.length > 0) {
      console.error('Missing PhonePe environment variables:', missingVars);
      return NextResponse.json(
        { 
          error: 'PhonePe credentials not configured',
          details: `Missing environment variables: ${missingVars.join(', ')}. Please set these in your Vercel project settings.`,
          missingVariables: missingVars
        },
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
    let phonePeResponse;
    let responseData;
    
    try {
      console.log('Calling PhonePe API:', {
        url: `${baseUrl}/pg/v1/pay`,
        merchantId: merchantId,
        environment: environment,
        amount: amountInPaise
      });

      phonePeResponse = await fetch(`${baseUrl}/pg/v1/pay`, {
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

      responseData = await phonePeResponse.json();
      
      console.log('PhonePe API Response Status:', phonePeResponse.status);
      console.log('PhonePe API Response:', JSON.stringify(responseData).substring(0, 500));

    } catch (fetchError) {
      console.error('Error calling PhonePe API:', fetchError);
      return NextResponse.json(
        { 
          error: 'Failed to connect to PhonePe API',
          details: fetchError.message || 'Network error or PhonePe API is unavailable',
          suggestion: 'Please check your PhonePe credentials and ensure the API endpoint is correct.'
        },
        { status: 500 }
      );
    }

    if (!phonePeResponse.ok) {
      console.error('PhonePe API Error:', {
        status: phonePeResponse.status,
        statusText: phonePeResponse.statusText,
        response: responseData
      });
      
      // Handle specific PhonePe error messages
      let errorDetails = responseData.message || responseData.error || `HTTP ${phonePeResponse.status}: ${phonePeResponse.statusText}`;
      let suggestion = '';
      
      // Check for common PhonePe errors
      if (errorDetails.toLowerCase().includes('key not found') || 
          errorDetails.toLowerCase().includes('merchant') ||
          responseData.code === 'BAD_REQUEST') {
        suggestion = 'Please verify:\n1. Merchant ID is correct\n2. Salt Key matches the Merchant ID\n3. You are using SANDBOX credentials for SANDBOX environment (or PRODUCTION for PRODUCTION)\n4. Your PhonePe merchant account is activated';
        errorDetails = `PhonePe Authentication Error: ${errorDetails}`;
      }
      
      return NextResponse.json(
        { 
          error: 'PhonePe API returned an error',
          details: errorDetails,
          suggestion: suggestion,
          response: responseData,
          troubleshooting: {
            merchantId: merchantId ? `${merchantId.substring(0, 4)}...` : 'Not set',
            environment: environment,
            checkCredentials: 'Verify Merchant ID and Salt Key match and are for the correct environment (SANDBOX/PRODUCTION)'
          }
        },
        { status: phonePeResponse.status || 500 }
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
    console.error('Error stack:', error.stack);
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: 'Failed to parse request JSON. Please check the request format.',
          message: error.message
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to create payment order',
        details: error.message || 'An unexpected error occurred',
        type: error.constructor.name
      },
      { status: 500 }
    );
  }
}

