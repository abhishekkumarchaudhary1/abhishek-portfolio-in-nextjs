# Payment Gateway Setup Guide

This guide will help you set up both Buy Me a Coffee and Razorpay payment gateways for your portfolio.

## 1. Buy Me a Coffee Setup

### Steps:
1. Go to [buymeacoffee.com](https://www.buymeacoffee.com/)
2. Sign up or log in to your account
3. Get your profile URL (e.g., `https://buymeacoffee.com/yourusername`)
4. Update `src/data/basicInfo.json`:
   ```json
   "buyMeACoffee": "https://buymeacoffee.com/yourusername"
   ```

That's it! The Buy Me a Coffee button will automatically appear on your Contact page and Footer.

## 2. Razorpay Setup (For Indian Payments)

### Prerequisites:
- A Razorpay account (Sign up at [razorpay.com](https://razorpay.com/))
- Node.js and npm installed

### Steps:

#### Step 1: Install Razorpay Package
```bash
npm install razorpay
```

#### Step 2: Get Your Razorpay Keys
1. Log in to your Razorpay Dashboard
2. Go to Settings → API Keys
3. Generate API Keys (or use existing ones)
4. Copy your **Key ID** and **Key Secret**

#### Step 3: Set Environment Variables
Create or update your `.env.local` file in the root directory:

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here

# Public key for frontend (same as Key ID)
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id_here
```

**Important:** 
- Never commit `.env.local` to version control
- The `NEXT_PUBLIC_` prefix makes the variable available in the browser
- Use test keys for development and live keys for production

#### Step 4: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the Contact section
3. Click "Donate via Razorpay"
4. Use Indian Razorpay test cards for testing (see test cards section below):
   - Card Number: `5267 3181 8797 5449` (recommended) or `4111 1111 1111 1111`
   - CVV: Any 3 digits (e.g., 123)
   - Expiry: Any future date (e.g., 12/25)
   - Name: Any name
   - OTP: `123456` (when prompted)

### Razorpay Test Cards (Indian Cards Only)

**Important:** Your Razorpay account accepts Indian cards only. Use these Indian test cards for testing:

| Card Number | Type | CVV | Expiry | OTP | Result |
|------------|------|-----|--------|-----|--------|
| 5267 3181 8797 5449 | Mastercard (Indian) | Any 3 digits | Any future date | 123456 | Success |
| 4111 1111 1111 1111 | Visa (Indian) | Any 3 digits | Any future date | 123456 | Success |
| 5104 0600 0000 0008 | Mastercard (Indian) | Any 3 digits | Any future date | 123456 | Success |

**Testing Instructions:**
- Card Number: Use any of the cards above
- CVV: Any 3 digits (e.g., 123, 456)
- Expiry: Any future date (e.g., 12/25, 06/26)
- Name: Any name
- **OTP: Always use `123456`** when prompted for OTP/authentication

**Note:** International test cards (like 5555 5555 5555 4444) will be rejected with the error: "This business accepts domestic (Indian) card payments only."

### Production Setup

1. Switch to Live Mode in Razorpay Dashboard
2. Generate Live API Keys
3. Update your `.env.local` with live keys
4. Update the Razorpay key in `src/app/components/RazorpayDonation.js` if needed

## 3. Customization

### Changing Donation Amounts
Edit `src/app/components/RazorpayDonation.js`:
```javascript
const predefinedAmounts = [50, 100, 200, 500, 1000]; // Modify these values
```

### Styling
Both buttons use Tailwind CSS classes. You can customize:
- Colors in `Contact.js` and `Footer.js` for Buy Me a Coffee button
- Colors in `RazorpayDonation.js` for Razorpay button

### Adding Payment Success Handler
After successful payment, you can:
1. Send confirmation emails
2. Save payment records to database
3. Show thank you messages

Edit `src/app/api/verify-payment/route.js` to add custom logic.

## 4. Security Notes

- ✅ Never expose `RAZORPAY_KEY_SECRET` in client-side code
- ✅ Always verify payment signatures on the server
- ✅ Use HTTPS in production
- ✅ Keep your API keys secure
- ✅ Regularly rotate your API keys

## 5. Troubleshooting

### Razorpay Script Not Loading
- Check your internet connection
- Verify the Razorpay script URL is accessible
- Check browser console for errors

### Payment Verification Fails
- Verify your `RAZORPAY_KEY_SECRET` is correct
- Check that the signature verification logic is correct
- Ensure you're using the same keys for order creation and verification

### Order Creation Fails
- Verify your Razorpay keys are correct
- Check that the amount is in paise (multiply by 100)
- Ensure your Razorpay account is activated

## Support

For issues:
- Razorpay: [support@razorpay.com](mailto:support@razorpay.com)
- Buy Me a Coffee: Check their help center

