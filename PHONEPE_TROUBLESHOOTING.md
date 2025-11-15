# PhonePe Payment Troubleshooting Guide

## Error: "key not found for the merchant"

This error means PhonePe cannot authenticate your request. Here's how to fix it:

---

## ✅ Solution Checklist

### 1. **Verify Merchant ID is Correct**

- Go to [developer.phonepe.com](https://developer.phonepe.com/)
- Log in to your PhonePe Business account
- Navigate to **Developer Settings** or **API Settings**
- Copy your **Merchant ID** exactly (case-sensitive, no spaces)
- Make sure it matches what's in your Vercel environment variables

**Common Issues:**
- ❌ Extra spaces before/after the Merchant ID
- ❌ Wrong Merchant ID (using test ID in production or vice versa)
- ❌ Merchant ID not activated/approved by PhonePe

---

### 2. **Verify Salt Key Matches Merchant ID**

- The Salt Key must belong to the same Merchant ID
- Go to PhonePe Developer Portal
- Find the Salt Key for your specific Merchant ID
- Copy it exactly (it's a long string, make sure you get the whole thing)

**Common Issues:**
- ❌ Salt Key from a different Merchant ID
- ❌ Salt Key truncated (not copied completely)
- ❌ Extra spaces or line breaks in Salt Key

---

### 3. **Check Environment Match**

**CRITICAL:** Your credentials must match the environment you're using!

#### For Testing (SANDBOX):
```env
PHONEPE_ENVIRONMENT=SANDBOX
PHONEPE_MERCHANT_ID=your_sandbox_merchant_id
PHONEPE_SALT_KEY=your_sandbox_salt_key
```

#### For Production:
```env
PHONEPE_ENVIRONMENT=PRODUCTION
PHONEPE_MERCHANT_ID=your_production_merchant_id
PHONEPE_SALT_KEY=your_production_salt_key
```

**Common Issues:**
- ❌ Using SANDBOX credentials with `PHONEPE_ENVIRONMENT=PRODUCTION`
- ❌ Using PRODUCTION credentials with `PHONEPE_ENVIRONMENT=SANDBOX`
- ❌ Mixing SANDBOX Merchant ID with PRODUCTION Salt Key (or vice versa)

---

### 4. **Verify Merchant Account Status**

- Log in to PhonePe Business Dashboard
- Check if your merchant account is **activated** and **approved**
- Some accounts need approval before API access is enabled
- Contact PhonePe support if your account shows as "Pending" or "Inactive"

---

### 5. **Check Vercel Environment Variables**

1. Go to Vercel Dashboard → Your Project
2. Settings → Environment Variables
3. Verify these are set correctly:
   ```
   PHONEPE_MERCHANT_ID=your_merchant_id
   PHONEPE_SALT_KEY=your_salt_key
   PHONEPE_SALT_INDEX=1
   PHONEPE_ENVIRONMENT=SANDBOX  (or PRODUCTION)
   ```

4. **Important:** After adding/updating variables:
   - **Redeploy your application** (Vercel doesn't auto-redeploy on env var changes)
   - Go to Deployments → Click "Redeploy" on latest deployment

---

## 🔍 How to Verify Your Credentials

### Step 1: Get Credentials from PhonePe

1. Visit [developer.phonepe.com](https://developer.phonepe.com/)
2. Log in with your PhonePe Business account
3. Go to **Developer Settings** → **API Settings**
4. You should see:
   - **Merchant ID** (also called Merchant Key)
   - **Salt Key** (click "Show" or "Reveal" if hidden)
   - **Salt Index** (usually `1`)
   - **Environment** (SANDBOX or PRODUCTION)

### Step 2: Verify in Vercel

1. Go to Vercel → Your Project → Settings → Environment Variables
2. Check each variable:
   - `PHONEPE_MERCHANT_ID` - Should match exactly
   - `PHONEPE_SALT_KEY` - Should match exactly (no spaces)
   - `PHONEPE_SALT_INDEX` - Should be `1` (or whatever PhonePe shows)
   - `PHONEPE_ENVIRONMENT` - Should match the environment of your credentials

### Step 3: Test Again

After updating and redeploying, try the payment again.

---

## 📋 Common Scenarios

### Scenario 1: Just Set Up PhonePe Account

**Problem:** New account, credentials not activated yet

**Solution:**
- Wait for PhonePe to activate your account (can take 24-48 hours)
- Contact PhonePe support: support@phonepe.com
- Ask them to activate API access for your merchant account

---

### Scenario 2: Using Test/Sandbox Credentials

**Problem:** Trying to use SANDBOX credentials but getting errors

**Solution:**
- Make sure `PHONEPE_ENVIRONMENT=SANDBOX` in Vercel
- Verify you're using SANDBOX Merchant ID and Salt Key
- Check PhonePe Developer Portal for SANDBOX-specific credentials

---

### Scenario 3: Going Live (Production)

**Problem:** Works in SANDBOX but fails in PRODUCTION

**Solution:**
- Get PRODUCTION credentials from PhonePe (different from SANDBOX)
- Update all three: Merchant ID, Salt Key, Salt Index
- Set `PHONEPE_ENVIRONMENT=PRODUCTION`
- Redeploy application

---

### Scenario 4: Credentials Look Correct But Still Failing

**Problem:** Everything looks right but still getting "key not found"

**Solution:**
1. **Double-check for hidden characters:**
   - Copy credentials again from PhonePe
   - Paste into a text editor first
   - Remove any extra spaces or line breaks
   - Copy again and paste into Vercel

2. **Verify Salt Key format:**
   - Should be one long string
   - No spaces or dashes
   - Usually 32+ characters

3. **Check Merchant ID format:**
   - Usually starts with "MERCHANT" or similar
   - Case-sensitive
   - No special characters

4. **Contact PhonePe Support:**
   - Email: support@phonepe.com
   - Include your Merchant ID
   - Ask them to verify your API credentials are correct

---

## 🛠️ Quick Fix Steps

1. ✅ Go to PhonePe Developer Portal
2. ✅ Copy Merchant ID, Salt Key, Salt Index
3. ✅ Verify environment (SANDBOX or PRODUCTION)
4. ✅ Update Vercel environment variables
5. ✅ **Redeploy application** (important!)
6. ✅ Test payment again

---

## 📞 Need Help?

If you've tried everything and still getting errors:

1. **Check Vercel Logs:**
   - Go to Vercel Dashboard → Your Project → Deployments
   - Click latest deployment → Functions tab
   - Check `/api/create-phonepe-order` logs
   - Look for detailed error messages

2. **Contact PhonePe Support:**
   - Email: support@phonepe.com
   - Include:
     - Your Merchant ID
     - Error message: "key not found for the merchant"
     - Screenshot of your API settings (hide sensitive data)

3. **Verify Account Status:**
   - Log in to PhonePe Business Dashboard
   - Check account status
   - Ensure API access is enabled

---

## ✅ Success Checklist

Once fixed, you should see:
- ✅ No "key not found" error
- ✅ Payment order created successfully
- ✅ Redirect to PhonePe payment page
- ✅ Payment completes successfully

---

## Environment Variables Template

```env
# PhonePe Configuration
PHONEPE_MERCHANT_ID=YOUR_MERCHANT_ID_HERE
PHONEPE_SALT_KEY=YOUR_SALT_KEY_HERE
PHONEPE_SALT_INDEX=1
PHONEPE_ENVIRONMENT=SANDBOX
NEXT_PUBLIC_BASE_URL=https://abhishek-chaudhary.com
```

**Remember:**
- No quotes around values
- No spaces before/after values
- Case-sensitive
- Must match PhonePe Developer Portal exactly

