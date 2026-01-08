import { NextResponse } from 'next/server';
import { StandardCheckoutClient, Env } from 'pg-sdk-node';
import { getPayment, updatePaymentStatus } from '../../utils/paymentStorage';
import { sendPaymentSuccessEmail, sendAdminPaymentNotification } from '../../utils/emailService';
import twilio from 'twilio';

/**
 * PhonePe Payment Verification using Official SDK
 * 
 * This endpoint verifies the payment status with PhonePe
 * using the SDK's getOrderStatus() method.
 */

export async function POST(request) {
  console.log('=== PhonePe Payment Verification Started ===');
  try {
    const requestBody = await request.json();
    console.log('Verification Request Body:', requestBody);
    
    const { merchantTransactionId } = requestBody;
    console.log('Merchant Transaction ID:', merchantTransactionId);

    if (!merchantTransactionId) {
      console.error('ERROR: Missing merchant transaction ID');
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

    console.log('=== PhonePe Verification Configuration ===');
    console.log('Merchant Transaction ID:', merchantTransactionId);
    console.log('Environment:', environment);
    console.log('Client ID:', clientId ? `${clientId.substring(0, 4)}...${clientId.substring(clientId.length - 4)}` : 'NOT SET');
    console.log('Client Secret Length:', clientSecret?.length || 0);
    console.log('Client Version:', clientVersion);

    // Initialize PhonePe client
    const client = StandardCheckoutClient.getInstance(
      clientId,
      clientSecret,
      clientVersion,
      env
    );

    // Get order status using SDK with retry logic
    // PhonePe sometimes needs a moment to process the order after payment
    console.log('=== Calling PhonePe SDK getOrderStatus ===');
    let orderStatus;
    let lastError = null;
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries}: Calling client.getOrderStatus with:`, merchantTransactionId);
        orderStatus = await client.getOrderStatus(merchantTransactionId);
        
        // If we get here, the call was successful
        console.log(`✅ Order status retrieved successfully on attempt ${attempt}`);
        break; // Exit retry loop
        
      } catch (sdkError) {
        lastError = sdkError;
        console.error(`Attempt ${attempt}/${maxRetries} failed:`, {
          error: sdkError.message,
          code: sdkError.code,
          httpStatusCode: sdkError.httpStatusCode
        });
        
        // If it's a 404 (ORDER_NOT_FOUND) and we have retries left, wait and retry
        if (sdkError.httpStatusCode === 404 && attempt < maxRetries) {
          console.log(`Order not found yet. Waiting ${retryDelay}ms before retry ${attempt + 1}...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue; // Retry
        } else {
          // For other errors or last attempt, break and handle error
          break;
        }
      }
    }
    
    // If we still don't have orderStatus, handle the error
    if (!orderStatus) {
      const sdkError = lastError;
      
      if (!sdkError) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Failed to verify payment status',
            details: 'No order status received and no error information available',
            suggestion: 'Please try again or contact support'
          },
          { status: 500 }
        );
      }
      
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
        // Check if we have a local payment record (might be pending webhook update)
        const localPayment = getPayment(merchantTransactionId);
        console.log('Order not found in PhonePe, checking local storage...');
        console.log('Local payment found:', !!localPayment);
        
        if (localPayment) {
          console.log('Local payment status:', localPayment.status);
          console.log('Local payment details:', {
            merchantTransactionId: localPayment.merchantTransactionId,
            status: localPayment.status,
            amount: localPayment.amount,
            environment: localPayment.environment
          });
          
          // If we have a local record, return it with a note that PhonePe verification failed
          // This allows the user to see their payment info even if PhonePe API is slow
          return NextResponse.json({
            success: localPayment.status === 'completed' || localPayment.status === 'success',
            paymentStatus: localPayment.paymentState || localPayment.status?.toUpperCase() || 'PENDING',
            orderId: localPayment.transactionId || merchantTransactionId,
            merchantTransactionId: merchantTransactionId,
            transactionId: localPayment.transactionId || merchantTransactionId,
            amount: localPayment.amount,
            serviceId: localPayment.serviceId,
            serviceName: localPayment.serviceName,
            customerName: localPayment.customerName,
            customerEmail: localPayment.customerEmail,
            customerPhone: localPayment.customerPhone,
            paymentMode: localPayment.paymentMode,
            paymentState: localPayment.paymentState || localPayment.status?.toUpperCase(),
            isPending: localPayment.status === 'pending',
            isFailed: localPayment.status === 'failed',
            isCompleted: localPayment.status === 'completed' || localPayment.status === 'success',
            warning: 'PhonePe verification temporarily unavailable. Using local payment record.',
            note: 'If payment was successful on PhonePe, it will be updated via webhook shortly.'
          });
        }
        
        errorDetails = 'ORDER_NOT_FOUND: The order was not found in PhonePe system.';
        suggestion = `This can happen if:\n\n` +
          `1. ⏱️  Timing Issue: PhonePe may need a few seconds to process the payment.\n` +
          `   - Try refreshing the page in 5-10 seconds\n` +
          `   - The payment might still be processing\n\n` +
          `2. 🔍 ID Mismatch: The transaction ID might not match.\n` +
          `   - Merchant Transaction ID used: ${merchantTransactionId}\n` +
          `   - Verify this matches the ID from the payment creation\n\n` +
          `3. 🌐 Environment Mismatch: Make sure you're checking the correct environment.\n` +
          `   - Current Environment: ${environment}\n` +
          `   - SANDBOX orders can only be verified in SANDBOX\n` +
          `   - PRODUCTION orders can only be verified in PRODUCTION\n\n` +
          `4. ✅ Payment Status: Check PhonePe Dashboard directly.\n` +
          `   - Log into PhonePe Merchant Dashboard\n` +
          `   - Look for the order with ID: ${merchantTransactionId}\n` +
          `   - Verify the payment status there\n\n` +
          `5. 🔄 Retry: The system already retried ${maxRetries} times.\n` +
          `   - If payment was successful on PhonePe, it should appear soon\n` +
          `   - Wait 30 seconds and refresh the page`;
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

    console.log('=== Payment Status Analysis ===');
    console.log('Order State:', orderStatus.state);
    console.log('Latest Payment State:', latestPayment?.state || 'N/A');
    console.log('Any Payment Completed:', anyPaymentCompleted);
    console.log('Order Completed:', orderCompleted);
    console.log('Latest Payment Completed:', latestPaymentCompleted);
    console.log('Final Success Status:', isSuccess);
    console.log('Is Pending:', isPending);
    console.log('Is Failed:', isFailed);
    console.log('All Payment States:', orderStatus.payment_details?.map(p => p.state) || []);

    // Get transaction ID from payment details
    // Try to get from completed payment first, then latest payment
    let transactionId = null;
    if (orderStatus.payment_details && orderStatus.payment_details.length > 0) {
      // First, try to find a completed payment's transaction ID
      const completedPayment = orderStatus.payment_details.find(
        payment => payment.state === 'COMPLETED'
      );
      if (completedPayment?.transactionId) {
        transactionId = completedPayment.transactionId;
        console.log('Found transaction ID from completed payment:', transactionId);
      } else if (latestPayment?.transactionId) {
        // Fallback to latest payment's transaction ID
        transactionId = latestPayment.transactionId;
        console.log('Found transaction ID from latest payment:', transactionId);
      } else {
        console.log('No transaction ID found in payment details. Available fields:', 
          latestPayment ? Object.keys(latestPayment) : 'No latest payment');
      }
    } else {
      console.log('No payment details available');
    }
    
    // Final fallback
    const finalTransactionId = transactionId || orderStatus.order_id || merchantTransactionId;
    console.log('=== Transaction ID Resolution ===');
    console.log('Extracted Transaction ID:', transactionId || 'Not found');
    console.log('Order ID (fallback):', orderStatus.order_id);
    console.log('Merchant Transaction ID (fallback):', merchantTransactionId);
    console.log('Final Transaction ID to return:', finalTransactionId);

    console.log('=== Preparing Response ===');
    const responseData = {
      success: isSuccess,
      paymentStatus: orderStatus.state,
      orderId: orderStatus.order_id,
      merchantTransactionId: merchantTransactionId,
      // Use transactionId from payment details, or fallback to orderId
      transactionId: finalTransactionId,
      amount: orderStatus.amount,
      expireAt: orderStatus.expire_at,
      metaInfo: orderStatus.metaInfo,
      // Include latest payment details if available
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
    };
    
    // If payment is successful, send notifications (as fallback if webhook didn't trigger)
    if (isSuccess) {
      try {
        // Get payment record to retrieve customer details
        const localPayment = getPayment(merchantTransactionId);
        
        if (localPayment) {
          const customerName = localPayment.customerName;
          const customerEmail = localPayment.customerEmail;
          const customerPhone = localPayment.customerPhone;
          const serviceName = localPayment.serviceName;
          const customerMessage = localPayment.customerMessage;
          
          // Check if emails were already sent (to avoid duplicates)
          const emailsSent = localPayment.emailsSent || false;
          
          if (!emailsSent && customerEmail && customerName) {
            console.log('📧 Sending payment notification emails (verification fallback)...');
            
            // Send customer confirmation email
            await sendPaymentSuccessEmail(customerEmail, customerName, {
              transactionId: finalTransactionId,
              merchantTransactionId: merchantTransactionId,
              amount: orderStatus.amount,
              serviceName: serviceName
            });
            
            // Send admin notification email
            await sendAdminPaymentNotification({
              customerName,
              customerEmail,
              customerPhone,
              transactionId: finalTransactionId,
              merchantTransactionId: merchantTransactionId,
              amount: orderStatus.amount,
              serviceName: serviceName,
              message: customerMessage
            });
            
            // Mark emails as sent
            updatePaymentStatus(merchantTransactionId, 'completed', { emailsSent: true });
            console.log('✅ Payment notification emails sent successfully');
            
            // Send SMS notification if Twilio is configured
            if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER && process.env.MY_PHONE_NUMBER) {
              try {
                const client = twilio(
                  process.env.TWILIO_ACCOUNT_SID,
                  process.env.TWILIO_AUTH_TOKEN
                );

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
                  const amountInRupees = (orderStatus.amount / 100).toFixed(2);
                  const smsMessage = `💰 New Payment Received!\n\nCustomer: ${customerName}\nService: ${serviceName}\nAmount: ₹${amountInRupees}\nTransaction ID: ${finalTransactionId || merchantTransactionId}\n\nContact: ${customerEmail || customerPhone || 'N/A'}`;

                  await client.messages.create({
                    body: smsMessage,
                    from: twilioPhone,
                    to: recipientPhone,
                  });

                  console.log('✅ SMS notification sent successfully');
                }
              } catch (smsError) {
                console.error('⚠️  Error sending SMS notification:', smsError.message || smsError);
                // Don't fail if SMS fails
              }
            }
          } else if (emailsSent) {
            console.log('ℹ️  Emails already sent for this payment (skipping to avoid duplicates)');
          }
        } else {
          console.log('⚠️  No local payment record found - cannot send notifications');
        }
      } catch (notificationError) {
        console.error('⚠️  Error sending payment notifications:', notificationError);
        // Don't fail the verification if notifications fail
      }
    }
    
    console.log('=== Final Response Data ===');
    console.log(JSON.stringify(responseData, null, 2));
    console.log('=== PhonePe Payment Verification Completed ===');
    
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('=== ERROR in PhonePe Verification ===');
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
