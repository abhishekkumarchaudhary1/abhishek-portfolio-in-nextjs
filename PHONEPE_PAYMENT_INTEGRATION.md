# PhonePe Payment Integration Guide

## ✅ Integration Complete!

Your services checkout has been successfully migrated from Razorpay to PhonePe payment gateway.

---

## What Changed?

### 1. **Checkout Flow**
- **Before:** Razorpay modal popup for payment
- **After:** Redirect to PhonePe payment page

### 2. **Payment Flow**
1. User clicks "Hire Me / Proceed to Checkout" on a service
2. Fills in customer details (Name, Email, Phone, Message)
3. Clicks "Proceed to Pay"
4. **Redirects to PhonePe payment page** (instead of Razorpay modal)
5. User completes payment on PhonePe
6. PhonePe redirects back to success page
7. Payment is automatically verified

### 3. **New Files Created**

#### API Endpoints:
- **`/api/create-phonepe-order`** - Creates payment order and returns PhonePe payment URL
- **`/api/phonepe-callback`** - Receives callbacks from PhonePe after payment
- **`/api/verify-phonepe-payment`** - Verifies payment status with PhonePe API

#### Pages:
- **`/payment/success`** - Success page where users are redirected after payment

### 4. **Updated Files**
- **`CheckoutModal.js`** - Now uses PhonePe instead of Razorpay
- Removed Razorpay script loading
- Changed to redirect-based payment flow

---

## Environment Variables Required

Add these to your `.env.local` (for local) and Vercel environment variables (for production):

```env
# PhonePe Payment Gateway Configuration
PHONEPE_MERCHANT_ID=your_merchant_id_from_developer_portal
PHONEPE_SALT_KEY=your_salt_key_from_developer_portal
PHONEPE_SALT_INDEX=1
PHONEPE_ENVIRONMENT=SANDBOX  # Use 'PRODUCTION' for live payments

# Base URL for redirects (your deployed URL)
NEXT_PUBLIC_BASE_URL=https://abhishek-chaudhary.com
```

**Where to get these:**
1. Visit [developer.phonepe.com](https://developer.phonepe.com/)
2. Log in with your PhonePe Business account
3. Go to Developer Settings / API Settings
4. Copy your Merchant ID, Salt Key, and Salt Index

---

## Payment Flow Diagram

```
User clicks "Hire Me"
    ↓
Checkout Modal Opens
    ↓
User fills details & clicks "Proceed to Pay"
    ↓
POST /api/create-phonepe-order
    ↓
PhonePe API creates payment order
    ↓
Returns payment URL
    ↓
User redirected to PhonePe payment page
    ↓
User completes payment on PhonePe
    ↓
PhonePe redirects to /payment/success?transactionId=XXX
    ↓
GET /payment/success page
    ↓
POST /api/verify-phonepe-payment (verifies with PhonePe)
    ↓
Shows success/failure message
```

---

## Testing

### Sandbox Testing

1. **Set Environment:**
   ```env
   PHONEPE_ENVIRONMENT=SANDBOX
   ```

2. **Use Test Credentials:**
   - Get sandbox credentials from PhonePe Developer Portal
   - Use test phone numbers provided by PhonePe

3. **Test Payment:**
   - Go to Services section
   - Click "Hire Me" on any service
   - Fill in test details
   - Complete payment on PhonePe sandbox
   - Verify redirect to success page

### Production

1. **Set Environment:**
   ```env
   PHONEPE_ENVIRONMENT=PRODUCTION
   ```

2. **Use Production Credentials:**
   - Get production credentials from PhonePe
   - Update all environment variables

3. **Deploy:**
   - Make sure all environment variables are set in Vercel
   - Redeploy your application

---

## Webhook Integration

Your existing webhook endpoint (`/api/phonepe-webhook`) will automatically receive payment notifications from PhonePe for:
- Payment success
- Payment failure
- Payment pending
- Refunds

The webhook is already configured and will work with your payment integration.

---

## Differences from Razorpay

| Feature | Razorpay | PhonePe |
|---------|----------|---------|
| **Payment UI** | Modal popup | Redirect to payment page |
| **User Experience** | Stays on your site | Redirects to PhonePe |
| **Verification** | Client-side callback | Server-side verification |
| **Success Page** | Modal closes | Redirect to success page |

---

## Troubleshooting

### Payment URL Not Received

**Error:** "Payment URL not received"

**Solutions:**
1. Check PhonePe credentials are correct
2. Verify `PHONEPE_ENVIRONMENT` is set correctly (SANDBOX/PRODUCTION)
3. Check Vercel logs for API errors
4. Verify base URL is correct in environment variables

### Payment Verification Fails

**Error:** Payment shows as failed on success page

**Solutions:**
1. Check PhonePe API credentials
2. Verify signature generation is correct
3. Check transaction ID format
4. Review Vercel logs for verification errors

### Redirect Not Working

**Error:** User not redirected to PhonePe

**Solutions:**
1. Check `NEXT_PUBLIC_BASE_URL` is set correctly
2. Verify payment URL is valid
3. Check browser console for errors
4. Ensure CORS is not blocking the redirect

### Environment Variables Not Working

**Solutions:**
1. Redeploy on Vercel after adding environment variables
2. Check variable names are exact (case-sensitive)
3. Verify variables are added to Production environment
4. Clear browser cache and try again

---

## Next Steps

1. ✅ **Get PhonePe Credentials**
   - Visit developer.phonepe.com
   - Get Merchant ID, Salt Key, Salt Index

2. ✅ **Add Environment Variables**
   - Add to Vercel project settings
   - Add to `.env.local` for local testing

3. ✅ **Test in Sandbox**
   - Test payment flow
   - Verify success page works
   - Check webhook receives events

4. ✅ **Go Live**
   - Switch to PRODUCTION environment
   - Update credentials
   - Test with real payments

---

## Support

- **PhonePe Developer Docs:** https://developer.phonepe.com/
- **PhonePe Support:** support@phonepe.com
- **Your Webhook Endpoint:** https://abhishek-chaudhary.com/api/phonepe-webhook

---

## Files Modified/Created

### Created:
- `src/app/api/create-phonepe-order/route.js`
- `src/app/api/phonepe-callback/route.js`
- `src/app/api/verify-phonepe-payment/route.js`
- `src/app/payment/success/page.js`
- `PHONEPE_PAYMENT_INTEGRATION.md` (this file)

### Modified:
- `src/app/components/CheckoutModal.js`

### Unchanged (Still Available):
- `src/app/api/phonepe-webhook/route.js` (webhook handler)
- `src/app/api/create-order/route.js` (Razorpay - can be removed if not needed)
- `src/app/api/verify-payment/route.js` (Razorpay - can be removed if not needed)

---

## Notes

- Razorpay integration is still in the codebase but not used in Services checkout
- You can remove Razorpay files if you're not using them elsewhere
- PhonePe webhook is already set up and will receive payment events automatically
- All payment verification happens server-side for security

