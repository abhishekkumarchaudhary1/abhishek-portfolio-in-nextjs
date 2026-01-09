import { NextResponse } from 'next/server';
import { StandardCheckoutClient, Env } from 'pg-sdk-node';
import { getPayment, updatePaymentStatus, trySetEmailsSent } from '../../utils/paymentStorage';
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
    
    // Extract orderId (OMO...) - PhonePe uses camelCase 'orderId', not snake_case 'order_id'
    const phonePeOrderId = orderStatus.orderId || orderStatus.order_id;
    
    // Final fallback for transaction ID (prefer OMO... orderId)
    const finalTransactionId = phonePeOrderId || transactionId || merchantTransactionId;
    console.log('=== Transaction ID Resolution ===');
    console.log('PhonePe Order ID (OMO...):', phonePeOrderId || 'Not found');
    console.log('Extracted Transaction ID:', transactionId || 'Not found');
    console.log('Merchant Transaction ID (fallback):', merchantTransactionId);
    console.log('Final Transaction ID to return:', finalTransactionId);

    console.log('=== Preparing Response ===');
    const responseData = {
      success: isSuccess,
      paymentStatus: orderStatus.state,
      orderId: phonePeOrderId, // OMO... ID from PhonePe
      merchantTransactionId: merchantTransactionId,
      // Use orderId (OMO...) as primary transaction ID
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
        console.log('📧 Payment successful - Checking for notification sending...');
        
        // Get payment record to retrieve customer details
        const localPayment = getPayment(merchantTransactionId);
        
        console.log('📋 Local payment record:', {
          found: !!localPayment,
          hasCustomerName: !!localPayment?.customerName,
          hasCustomerEmail: !!localPayment?.customerEmail,
          hasServiceName: !!localPayment?.serviceName,
          emailsSent: localPayment?.emailsSent
        });
        
        if (localPayment) {
          const customerName = localPayment.customerName;
          const customerEmail = localPayment.customerEmail;
          const customerPhone = localPayment.customerPhone;
          const serviceName = localPayment.serviceName;
          const customerMessage = localPayment.customerMessage;
          
          // Atomically try to set emailsSent flag (only one process can succeed)
          // This prevents race conditions where both webhook and verification try to send emails
          const canSendEmails = trySetEmailsSent(merchantTransactionId);
          
          console.log('📧 Email sending check:', {
            canSendEmails,
            hasCustomerEmail: !!customerEmail,
            hasCustomerName: !!customerName,
            willSend: customerEmail && customerName && canSendEmails
          });
          
          // Send emails only if we successfully set the flag (atomic operation prevents duplicates)
          if (customerEmail && customerName && canSendEmails) {
            // Update status to completed
            updatePaymentStatus(merchantTransactionId, 'completed', {});
            console.log('📧 Got permission to send emails (atomic lock acquired)');
            
            console.log('📧 Sending payment notification emails (verification fallback)...');
            console.log('📧 Customer details:', {
              name: customerName,
              email: customerEmail,
              phone: customerPhone,
              service: serviceName
            });
            
            try {
              console.log('📧 Attempting to send customer email to:', customerEmail);
              // Send customer confirmation email
              const customerEmailResult = await sendPaymentSuccessEmail(customerEmail, customerName, {
                transactionId: finalTransactionId,
                merchantTransactionId: merchantTransactionId,
                amount: orderStatus.amount,
                serviceName: serviceName,
                customerMessage: customerMessage
              });
              // sendPaymentSuccessEmail returns the PDF path (or true if no PDF)
              const pdfPath = typeof customerEmailResult === 'string' ? customerEmailResult : null;
              console.log('📧 Customer email sent:', customerEmailResult ? 'SUCCESS' : 'FAILED');
              
              console.log('📧 Attempting to send admin notification emails...');
              // Send admin notification email (with PDF receipt attachment)
              const adminEmailResult = await sendAdminPaymentNotification({
                customerName,
                customerEmail,
                customerPhone,
                transactionId: finalTransactionId,
                merchantTransactionId: merchantTransactionId,
                amount: orderStatus.amount,
                serviceName: serviceName,
                message: customerMessage,
                pdfPath // Include PDF path for attachment
              });
              console.log('📧 Admin email sent:', adminEmailResult ? 'SUCCESS' : 'FAILED');
              
              // Clean up PDF file after both emails are sent
              if (pdfPath) {
                try {
                  const fs = require('fs');
                  if (fs.existsSync(pdfPath)) {
                    fs.unlinkSync(pdfPath);
                    console.log('🗑️  Temporary PDF file cleaned up:', pdfPath);
                  }
                } catch (cleanupError) {
                  console.warn('⚠️  Could not delete temporary PDF file:', cleanupError.message);
                }
              }
              
              // Emails already marked as sent above (before sending to prevent race conditions)
              if (customerEmailResult && adminEmailResult) {
                console.log('✅ Payment notification emails sent successfully');
              } else {
                console.log('⚠️  Some emails failed to send, but emailsSent flag already set to prevent duplicates');
              }
            } catch (emailError) {
              console.error('❌ Error sending emails:', emailError);
              console.error('❌ Email error details:', {
                message: emailError.message,
                stack: emailError.stack,
                name: emailError.name
              });
              // Don't throw - we want verification to succeed even if emails fail
            }
            
            // Send SMS notification if Twilio is configured (same pattern as contact form)
            console.log('📱 Checking Twilio configuration for SMS (verification endpoint)...');
            console.log('Twilio Account SID:', process.env.TWILIO_ACCOUNT_SID ? 'Present' : 'Missing');
            console.log('Twilio Auth Token:', process.env.TWILIO_AUTH_TOKEN ? 'Present' : 'Missing');
            console.log('Twilio Phone Number:', process.env.TWILIO_PHONE_NUMBER || 'Missing');
            console.log('My Phone Number:', process.env.MY_PHONE_NUMBER || 'Missing');
            console.log('Customer Phone:', customerPhone || 'Not provided');
            
            // Send admin SMS first (same as contact form - requires MY_PHONE_NUMBER)
            if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER && process.env.MY_PHONE_NUMBER) {
              try {
                const client = twilio(
                  process.env.TWILIO_ACCOUNT_SID,
                  process.env.TWILIO_AUTH_TOKEN
                );

                // Format phone numbers to E.164 format (same as contact form)
                const formatPhoneNumber = (phone) => {
                  if (!phone) return null;
                  // Remove all spaces, dashes, and parentheses
                  let formatted = phone.replace(/[\s\-\(\)]/g, '');
                  
                  // If already has country code, just ensure it has +
                  if (!formatted.startsWith('+')) {
                    // If it's a 10-digit Indian number, add +91
                    if (formatted.length === 10 && /^[6-9]\d{9}$/.test(formatted)) {
                      formatted = '+91' + formatted;
                    } else {
                      // Otherwise just add +
                      formatted = '+' + formatted;
                    }
                  }
                  return formatted;
                };

                const twilioPhone = formatPhoneNumber(process.env.TWILIO_PHONE_NUMBER);
                const recipientPhone = formatPhoneNumber(process.env.MY_PHONE_NUMBER);
                
                console.log('📱 Formatted Twilio Phone:', twilioPhone);
                console.log('📱 Formatted Admin Phone:', recipientPhone);

                if (!twilioPhone || !recipientPhone) {
                  throw new Error('Invalid phone number format');
                }

                // Validate phone number format (same as contact form)
                if (!/^\+[1-9]\d{1,14}$/.test(twilioPhone)) {
                  throw new Error(`Invalid Twilio phone number format: ${twilioPhone}. Must be in E.164 format (e.g., +1234567890)`);
                }

                if (!/^\+[1-9]\d{1,14}$/.test(recipientPhone)) {
                  throw new Error(`Invalid recipient phone number format: ${recipientPhone}. Must be in E.164 format (e.g., +919876543210)`);
                }

                // Send SMS to admin (your number - should always work)
                const amountInRupees = (orderStatus.amount / 100).toFixed(2);
                const smsMessage = `💰 New Payment Received!\n\nCustomer: ${customerName}\nService: ${serviceName}\nAmount: ₹${amountInRupees}\nTransaction ID: ${finalTransactionId || merchantTransactionId}\n\nContact: ${customerEmail || customerPhone || 'N/A'}`;

                try {
                  console.log('📱 Attempting to send admin SMS to', recipientPhone, '...');
                  const adminSmsResponse = await client.messages.create({
                    body: smsMessage,
                    from: twilioPhone,
                    to: recipientPhone,
                  });
                  console.log('✅ Admin SMS notification sent successfully to', recipientPhone);
                  console.log('📱 Admin SMS Response:', {
                    sid: adminSmsResponse.sid,
                    status: adminSmsResponse.status,
                    to: adminSmsResponse.to,
                    from: adminSmsResponse.from,
                    errorCode: adminSmsResponse.errorCode,
                    errorMessage: adminSmsResponse.errorMessage
                  });
                } catch (adminSmsError) {
                  // Log SMS error with helpful message (same as contact form)
                  if (adminSmsError.code === 21659 || adminSmsError.message?.includes('not a Twilio phone number')) {
                    console.error('❌ SMS Error: The phone number used for TWILIO_PHONE_NUMBER is not a valid Twilio number.');
                    console.error('Please ensure you are using a phone number you own in your Twilio account.');
                    console.error('To get a Twilio number: Go to Twilio Console → Phone Numbers → Manage → Buy a number');
                    console.error('Current TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER);
                  } else {
                    console.error('❌ Error sending admin SMS:', adminSmsError.message || adminSmsError);
                    console.error('SMS Error Details:', {
                      code: adminSmsError.code,
                      status: adminSmsError.status,
                      moreInfo: adminSmsError.moreInfo
                    });
                  }
                }

                // Send SMS to customer (if customer phone is available)
                if (customerPhone) {
                  const formattedCustomerPhone = formatPhoneNumber(customerPhone);
                  console.log('📱 Formatted Customer Phone:', formattedCustomerPhone);
                  
                  if (twilioPhone && formattedCustomerPhone && /^\+[1-9]\d{1,14}$/.test(twilioPhone) && /^\+[1-9]\d{1,14}$/.test(formattedCustomerPhone)) {
                    const amountInRupees = (orderStatus.amount / 100).toFixed(2);
                    const customerSmsMessage = `✅ Payment Successful!\n\nDear ${customerName},\n\nYour payment of ₹${amountInRupees} for ${serviceName} has been received.\n\nTransaction ID: ${finalTransactionId || merchantTransactionId}\n\nThank you for your payment!`;

                    try {
                      console.log('📱 Attempting to send customer SMS to', formattedCustomerPhone, '...');
                      const customerSmsResponse = await client.messages.create({
                        body: customerSmsMessage,
                        from: twilioPhone,
                        to: formattedCustomerPhone,
                      });
                      console.log('✅ Customer SMS notification sent successfully to', formattedCustomerPhone);
                      console.log('📱 Customer SMS Response:', {
                        sid: customerSmsResponse.sid,
                        status: customerSmsResponse.status,
                        to: customerSmsResponse.to,
                        from: customerSmsResponse.from,
                        errorCode: customerSmsResponse.errorCode,
                        errorMessage: customerSmsResponse.errorMessage
                      });
                    } catch (customerSmsError) {
                      console.error('❌ Error sending customer SMS:', customerSmsError.message || customerSmsError);
                      console.error('Customer SMS Error Details:', {
                        code: customerSmsError.code,
                        status: customerSmsError.status,
                        moreInfo: customerSmsError.moreInfo
                      });
                    }
                  } else {
                    console.warn('⚠️  Customer SMS skipped: Invalid phone number format. Twilio:', twilioPhone, 'Customer:', formattedCustomerPhone);
                  }
                } else {
                  console.warn('⚠️  Customer SMS skipped: Customer phone not provided');
                }
              } catch (smsError) {
                console.error('❌ Error in SMS notification setup:', smsError.message || smsError);
                console.error('SMS Setup Error Stack:', smsError.stack);
                // Don't fail if SMS fails
              }
            } else {
              console.warn('⚠️  SMS notifications skipped: Twilio not fully configured');
            }
          } else if (!canSendEmails) {
            console.log('ℹ️  Emails already sent for this payment (skipping to avoid duplicates)');
          } else {
            console.log('⚠️  Cannot send emails - missing customer details:', {
              hasEmail: !!customerEmail,
              hasName: !!customerName
            });
          }
        } else {
          console.log('⚠️  No local payment record found - cannot send notifications');
          console.log('⚠️  Merchant Transaction ID used:', merchantTransactionId);
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
