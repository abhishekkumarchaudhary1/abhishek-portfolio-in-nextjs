# PhonePe Credentials Guide: Client ID/Secret vs Merchant ID/Salt Key

## 🔑 Two Types of PhonePe Credentials

PhonePe has **two different sets of credentials** for different purposes:

### 1. **Client ID & Client Secret** (OAuth)
- **Used for:** OAuth-based APIs, reporting APIs, subscription APIs
- **Authentication:** Requires getting an access token first
- **Not for:** Payment gateway transactions

### 2. **Merchant ID & Salt Key** (Payment Gateway)
- **Used for:** Payment gateway integration (what we need!)
- **Authentication:** Signature-based (X-VERIFY header)
- **Required for:** Creating payments, verifying payments

---

## ✅ What You Need for Payment Gateway

For the payment integration, you need:
- ✅ **Merchant ID** (not Client ID)
- ✅ **Salt Key** (not Client Secret)
- ✅ **Salt Index** (usually `1`)

---

## 📍 Where to Find Payment Gateway Credentials

### Option 1: PhonePe Developer Portal

1. Go to **[developer.phonepe.com](https://developer.phonepe.com/)**
2. Log in with your PhonePe Business account
3. Look for these sections:
   - **"Payment Gateway"** or **"PG Settings"**
   - **"API Credentials"** → **"Payment Gateway"**
   - **"Integration"** → **"Payment Gateway"**

4. You should see:
   - **Merchant ID** (or Merchant Key)
   - **Salt Key** (click "Show" if hidden)
   - **Salt Index**

### Option 2: PhonePe Business Dashboard

1. Go to **[business.phonepe.com](https://business.phonepe.com/)**
2. Log in to your account
3. Navigate to:
   - **Settings** → **API Settings** → **Payment Gateway**
   - **Developer** → **Payment Gateway Credentials**
   - **Integration** → **Payment Gateway**

### Option 3: Check Your Onboarding Email

- Look for emails from PhonePe when you signed up
- They usually send payment gateway credentials separately
- Check for subject lines like "Payment Gateway Integration" or "API Credentials"

---

## 🔄 If You Only Have Client ID/Secret

If you **only** have Client ID and Client Secret, you have two options:

### Option A: Get Payment Gateway Credentials (Recommended)

1. **Contact PhonePe Support:**
   - Email: support@phonepe.com
   - Subject: "Request Payment Gateway Credentials (Merchant ID and Salt Key)"
   - Include: Your Client ID and business details
   - Ask: "I need Merchant ID and Salt Key for payment gateway integration"

2. **Check PhonePe Dashboard:**
   - Sometimes they're in a different section
   - Look for "Payment Gateway" or "PG" tabs
   - Check all settings sections

### Option B: Use OAuth Authentication (Alternative)

If PhonePe confirms you should use Client ID/Secret, we can update the code to:
1. Get an OAuth access token using Client ID/Secret
2. Use that token for API calls

**However**, this is less common for payment gateway. Most payment gateways use signature-based auth.

---

## 🎯 Quick Check: Which Credentials Do You Have?

### You have Client ID/Secret if:
- ✅ You see "Client ID" and "Client Secret" in your dashboard
- ✅ They're in an "OAuth" or "API Access" section
- ✅ You received them for API access/reporting

### You need Merchant ID/Salt Key if:
- ✅ You want to process payments
- ✅ You're integrating payment gateway
- ✅ You need to create payment orders

---

## 📝 What to Do Next

1. **Check PhonePe Developer Portal:**
   - Look specifically for "Payment Gateway" section
   - Not "OAuth" or "API Access" section

2. **If you can't find them:**
   - Contact PhonePe support
   - Ask specifically for "Payment Gateway credentials: Merchant ID and Salt Key"

3. **Once you have them:**
   - Add to Vercel environment variables:
     ```
     PHONEPE_MERCHANT_ID=your_merchant_id
     PHONEPE_SALT_KEY=your_salt_key
     PHONEPE_SALT_INDEX=1
     ```

---

## 💡 Still Confused?

**Tell me:**
1. Where did you see Client ID/Secret? (which section of the dashboard)
2. Do you see any "Payment Gateway" or "PG" section?
3. What does PhonePe support say about payment gateway credentials?

I can help you locate the right credentials or update the code to use OAuth if that's what PhonePe requires!







