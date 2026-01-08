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

    // Validate credential format
    // Note: PhonePe credential format:
    // - SANDBOX Client ID starts with "M" (e.g., "M23...")
    // - PRODUCTION Client ID starts with "SU" (e.g., "SU...")
    const credentialIssues = [];
    const credentialErrors = [];
    
    if (clientId) {
      if (clientId.length !== 24) {
        credentialIssues.push(`Client ID length is ${clientId.length}, expected 24 characters`);
      }
      
      // Check environment mismatch (this is critical)
      if (environment === 'SANDBOX' && !clientId.startsWith('M')) {
        credentialErrors.push(`⚠️ CRITICAL: You're using PRODUCTION credentials (starts with "${clientId.substring(0, 2)}") in SANDBOX environment. This will cause authentication failures.`);
        credentialErrors.push(`   Solution: Get SANDBOX credentials (starting with "M") from PhonePe Dashboard or change PHONEPE_ENVIRONMENT to PRODUCTION`);
      }
      if (environment === 'PRODUCTION' && !clientId.startsWith('SU')) {
        credentialErrors.push(`⚠️ CRITICAL: You're using SANDBOX credentials (starts with "${clientId.substring(0, 2)}") in PRODUCTION environment. This will cause authentication failures.`);
        credentialErrors.push(`   Solution: Get PRODUCTION credentials (starting with "SU") from PhonePe Dashboard or change PHONEPE_ENVIRONMENT to SANDBOX`);
      }
      
      // Informational warnings (not errors)
      if (environment === 'SANDBOX' && clientId.startsWith('M')) {
        console.log('✅ SANDBOX credentials detected (starts with "M")');
      }
      if (environment === 'PRODUCTION' && clientId.startsWith('SU')) {
        console.log('✅ PRODUCTION credentials detected (starts with "SU")');
      }
    }
    
    // Client Secret length validation (PhonePe may have different formats)
    if (clientSecret) {
      if (clientSecret.length !== 36 && clientSecret.length !== 48) {
        credentialIssues.push(`Client Secret length is ${clientSecret.length}, expected 36 or 48 characters`);
      } else if (clientSecret.length === 48) {
        console.log('ℹ️  Client Secret is 48 characters (some PhonePe accounts use this format)');
      }
    }

    if (credentialErrors.length > 0) {
      console.error('❌ PhonePe Credential Errors:', credentialErrors);
    }
    if (credentialIssues.length > 0) {
      console.warn('⚠️  PhonePe Credential Format Warnings:', credentialIssues);
    }

    // Debug logging (without exposing full secrets)
    console.log('PhonePe SDK Configuration:', {
      clientId: clientId ? `${clientId.substring(0, 4)}...${clientId.substring(clientId.length - 4)}` : 'NOT SET',
      clientIdLength: clientId?.length || 0,
      clientIdPrefix: clientId ? clientId.substring(0, 2) : 'N/A',
      clientSecretLength: clientSecret?.length || 0,
      clientVersion: clientVersion,
      environment: environment,
      env: env === Env.PRODUCTION ? 'PRODUCTION' : 'SANDBOX',
      credentialWarnings: credentialIssues.length > 0 ? credentialIssues : 'None',
      credentialErrors: credentialErrors.length > 0 ? credentialErrors : 'None'
    });
    
    // If there are critical errors, return early
    if (credentialErrors.length > 0) {
      return NextResponse.json(
        {
          error: 'PhonePe Credential Configuration Error',
          details: credentialErrors.join('\n'),
          suggestion: `Your credentials don't match your environment setting.\n\n` +
            `Current Setup:\n` +
            `- Environment: ${environment}\n` +
            `- Client ID Prefix: ${clientId ? clientId.substring(0, 2) : 'N/A'}\n\n` +
            `Required Setup:\n` +
            `- For SANDBOX: Client ID should start with "M" (e.g., "M23...")\n` +
            `- For PRODUCTION: Client ID should start with "SU" (e.g., "SU...")\n\n` +
            `Solutions:\n` +
            `1. Get correct credentials from PhonePe Dashboard matching your environment\n` +
            `2. Or update PHONEPE_ENVIRONMENT to match your credentials\n` +
            `   - If Client ID starts with "M" → Set PHONEPE_ENVIRONMENT=SANDBOX\n` +
            `   - If Client ID starts with "SU" → Set PHONEPE_ENVIRONMENT=PRODUCTION`
        },
        { status: 400 }
      );
    }

    // Generate unique merchant order ID
    const merchantOrderId = randomUUID();
    
    // Amount in paise (PhonePe expects amount in smallest currency unit)
    const amountInPaise = Math.round(parseFloat(amount));

    // Build redirect URL (must be whitelisted in PhonePe dashboard)
    // For local development, try to detect the origin from the request
    // For production, use the configured base URL
    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://abhishek-chaudhary.com';
    
    // Check if we're in development and should use request origin
    const isDevelopment = process.env.NODE_ENV === 'development';
    const requestOrigin = request.headers.get('origin') || request.headers.get('referer');
    
    if (isDevelopment && requestOrigin) {
      try {
        const originUrl = new URL(requestOrigin);
        // Use the origin from the request (localhost or local IP)
        baseUrl = `${originUrl.protocol}//${originUrl.host}`;
        console.log('🔧 Development mode detected - using request origin for redirect URL:', baseUrl);
        console.log('⚠️  Note: Make sure this URL is whitelisted in PhonePe SANDBOX dashboard for testing');
      } catch (e) {
        console.warn('Could not parse request origin, using configured base URL:', baseUrl);
      }
    }
    
    const redirectUrl = `${baseUrl}/payment/success?transactionId=${merchantOrderId}`;
    
    // Validate redirect URL format
    try {
      new URL(redirectUrl); // This will throw if URL is invalid
    } catch (urlError) {
      console.error('Invalid redirect URL format:', redirectUrl);
      return NextResponse.json(
        { 
          error: 'Invalid redirect URL configuration',
          details: `The redirect URL is malformed: ${redirectUrl}`,
          suggestion: 'Please check NEXT_PUBLIC_BASE_URL environment variable or ensure request origin is valid'
        },
        { status: 400 }
      );
    }
    
    console.log('📍 Redirect URL configured:', redirectUrl);
    console.log('📍 Base URL source:', isDevelopment && requestOrigin ? 'Request Origin (Development)' : 'Environment Variable (Production)');

    // Create meta info with customer details (optional)
    // Note: PhonePe only supports udf1-udf5, so we encode customerMessage in udf5 along with serviceId
    const metaInfoBuilder = MetaInfo.builder();
    if (customerDetails?.name) metaInfoBuilder.udf1(customerDetails.name);
    if (customerDetails?.email) metaInfoBuilder.udf2(customerDetails.email);
    if (customerDetails?.phone) metaInfoBuilder.udf3(customerDetails.phone);
    if (serviceName) metaInfoBuilder.udf4(serviceName);
    
    // Encode customerMessage in udf5: format is "serviceId|base64EncodedMessage" or just "serviceId" if no message
    let udf5Value = serviceId ? serviceId.toString() : '';
    if (customerDetails?.message && customerDetails.message.trim()) {
      try {
        // Encode message in base64 to preserve special characters
        const encodedMessage = Buffer.from(customerDetails.message).toString('base64');
        udf5Value = `${udf5Value}|${encodedMessage}`;
      } catch (error) {
        console.warn('Failed to encode customerMessage, storing serviceId only:', error);
      }
    }
    if (udf5Value) metaInfoBuilder.udf5(udf5Value);
    
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
      // Log full request details for debugging
      console.log('PhonePe Payment Request Details:', {
        merchantOrderId: merchantOrderId,
        amount: amountInPaise,
        amountInRupees: (amountInPaise / 100).toFixed(2),
        redirectUrl: redirectUrl,
        environment: environment,
        hasMetaInfo: !!metaInfo,
        customerDetails: {
          hasName: !!customerDetails?.name,
          hasEmail: !!customerDetails?.email,
          hasPhone: !!customerDetails?.phone
        }
      });

      paymentResponse = await client.pay(payRequest);
      
      console.log('PhonePe SDK Response:', {
        success: !!paymentResponse.redirectUrl,
        hasRedirectUrl: !!paymentResponse.redirectUrl,
        responseKeys: paymentResponse ? Object.keys(paymentResponse) : [],
        fullResponse: JSON.stringify(paymentResponse, null, 2)
      });

    } catch (sdkError) {
      // Log comprehensive error details
      const errorLog = {
        error: sdkError.message,
        stack: sdkError.stack,
        name: sdkError.constructor?.name,
        httpStatusCode: sdkError.httpStatusCode,
        code: sdkError.code,
        data: sdkError.data,
        response: sdkError.response,
        status: sdkError.status,
        statusText: sdkError.statusText
      };
      
      console.error('=== PhonePe SDK Error Details ===');
      console.error(JSON.stringify(errorLog, null, 2));
      console.error('Full Error Object:', sdkError);
      
      // Try to extract more details from error data
      let phonePeErrorCode = null;
      let phonePeErrorMessage = null;
      if (sdkError.data) {
        try {
          const errorData = typeof sdkError.data === 'string' ? JSON.parse(sdkError.data) : sdkError.data;
          phonePeErrorCode = errorData.code || errorData.errorCode;
          phonePeErrorMessage = errorData.message || errorData.errorMessage || errorData.details;
          console.error('PhonePe Error Code:', phonePeErrorCode);
          console.error('PhonePe Error Message:', phonePeErrorMessage);
        } catch (e) {
          console.error('Could not parse error data:', sdkError.data);
        }
      }

      // Handle SDK-specific errors
      let errorDetails = sdkError.message || 'Unknown SDK error';
      let suggestion = '';

      // Check for 401 Unauthorized errors (Authentication failures)
      if (sdkError.httpStatusCode === 401 || sdkError.code === '401' || sdkError.type === 'UnauthorizedAccess') {
        errorDetails = `Unauthorized (401): Authentication failed with PhonePe`;
        suggestion = `PhonePe SDK Authentication Error (401 Unauthorized):\n\n` +
          `This error occurs when PhonePe cannot authenticate your credentials.\n\n` +
          `🔍 Troubleshooting Steps:\n\n` +
          `1. ✅ Verify Client ID and Client Secret\n` +
          `   - Client ID: ${clientId ? clientId.substring(0, 8) + '...' + clientId.substring(clientId.length - 4) : 'NOT SET'}\n` +
          `   - Client ID Length: ${clientId?.length || 0} characters (should be 24)\n` +
          `   - Client Secret Length: ${clientSecret?.length || 0} characters (should be 36)\n` +
          `   - Make sure there are NO extra spaces or newlines in your credentials\n` +
          `   - Copy credentials directly from PhonePe Dashboard (don't type manually)\n\n` +
          `2. ✅ Check Environment Match\n` +
          `   - Current Environment: ${environment}\n` +
          `   - Your credentials MUST match the environment:\n` +
          `     • SANDBOX credentials → PHONEPE_ENVIRONMENT=SANDBOX\n` +
          `     • PRODUCTION credentials → PHONEPE_ENVIRONMENT=PRODUCTION\n` +
          `   - You CANNOT use SANDBOX credentials with PRODUCTION environment or vice versa\n\n` +
          `3. ✅ Verify Account Status\n` +
          `   - Log into PhonePe Merchant Dashboard\n` +
          `   - Check if your account is fully activated\n` +
          `   - Verify that API access is enabled for your account\n` +
          `   - Contact PhonePe support if account is pending activation\n\n` +
          `4. ✅ Check Credential Format\n` +
          `   - Client ID should start with "SU" for SANDBOX or "MU" for PRODUCTION\n` +
          `   - Client Secret should be a 36-character UUID\n` +
          `   - No special characters or spaces should be present\n\n` +
          `5. ✅ Environment Variables Check\n` +
          `   - Verify in .env.local (local) or Vercel Environment Variables (production)\n` +
          `   - Make sure variables are named exactly:\n` +
          `     • PHONEPE_CLIENT_ID\n` +
          `     • PHONEPE_CLIENT_SECRET\n` +
          `     • PHONEPE_ENVIRONMENT\n` +
          `   - After updating, restart your development server\n\n` +
          `6. ✅ Regenerate Credentials (if needed)\n` +
          `   - Go to PhonePe Dashboard → API Settings\n` +
          `   - Generate new Client ID and Client Secret\n` +
          `   - Update your environment variables\n` +
          `   - Wait 2-3 minutes for changes to propagate\n\n` +
          `7. ✅ Contact PhonePe Support\n` +
          `   - If all above steps fail, contact PhonePe support\n` +
          `   - Email: support@phonepe.com\n` +
          `   - Provide them with your Merchant ID and error details`;
      } else if (sdkError.httpStatusCode === 400) {
        errorDetails = `Bad Request (400): ${phonePeErrorMessage || errorDetails}`;
        suggestion = `PhonePe returned a 400 Bad Request error.\n\n` +
          `Error Code: ${phonePeErrorCode || 'Not provided'}\n` +
          `Error Message: ${phonePeErrorMessage || errorDetails}\n\n` +
          `Common causes and solutions:\n\n` +
          `1. ✅ Redirect URL Not Whitelisted (MOST COMMON)\n` +
          `   - Go to PhonePe Dashboard → Settings → Redirect URLs\n` +
          `   - Add: ${redirectUrl.replace(/\?.*$/, '*')} or ${baseUrl}/payment/success*\n` +
          `   - Wait 5-10 minutes after adding\n\n` +
          `2. ✅ Verify Amount\n` +
          `   Current: ${amountInPaise} paise (₹${(amountInPaise / 100).toFixed(2)})\n` +
          `   Minimum: 100 paise (₹1)\n` +
          `   Maximum: Check PhonePe limits\n\n` +
          `3. ✅ Check Environment Variables\n` +
          `   PHONEPE_ENVIRONMENT: ${environment}\n` +
          `   NEXT_PUBLIC_BASE_URL: ${baseUrl}\n` +
          `   Make sure these match your PhonePe dashboard settings\n\n` +
          `4. ✅ Account Activation\n` +
          `   - Verify your PhonePe merchant account is fully activated\n` +
          `   - Check if payments are enabled in your account\n` +
          `   - Contact PhonePe support if account is pending\n\n` +
          `5. ✅ Check Vercel Logs\n` +
          `   - Go to Vercel Dashboard → Your Project → Functions\n` +
          `   - Look for detailed error messages from PhonePe\n\n` +
          `6. ✅ Try Different Redirect URL Format\n` +
          `   - Try without query parameters: ${baseUrl}/payment/success\n` +
          `   - Or with wildcard: ${baseUrl}/payment/success*`;
      } else if (errorDetails.toLowerCase().includes('authentication') || 
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
