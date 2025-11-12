# PhonePe Credentials Fix Guide

## 🔴 Current Issue: KEY_NOT_CONFIGURED

Your logs show:
- Merchant ID: `M2306PU2DTWDH_2511102258` (24 characters)
- Salt Key: 48 characters
- Error: "Key not found for the merchant"

## ⚠️ Root Cause

**Client ID ≠ Merchant ID** (for Payment Gateway)

You're currently using:
- ❌ Client ID as Merchant ID
- ❌ Client Secret as Salt Key

But PhonePe Payment Gateway needs:
- ✅ **Separate Merchant ID** (not Client ID)
- ✅ **Separate Salt Key** (not Client Secret)

## ✅ Solution: Find Payment Gateway Credentials

### Step 1: Check PhonePe Dashboard

1. **Go to PhonePe Developer Portal:**
   - Visit: [developer.phonepe.com](https://developer.phonepe.com/)
   - Log in with your PhonePe Business account

2. **Look for "Payment Gateway" Section:**
   - NOT "OAuth" or "API Access" section
   - Look for tabs/sections like:
     - **"Payment Gateway"**
     - **"PG Settings"**
     - **"Integration" → "Payment Gateway"**
     - **"API Credentials" → "Payment Gateway"**

3. **In Payment Gateway Section, you should see:**
   - **Merchant ID** (different from Client ID)
   - **Salt Key** (different from Client Secret)
   - **Salt Index** (usually `1`)

### Step 2: If You Can't Find Payment Gateway Section

**Contact PhonePe Support:**

Email: support@phonepe.com

Subject: "Need Payment Gateway Credentials (Merchant ID and Salt Key)"

Message:
```
Hello PhonePe Support,

I'm trying to integrate PhonePe Payment Gateway but I'm getting 
"KEY_NOT_CONFIGURED" error.

I currently have:
- Client ID: M2306PU2DTWDH_2511102258
- Client Secret: [your client secret]

I need:
- Payment Gateway Merchant ID
- Payment Gateway Salt Key
- Salt Index

Can you please provide these credentials for SANDBOX (test) environment?

Thank you!
```

### Step 3: Update Vercel Environment Variables

Once you get the correct credentials:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables

2. Update these variables:
   ```
   PHONEPE_MERCHANT_ID=<Payment Gateway Merchant ID (NOT Client ID)>
   PHONEPE_SALT_KEY=<Payment Gateway Salt Key (NOT Client Secret)>
   PHONEPE_SALT_INDEX=1
   PHONEPE_ENVIRONMENT=SANDBOX
   ```

3. **Important:** After updating, **Redeploy** your application
   - Go to Deployments → Click "Redeploy" on latest deployment

## 🔍 How to Verify You Have the Right Credentials

### ✅ Correct Payment Gateway Credentials:
- Merchant ID is in "Payment Gateway" section
- Salt Key is in "Payment Gateway" section
- Both are labeled for "Payment Gateway" or "PG"

### ❌ Wrong Credentials (OAuth):
- Client ID/Secret are in "OAuth" or "API Access" section
- These are for reporting/subscription APIs, NOT payment gateway

## 📞 Alternative: Ask PhonePe Support Directly

If you can't find Payment Gateway credentials in dashboard:

**Call/Email PhonePe Support:**
- Email: support@phonepe.com
- Ask: "I need Payment Gateway Merchant ID and Salt Key for SANDBOX environment"
- Mention: "I'm getting KEY_NOT_CONFIGURED error with my current credentials"

## 💡 Why This Happens

PhonePe has **two separate credential systems**:

1. **OAuth Credentials** (Client ID/Secret)
   - For: Reporting APIs, Subscription APIs
   - NOT for: Payment Gateway

2. **Payment Gateway Credentials** (Merchant ID/Salt Key)
   - For: Creating payments, processing transactions
   - What we need!

Sometimes PhonePe support says "Client Secret = Salt Key" but they might mean:
- "Use your Client Secret as Salt Key" (if they're the same)
- OR "Get separate Salt Key from Payment Gateway section"

**Best approach:** Check Payment Gateway section in dashboard first!

