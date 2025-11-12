import { NextResponse } from 'next/server';
import { StandardCheckoutClient, Env } from 'pg-sdk-node';

/**
 * PhonePe Payment Verification using Official SDK
 * 
 * This endpoint verifies the payment status with PhonePe
 * using the SDK's getOrderStatus() method.
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

    console.log('PhonePe Verification Request:', {
      merchantTransactionId: merchantTransactionId,
      environment: environment,
      clientId: clientId ? `${clientId.substring(0, 4)}...${clientId.substring(clientId.length - 4)}` : 'NOT SET'
    });

    // Initialize PhonePe client
    const client = StandardCheckoutClient.getInstance(
      clientId,
      clientSecret,
      clientVersion,
      env
    );

    // Get order status using SDK
    let orderStatus;
    try {
      orderStatus = await client.getOrderStatus(merchantTransactionId);
      
      // Log full response for debugging
      console.log('PhonePe Order Status Response (Full):', JSON.stringify({
        state: orderStatus.state,
        orderId: orderStatus.order_id,
        amount: orderStatus.amount,
        paymentDetails: orderStatus.payment_details,
        paymentDetailsCount: orderStatus.payment_details?.length || 0
      }, null, 2));

    } catch (sdkError) {
      console.error('PhonePe SDK Error:', {
        error: sdkError.message,
        code: sdkError.code,
        httpStatusCode: sdkError.httpStatusCode,
        data: sdkError.data
      });

      // Handle SDK-specific errors
      let errorDetails = sdkError.message || 'Unknown SDK error';
      let suggestion = '';

      if (sdkError.httpStatusCode === 404) {
        errorDetails = 'Order not found. The merchant transaction ID may be incorrect.';
        suggestion = 'Please verify the transaction ID and try again.';
      } else if (sdkError.httpStatusCode === 401 || sdkError.httpStatusCode === 403) {
        errorDetails = 'Authentication failed. Invalid credentials.';
        suggestion = 'Please verify your PHONEPE_CLIENT_ID and PHONEPE_CLIENT_SECRET are correct.';
      }

      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to verify payment status',
          details: errorDetails,
          suggestion: suggestion,
          httpStatusCode: sdkError.httpStatusCode,
          errorCode: sdkError.code
        },
        { status: sdkError.httpStatusCode || 500 }
      );
    }

    // Get latest payment details if available
    let latestPayment = null;
    if (orderStatus.payment_details && orderStatus.payment_details.length > 0) {
      // Get the latest payment attempt (usually the last one)
      latestPayment = orderStatus.payment_details[orderStatus.payment_details.length - 1];
    }

    // Check payment status
    // According to PhonePe docs:
    // - order.state can be: PENDING, FAILED, COMPLETED
    // - payment_details[].state can be: PENDING, COMPLETED, FAILED
    // We should check BOTH order state AND payment details state
    
    // Check if order is completed
    const orderCompleted = orderStatus.state === 'COMPLETED';
    
    // Check if any payment detail is completed (not just the latest)
    let anyPaymentCompleted = false;
    if (orderStatus.payment_details && orderStatus.payment_details.length > 0) {
      anyPaymentCompleted = orderStatus.payment_details.some(
        payment => payment.state === 'COMPLETED'
      );
    }
    
    // Also check latest payment state
    const latestPaymentCompleted = latestPayment?.state === 'COMPLETED';
    
    // Payment is successful if:
    // 1. Order state is COMPLETED, OR
    // 2. Any payment detail state is COMPLETED
    const isSuccess = orderCompleted || anyPaymentCompleted || latestPaymentCompleted;
    
    // Check pending status (only if not completed)
    const orderPending = orderStatus.state === 'PENDING';
    const latestPaymentPending = latestPayment?.state === 'PENDING';
    const isPending = (orderPending || latestPaymentPending) && !isSuccess;
    
    // Check failed status (only if not completed)
    const orderFailed = orderStatus.state === 'FAILED';
    const latestPaymentFailed = latestPayment?.state === 'FAILED';
    const isFailed = (orderFailed || latestPaymentFailed) && !isSuccess;

    console.log('Payment Status Check:', {
      orderState: orderStatus.state,
      latestPaymentState: latestPayment?.state,
      anyPaymentCompleted,
      orderCompleted,
      isSuccess,
      isPending,
      isFailed,
      allPaymentStates: orderStatus.payment_details?.map(p => p.state) || []
    });

    return NextResponse.json({
      success: isSuccess,
      paymentStatus: orderStatus.state,
      orderId: orderStatus.order_id,
      merchantTransactionId: merchantTransactionId,
      amount: orderStatus.amount,
      expireAt: orderStatus.expire_at,
      metaInfo: orderStatus.metaInfo,
      // Include latest payment details if available
      transactionId: latestPayment?.transactionId,
      paymentMode: latestPayment?.paymentMode,
      paymentState: latestPayment?.state,
      paymentTimestamp: latestPayment?.timestamp,
      errorCode: latestPayment?.errorCode,
      detailedErrorCode: latestPayment?.detailedErrorCode,
      // Include all payment details
      paymentDetails: orderStatus.payment_details,
      // Additional status flags for frontend
      isPending: isPending,
      isFailed: isFailed,
      isCompleted: isSuccess
    });

  } catch (error) {
    console.error('Error verifying PhonePe payment:', error);
    console.error('Error stack:', error.stack);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to verify payment', 
        details: error.message || 'An unexpected error occurred',
        type: error.constructor.name
      },
      { status: 500 }
    );
  }
}
