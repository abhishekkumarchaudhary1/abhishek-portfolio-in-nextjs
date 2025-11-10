# PhonePe API Keys Setup Guide

## ✅ Your Webhook is Live!

Your webhook endpoint is successfully deployed and accessible at:
**https://abhishek-portfolio-in-nextjs.vercel.app/api/phonepe-webhook**

Now you need to get your API credentials from PhonePe Developer Portal to enable webhook signature verification.

---

## Step 1: Visit PhonePe Developer Portal

1. Go to **[developer.phonepe.com](https://developer.phonepe.com/)**
2. Log in with your PhonePe Business account credentials
3. Navigate to **Developer Settings** or **API Settings**

---

## Step 2: Find Your API Credentials

In the Developer Settings, look for these credentials:

### Required Credentials:

1. **Merchant ID** (also called "Merchant Key")
   - Format: Usually a string like `MERCHANTUAT` or `MERCHANT123`
   - Where to find: Developer Settings → API Keys section

2. **Salt Key**
   - Format: A long string (secret key)
   - Where to find: Developer Settings → API Keys → Salt Key
   - ⚠️ This might be hidden - click "Show" or "Reveal" button

3. **Salt Index**
   - Format: Usually `1` (a number)
   - Where to find: Developer Settings → API Keys → Salt Index
   - Default is usually `1`

### Alternative Names:
PhonePe might use different names for these:
- **Salt Key** = "API Secret", "Webhook Secret", "Secret Key"
- **Merchant ID** = "Merchant Key", "Merchant ID", "MID"
- **Salt Index** = "Salt Index", "Index"

---

## Step 3: Add Credentials to Vercel

Once you have your credentials, add them to your Vercel project:

### Option A: Via Vercel Dashboard (Recommended)

1. Go to your Vercel project: https://vercel.com/dashboard
2. Select your project: `portfolio` (or your project name)
3. Go to **Settings** → **Environment Variables**
4. Add these three variables:

   ```
   Name: PHONEPE_MERCHANT_ID
   Value: [Your Merchant ID]
   Environment: Production, Preview, Development (select all)
   ```

   ```
   Name: PHONEPE_SALT_KEY
   Value: [Your Salt Key]
   Environment: Production, Preview, Development (select all)
   ```

   ```
   Name: PHONEPE_SALT_INDEX
   Value: 1
   Environment: Production, Preview, Development (select all)
   ```

5. Click **Save** for each variable
6. **Redeploy** your application (Vercel will automatically redeploy when you add env vars, or you can manually trigger a redeploy)

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Add environment variables
vercel env add PHONEPE_MERCHANT_ID
vercel env add PHONEPE_SALT_KEY
vercel env add PHONEPE_SALT_INDEX

# Pull the latest (optional)
vercel pull
```

---

## Step 4: Verify Configuration

After adding the environment variables and redeploying:

1. **Test the webhook endpoint:**
   - Visit: https://abhishek-portfolio-in-nextjs.vercel.app/api/phonepe-webhook
   - You should see: `{"message":"PhonePe Webhook Endpoint","status":"active",...}`

2. **Check Vercel logs:**
   - Go to Vercel Dashboard → Your Project → **Deployments** → Latest deployment → **Functions** tab
   - Look for any errors related to environment variables

3. **Test with a webhook:**
   - Make a test payment or trigger an event in PhonePe
   - Check Vercel logs to see if webhook is received and signature is verified

---

## Step 5: Verify Webhook Signature is Working

Once credentials are added, your webhook will automatically:
- ✅ Verify signatures from PhonePe
- ✅ Reject invalid/fake webhooks
- ✅ Log verification status in Vercel logs

You can check the logs in:
- **Vercel Dashboard** → Your Project → **Deployments** → **Functions** → `/api/phonepe-webhook`

Look for logs like:
```
PhonePe Webhook Received: { eventType: '...', merchantId: '...' }
```

If signature verification fails, you'll see:
```
⚠️ Signature verification failed, but continuing in development mode
```

---

## Troubleshooting

### Can't Find Salt Key in Developer Portal?

1. **Check if it's hidden:**
   - Look for a "Show", "Reveal", or "👁️" button next to the Salt Key field
   - Some dashboards hide sensitive keys by default

2. **Check different sections:**
   - Look in "API Settings"
   - Look in "Webhook Settings"
   - Look in "Integration Settings"
   - Look in "Security Settings"

3. **Contact PhonePe Support:**
   - Email: support@phonepe.com
   - Mention you need Salt Key and Salt Index from Developer Portal
   - Include your Merchant ID

### Environment Variables Not Working?

1. **Redeploy your application:**
   - Vercel needs to redeploy to pick up new environment variables
   - Go to Deployments → Click "Redeploy" on the latest deployment

2. **Check variable names:**
   - Must be exactly: `PHONEPE_MERCHANT_ID`, `PHONEPE_SALT_KEY`, `PHONEPE_SALT_INDEX`
   - Case-sensitive!

3. **Check environment scope:**
   - Make sure variables are added to "Production" environment
   - Or add to all environments (Production, Preview, Development)

### Webhook Still Not Verifying Signatures?

1. **Check Vercel logs:**
   - Look for error messages about signature verification
   - The webhook code tries multiple signature methods automatically

2. **Verify Salt Key format:**
   - Make sure you copied the entire Salt Key (no spaces, no line breaks)
   - Salt Key is usually a long string without spaces

3. **Check Salt Index:**
   - Default is usually `1`
   - Confirm with PhonePe support if unsure

---

## What Happens Next?

Once you've added the credentials:

1. ✅ **Webhook signature verification is enabled**
2. ✅ **Invalid webhooks are rejected** (in production)
3. ✅ **All webhook events are logged** in Vercel
4. ✅ **Your webhook is production-ready**

Your webhook will now securely verify that all requests are actually coming from PhonePe!

---

## Quick Checklist

- [ ] Visited developer.phonepe.com
- [ ] Found Merchant ID
- [ ] Found Salt Key
- [ ] Found Salt Index (usually `1`)
- [ ] Added `PHONEPE_MERCHANT_ID` to Vercel
- [ ] Added `PHONEPE_SALT_KEY` to Vercel
- [ ] Added `PHONEPE_SALT_INDEX` to Vercel
- [ ] Redeployed application on Vercel
- [ ] Tested webhook endpoint
- [ ] Verified webhook receives events from PhonePe

---

## Support

- **PhonePe Developer Docs:** https://developer.phonepe.com/
- **PhonePe Support:** support@phonepe.com
- **Vercel Docs:** https://vercel.com/docs

