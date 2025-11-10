# PhonePe Webhook Setup Guide

## What is a Webhook?

A **webhook** is a way for PhonePe to automatically notify your application when specific events occur (like payment completion, subscription redemption, etc.). Instead of your app constantly checking PhonePe's API, PhonePe sends HTTP POST requests to your webhook URL whenever an event happens.

## Understanding PhonePe Webhooks

### Webhook URL
This is the public URL where PhonePe will send event notifications. It should be:
- Publicly accessible (not localhost)
- Using HTTPS (required for production)
- A POST endpoint that can receive JSON data

**Example:** `https://yourdomain.com/api/phonepe-webhook`

### Active Events
These are the events you want to be notified about. Common PhonePe events include:

- **`subscription.redemption.order.completed`** - When a subscription redemption order is successfully completed
- **`PAYMENT_SUCCESS`** - When a payment is successful
- **`PAYMENT_FAILED`** - When a payment fails
- **`PAYMENT_PENDING`** - When a payment is pending
- **`REFUND_SUCCESS`** - When a refund is processed successfully

## Setup Instructions

### Step 1: Deploy Your Application

Your webhook endpoint needs to be publicly accessible. Deploy your Next.js app to:
- **Vercel** (recommended for Next.js)
- **Netlify**
- **AWS**
- **Any hosting service with HTTPS**

### Step 2: Configure Environment Variables

Add these to your `.env.local` file (for local development) and your hosting platform's environment variables (for production):

```env
# PhonePe Webhook Configuration
PHONEPE_SALT_KEY=your_salt_key_from_phonepe_dashboard
PHONEPE_SALT_INDEX=1
PHONEPE_MERCHANT_ID=your_merchant_id
```

**⚠️ Important: Finding Your Salt Key**

The Salt Key and Salt Index are **not always visible** in the PhonePe Business Dashboard. Here's how to get them:

