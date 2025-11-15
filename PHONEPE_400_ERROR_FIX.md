# Fixing PhonePe 400 Bad Request Error

## Problem
You're seeing a 400 error when trying to make a payment:
```
api.phonepe.com/apis/pg/checkout/ui/v2/pay:1 Failed to load resource: the server responded with a status of 400
```

## Root Cause
The 400 error typically means:
1. **Redirect URL not whitelisted** in PhonePe dashboard (most common)
2. Invalid payment parameters
3. Account not fully activated

## Solution Steps

### Step 1: Whitelist Redirect URL in PhonePe Dashboard

1. **Log in to PhonePe Dashboard**
   - Go to [developer.phonepe.com](https://developer.phonepe.com/)
   - Or your PhonePe Business Dashboard

2. **Navigate to Settings/Configuration**
   - Look for "Redirect URLs" or "Callback URLs" section
   - Or "Payment Gateway Settings" → "Redirect URLs"

3. **Add Your Redirect URL**
   - Your redirect URL format: `https://yourdomain.com/payment/success?transactionId=*`
   - Or add the base pattern: `https://yourdomain.com/payment/success*`
   - Make sure to include the exact domain (no trailing slashes)

4. **Save the Configuration**
   - Click Save/Update
   - Wait a few minutes for changes to propagate

### Step 2: Verify Environment Variables

Check your environment variables are set correctly:

```env
PHONEPE_CLIENT_ID=your_client_id
PHONEPE_CLIENT_SECRET=your_client_secret
PHONEPE_ENVIRONMENT=SANDBOX  # or PRODUCTION
PHONEPE_CLIENT_INDEX=1
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

**Important:** 
- `NEXT_PUBLIC_BASE_URL` must match exactly what you whitelisted in PhonePe dashboard
- No trailing slash at the end
- Must be HTTPS (not HTTP)

### Step 3: Check PhonePe Account Status

1. **Verify Account Activation**
   - Ensure your PhonePe merchant account is fully activated
   - Check if payments are enabled for your account
   - Contact PhonePe support if account is pending activation

2. **Environment Match**
   - If using SANDBOX: Use sandbox credentials and test redirect URL
   - If using PRODUCTION: Use production credentials and production redirect URL
   - **Don't mix** sandbox credentials with production URLs or vice versa

### Step 4: Verify Amount

- Amount must be in **paise** (smallest currency unit)
- Minimum amount: **100 paise** (₹1)
- For ₹150 pre-registration: Amount should be **15000 paise**

### Step 5: Check Server Logs

Check your Vercel/server logs for detailed error messages. The updated code now logs:
- Full payment request details
- PhonePe SDK response
- Detailed error information

Look for:
- Redirect URL being sent
- Amount in paise
- Environment (SANDBOX/PRODUCTION)
- Any specific error codes from PhonePe

## Common Redirect URL Patterns

Add one of these patterns in PhonePe dashboard:

```
# Exact match (recommended)
https://abhishek-chaudhary.com/payment/success

# With wildcard for query parameters
https://abhishek-chaudhary.com/payment/success*

# Base domain (if PhonePe allows)
https://abhishek-chaudhary.com/*
```

## Testing After Fix

1. **Clear browser cache** and cookies
2. **Try payment again** from a fresh session
3. **Check Vercel logs** for any new errors
4. **Verify redirect** - After payment, you should be redirected back to your success page

## Still Getting 400 Error?

If you've completed all steps above and still get 400:

1. **Contact PhonePe Support**
   - Email: support@phonepe.com
   - Provide:
     - Your Merchant ID / Client ID
     - Redirect URL you're trying to use
     - Error logs from your server
     - Screenshot of the error

2. **Check PhonePe Dashboard**
   - Verify redirect URL is saved correctly
   - Check if there are any pending approvals
   - Look for any account restrictions

3. **Try Different Redirect URL**
   - Sometimes PhonePe has issues with query parameters
   - Try: `https://yourdomain.com/payment/success` (without query params)
   - Then handle transaction ID differently

## About CSP Errors

The Content Security Policy errors you see are **PhonePe's internal issues**, not your code:
```
Unrecognized Content-Security-Policy directive 'prefetch-src'
Creating a worker from 'blob:...' violates CSP
```

These are PhonePe's own CSP configuration problems and don't affect payment functionality. The 400 error is the real issue to fix.

## Quick Checklist

- [ ] Redirect URL whitelisted in PhonePe dashboard
- [ ] `NEXT_PUBLIC_BASE_URL` matches whitelisted URL exactly
- [ ] Environment variables set correctly
- [ ] PhonePe account is activated
- [ ] Using correct credentials for environment (SANDBOX/PRODUCTION)
- [ ] Amount is in paise (not rupees)
- [ ] Checked server logs for detailed errors
- [ ] Cleared browser cache and tried again

## Need Help?

If you're still stuck:
1. Check Vercel function logs for detailed error messages
2. Share the error details from logs (not console - server logs)
3. Verify redirect URL is exactly as configured in PhonePe dashboard

