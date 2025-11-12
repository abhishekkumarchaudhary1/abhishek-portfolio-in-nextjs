# PhonePe SDK Setup Guide

## ✅ Code Updated to Use Official PhonePe SDK

Your code has been updated to use PhonePe's official Node.js SDK (`pg-sdk-node`) instead of manual API calls.

## 🔄 Environment Variables Update Required

**IMPORTANT:** You need to update your Vercel environment variables!

### Old Variables (Remove these):
- ❌ `PHONEPE_MERCHANT_ID`
- ❌ `PHONEPE_SALT_KEY`
- ❌ `PHONEPE_SALT_INDEX`

### New Variables (Add these):
- ✅ `PHONEPE_CLIENT_ID` - Your Client ID from PhonePe dashboard
- ✅ `PHONEPE_CLIENT_SECRET` - Your Client Secret from PhonePe dashboard
- ✅ `PHONEPE_CLIENT_VERSION` - Usually `1.0.0` (optional, defaults to 1.0.0)
- ✅ `PHONEPE_ENVIRONMENT` - `SANDBOX` or `PRODUCTION` (optional, defaults to SANDBOX)

## 📝 Steps to Update Vercel Environment Variables

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Select your project

2. **Go to Settings → Environment Variables**

3. **Remove old variables:**
   - Delete `PHONEPE_MERCHANT_ID`
   - Delete `PHONEPE_SALT_KEY`
   - Delete `PHONEPE_SALT_INDEX` (if exists)

4. **Add new variables:**
   ```
   Name: PHONEPE_CLIENT_ID
   Value: [Your Client ID from PhonePe dashboard]
   Environment: Production, Preview, Development (select all)
   ```

   ```
   Name: PHONEPE_CLIENT_SECRET
   Value: [Your Client Secret from PhonePe dashboard]
   Environment: Production, Preview, Development (select all)
   ```

   ```
   Name: PHONEPE_CLIENT_VERSION
   Value: 1.0.0
   Environment: Production, Preview, Development (select all)
   ```

   ```
   Name: PHONEPE_ENVIRONMENT
   Value: SANDBOX
   Environment: Production, Preview, Development (select all)
   ```

5. **Redeploy your application:**
   - Go to Deployments
   - Click "Redeploy" on the latest deployment
   - ⚠️ **Important:** Vercel doesn't auto-redeploy when env vars change!

## 🎯 What Changed in the Code

### Before (Manual API):
- Used Merchant ID + Salt Key
- Manual signature generation
- Manual API calls with fetch()

### After (SDK):
- Uses Client ID + Client Secret
- SDK handles all authentication
- SDK handles API calls
- Simpler and more reliable

## ✅ Benefits of Using SDK

1. **Simpler:** No manual signature generation
2. **Reliable:** SDK handles all edge cases
3. **Official:** Supported by PhonePe
4. **Maintained:** PhonePe updates SDK automatically

## 🔍 Testing

After updating environment variables and redeploying:

1. Try making a payment
2. Check Vercel logs for any errors
3. If you see errors, verify:
   - Client ID is correct
   - Client Secret is correct
   - Environment matches (SANDBOX for test, PRODUCTION for live)

## 📞 Need Help?

If you encounter any issues:
1. Check Vercel logs for detailed error messages
2. Verify environment variables are set correctly
3. Make sure you redeployed after updating env vars
4. Contact PhonePe support if credentials are incorrect