#### Option 1: Check Your Dashboard
1. Log in to your [PhonePe Business Dashboard](https://business.phonepe.com/)
2. Go to **Settings** → **API Settings** or **Developer Settings**
3. Look for:
   - **Salt Key** (also called "API Secret" or "Webhook Secret")
   - **Salt Index** (usually `1`)
   - **Merchant ID** (also called "Merchant Key" or "Merchant ID")

#### Option 2: Check Your Integration Documents
- Check the email/documentation you received when you signed up for PhonePe Business
- Look for integration credentials or API credentials document

#### Option 3: Contact PhonePe Support
If you can't find the Salt Key in your dashboard:

1. **Email PhonePe Support:**
   - Email: [support@phonepe.com](mailto:support@phonepe.com)
   - Subject: "Request for Salt Key and Salt Index for Webhook Integration"
   - Include your Merchant ID and business details

2. **Phone Support:**
   - Call PhonePe Business Support (check their website for current number)
   - Request your Salt Key and Salt Index for webhook integration

3. **Live Chat:**
   - Use the live chat feature in your PhonePe Business Dashboard
   - Ask for "Salt Key and Salt Index for webhook signature verification"

**Note:** The webhook will work **without** the Salt Key for testing, but signature verification will be disabled. For production, you should always enable signature verification for security.

### Step 3: Configure Webhook in PhonePe Dashboard

1. Log in to [PhonePe Business Dashboard](https://business.phonepe.com/)
2. Navigate to **Settings** → **Webhooks** (or **API Settings**)
3. Click **Create Webhook** or **Add Webhook**
4. Enter your webhook URL: `https://yourdomain.com/api/phonepe-webhook`
5. Select the events you want to subscribe to:
   - ✅ `subscription.redemption.order.completed`
   - ✅ `PAYMENT_SUCCESS`
   - ✅ `PAYMENT_FAILED`
   - ✅ `PAYMENT_PENDING`
   - ✅ `REFUND_SUCCESS`
6. Save the webhook configuration

### Step 4: Test Your Webhook (Local Development)

For local testing, you need to expose your local server publicly:

1. **Using ngrok** (recommended):
   ```bash
   # Install ngrok: https://ngrok.com/download
   ngrok http 3000
   ```
   
   This will give you a public URL like: `https://abc123.ngrok.io`
   
   Use this URL in PhonePe: `https://abc123.ngrok.io/api/phonepe-webhook`

2. **Using other tools:**
   - **localtunnel**: `npx localtunnel --port 3000`
   - **Cloudflare Tunnel**: Free alternative to ngrok

### Step 5: Verify Webhook is Working

1. Make a test payment or trigger an event in PhonePe
2. Check your server logs for webhook notifications
3. PhonePe dashboard usually shows webhook delivery status

## Webhook Endpoint Details

**Endpoint:** `/api/phonepe-webhook`

**Method:** POST

**Headers PhonePe Sends:**
- `x-verify`: Signature for verification
- `x-merchant-id`: Your merchant ID
- `Content-Type`: `application/json`

**Response Expected:**
- Status Code: `200 OK`
- Body: JSON with `success: true`

**Important:** Always return `200 OK` to acknowledge receipt. If PhonePe doesn't receive a 200 response, it will retry the webhook.

## Security: Signature Verification

The webhook endpoint automatically verifies the signature sent by PhonePe to ensure the request is authentic. This prevents malicious actors from sending fake webhook notifications.

The verification uses:
- SHA256 hash
- Your Salt Key
- Salt Index

**⚠️ Can't Find Your Salt Key?**

**Don't worry!** The webhook will still work without the Salt Key for testing purposes. However:

- ✅ **For Testing:** You can test webhooks without signature verification
- ⚠️ **For Production:** You **must** enable signature verification for security
- 📧 **Get Your Salt Key:** Contact PhonePe support at [support@phonepe.com](mailto:support@phonepe.com)

**To enable signature verification:**
1. Contact PhonePe support to get your Salt Key and Salt Index
2. Add them to your environment variables:
   ```env
   PHONEPE_SALT_KEY=your_salt_key_here
   PHONEPE_SALT_INDEX=1
   ```
3. The webhook will automatically start verifying signatures

**Current Behavior:**
- If `PHONEPE_SALT_KEY` is **not set**: Webhook works, but signature verification is disabled (warning logged)
- If `PHONEPE_SALT_KEY` is **set**: Webhook verifies signatures automatically
- In **production mode**: Invalid signatures are rejected
- In **development mode**: Invalid signatures are logged but webhook continues (for testing)

## Customizing the Webhook Handler

The webhook handler in `src/app/api/phonepe-webhook/route.js` includes placeholder functions for each event type. You need to implement your business logic:

1. **Database Updates**: Save payment/subscription data
2. **Email Notifications**: Send confirmation emails
3. **Order Fulfillment**: Trigger order processing
4. **Inventory Management**: Update stock levels
5. **Analytics**: Log events for reporting

## Troubleshooting

### Webhook not receiving events
- ✅ Check if your URL is publicly accessible
- ✅ Verify HTTPS is enabled (required for production)
- ✅ Check PhonePe dashboard for webhook delivery status
- ✅ Verify environment variables are set correctly

### Can't find Salt Key in dashboard
- ✅ **This is normal!** Salt Key is often not visible in the dashboard
- ✅ Contact PhonePe support: [support@phonepe.com](mailto:support@phonepe.com)
- ✅ Check your onboarding email/documentation
- ✅ Webhook works without Salt Key for testing (signature verification disabled)

### Signature verification failing
- ✅ Ensure `PHONEPE_SALT_KEY` matches what PhonePe support provided
- ✅ Check `PHONEPE_SALT_INDEX` (usually `1`, confirm with PhonePe)
- ✅ Verify the signature algorithm matches PhonePe's documentation
- ✅ Check server logs for detailed signature comparison (helpful for debugging)

### Webhook receiving but not processing
- ✅ Check server logs for errors
- ✅ Verify the event type is handled in the switch statement
- ✅ Ensure your business logic functions don't throw errors

## Next Steps

1. Deploy your application
2. Configure the webhook URL in PhonePe dashboard
3. Test with a small payment
4. Monitor logs to ensure webhooks are being received
5. Implement your business logic in the handler functions

## Support

For PhonePe-specific issues:
- Check [PhonePe Developer Documentation](https://developer.phonepe.com/)
- Contact PhonePe Support through your business dashboard

