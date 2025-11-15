import { NextResponse } from 'next/server';
import { StandardCheckoutClient, Env, MetaInfo, StandardCheckoutPayRequest } from 'pg-sdk-node';
import { randomUUID } from 'crypto';
import { savePayment } from '../../utils/paymentStorage';

/**
 * PhonePe Payment Order Creation using Official SDK
 * 
 * This endpoint creates a payment order with PhonePe using the official SDK
 * and returns the payment URL to redirect the user to PhonePe's payment page.
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
    if (!process.env.PHONEPE_CLIENT_ID) missingVars.push('PHONEPE_CLIENT_ID');
    if (!process.env.PHONEPE_CLIENT_SECRET) missingVars.push('PHONEPE_CLIENT_SECRET');
    
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

    const clientId = process.env.PHONEPE_CLIENT_ID?.trim();
    const clientSecret = process.env.PHONEPE_CLIENT_SECRET?.trim();
    const clientVersion = parseFloat(process.env.PHONEPE_CLIENT_VERSION || '1.0.0');
    
    // Use sandbox for testing, production for live
    const environment = process.env.PHONEPE_ENVIRONMENT || 'SANDBOX';
    const env = environment === 'PRODUCTION' ? Env.PRODUCTION : Env.SANDBOX;

    // Debug logging (without exposing full secrets)
    console.log('PhonePe SDK Configuration:', {
      clientId: clientId ? `${clientId.substring(0, 4)}...${clientId.substring(clientId.length - 4)}` : 'NOT SET',
      clientIdLength: clientId?.length || 0,
      clientSecretLength: clientSecret?.length || 0,
      clientVersion: clientVersion,
      environment: environment,
      env: env === Env.PRODUCTION ? 'PRODUCTION' : 'SANDBOX'
    });

    // Generate unique merchant order ID
    const merchantOrderId = randomUUID();
    
    // Amount in paise (PhonePe expects amount in smallest currency unit)
    const amountInPaise = Math.round(parseFloat(amount));

    // Build redirect URL
    const redirectUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://abhishek-portfolio-in-nextjs.vercel.app'}/payment/success?transactionId=${merchantOrderId}`;

    // Create meta info with customer details (optional)
    const metaInfoBuilder = MetaInfo.builder();
    if (customerDetails?.name) metaInfoBuilder.udf1(customerDetails.name);
    if (customerDetails?.email) metaInfoBuilder.udf2(customerDetails.email);
    if (customerDetails?.phone) metaInfoBuilder.udf3(customerDetails.phone);
    if (serviceName) metaInfoBuilder.udf4(serviceName);
    if (serviceId) metaInfoBuilder.udf5(serviceId.toString());
    const metaInfo = metaInfoBuilder.build();

    // Create payment request using SDK
    const payRequest = StandardCheckoutPayRequest.builder()
      .merchantOrderId(merchantOrderId)
      .amount(amountInPaise)
      .redirectUrl(redirectUrl)
      .metaInfo(metaInfo)
      .build();

    // Initialize PhonePe client
    const client = StandardCheckoutClient.getInstance(
      clientId,
      clientSecret,
      clientVersion,
      env
    );

    console.log('PhonePe SDK Request:', {
      merchantOrderId: merchantOrderId,
      amount: amountInPaise,
      redirectUrl: redirectUrl,
      environment: environment
    });

    // Make payment request using SDK
    let paymentResponse;
    try {
      paymentResponse = await client.pay(payRequest);
      
      console.log('PhonePe SDK Response:', {
        success: !!paymentResponse.redirectUrl,
        hasRedirectUrl: !!paymentResponse.redirectUrl
      });

    } catch (sdkError) {
      console.error('PhonePe SDK Error:', {
        error: sdkError.message,
        stack: sdkError.stack,
        name: sdkError.constructor?.name
      });

      // Handle SDK-specific errors
      let errorDetails = sdkError.message || 'Unknown SDK error';
      let suggestion = '';

      if (errorDetails.toLowerCase().includes('authentication') || 
          errorDetails.toLowerCase().includes('invalid') ||
          errorDetails.toLowerCase().includes('key') ||
          errorDetails.toLowerCase().includes('credential')) {
        suggestion = `PhonePe SDK Authentication Error:\n\n` +
          `1. ✅ Client ID: Verify your Client ID is correct\n` +
          `   Current: ${clientId ? clientId.substring(0, 8) + '...' : 'NOT SET'}\n\n` +
          `2. ✅ Client Secret: Verify your Client Secret is correct\n` +
          `   Length: ${clientSecret?.length || 0} characters\n\n` +
          `3. ✅ Client Version: Usually 1.0.0\n` +
          `   Current: ${clientVersion}\n\n` +
          `4. ✅ Environment: Make sure credentials match environment\n` +
          `   Current: ${environment}\n\n` +
          `5. ✅ Account Status: Contact PhonePe support if account not activated`;
        errorDetails = `PhonePe SDK Error: ${errorDetails}`;
      }

      return NextResponse.json(
        { 
          error: 'PhonePe SDK returned an error',
          details: errorDetails,
          suggestion: suggestion,
          troubleshooting: {
            clientId: clientId ? `${clientId.substring(0, 4)}...` : 'Not set',
            environment: environment,
            clientVersion: clientVersion,
            checkCredentials: 'Verify Client ID and Client Secret are correct and match the environment (SANDBOX/PRODUCTION)'
          }
        },
        { status: 500 }
      );
    }

    // Extract payment URL from SDK response
    if (!paymentResponse || !paymentResponse.redirectUrl) {
      console.error('PhonePe SDK Response Error:', paymentResponse);
      return NextResponse.json(
        { 
          error: 'Failed to get payment URL from PhonePe',
          details: 'PhonePe SDK did not return a redirect URL',
          response: paymentResponse
        },
        { status: 500 }
      );
    }

    const paymentUrl = paymentResponse.redirectUrl;

    // Save initial payment record with customer details
    try {
      const environment = process.env.PHONEPE_ENVIRONMENT || 'SANDBOX';
      savePayment({
        merchantTransactionId: merchantOrderId,
        status: 'pending',
        amount: amountInPaise,
        serviceId: serviceId,
        serviceName: serviceName,
        customerName: customerDetails?.name,
        customerEmail: customerDetails?.email,
        customerPhone: customerDetails?.phone,
        customerMessage: customerDetails?.message,
        environment
      });
      console.log(`✅ Initial payment record saved: ${merchantOrderId}`);
    } catch (error) {
      console.error('⚠️  Error saving initial payment record:', error);
      // Don't fail the request if payment record save fails
    }

    return NextResponse.json({
      success: true,
      merchantTransactionId: merchantOrderId,
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
