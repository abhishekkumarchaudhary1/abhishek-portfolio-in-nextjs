'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [paymentStatus, setPaymentStatus] = useState('verifying');
  const [paymentData, setPaymentData] = useState(null);

  const transactionId = searchParams.get('transactionId');

  useEffect(() => {
    if (!transactionId) {
      setPaymentStatus('error');
      return;
    }

    // Verify payment status
    const verifyPayment = async () => {
      try {
        const response = await fetch('/api/verify-phonepe-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ merchantTransactionId: transactionId }),
        });

        const data = await response.json();

        // Handle different payment states from SDK
        if (data.success || data.isCompleted) {
          setPaymentStatus('success');
          setPaymentData(data);
        } else if (data.isPending) {
          // Payment is still pending - show pending state
          setPaymentStatus('pending');
          setPaymentData(data);
        } else if (data.isFailed || data.paymentStatus === 'FAILED') {
          setPaymentStatus('failed');
          setPaymentData(data);
        } else if (data.error && (data.errorCode === 'ORDER_NOT_FOUND' || data.details?.includes('ORDER_NOT_FOUND'))) {
          // ORDER_NOT_FOUND - might be timing issue, show pending with retry option
          setPaymentStatus('pending');
          setPaymentData({
            ...data,
            isRetryable: true,
            errorMessage: 'Order verification in progress. PhonePe may need a moment to process. Please wait...'
          });
        } else {
          setPaymentStatus('failed');
          setPaymentData(data);
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setPaymentStatus('error');
      }
    };

    verifyPayment();
  }, [transactionId]);

  const handlePrintReceipt = () => {
    const printWindow = window.open('', '_blank');
    const receiptContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Receipt</title>
          <style>
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
            body {
              font-family: Arial, sans-serif;
              max-width: 600px;
              margin: 40px auto;
              padding: 20px;
              background: white;
            }
            .receipt-header {
              text-align: center;
              border-bottom: 2px solid #4F46E5;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .receipt-header h1 {
              color: #4F46E5;
              margin: 0;
              font-size: 28px;
            }
            .receipt-header p {
              color: #666;
              margin: 5px 0;
            }
            .receipt-body {
              margin: 30px 0;
            }
            .receipt-section {
              margin-bottom: 25px;
            }
            .receipt-section h2 {
              color: #333;
              font-size: 18px;
              border-bottom: 1px solid #eee;
              padding-bottom: 10px;
              margin-bottom: 15px;
            }
            .receipt-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #f0f0f0;
            }
            .receipt-row:last-child {
              border-bottom: none;
            }
            .receipt-label {
              font-weight: 600;
              color: #666;
            }
            .receipt-value {
              color: #333;
              text-align: right;
            }
            .amount-highlight {
              background: #f0f9ff;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .amount-highlight .receipt-value {
              font-size: 24px;
              font-weight: bold;
              color: #059669;
            }
            .receipt-footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #eee;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
            .success-badge {
              display: inline-block;
              background: #10b981;
              color: white;
              padding: 5px 15px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 600;
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <div class="receipt-header">
            <h1>Payment Receipt</h1>
            <p>Abhishek Kumar Chaudhary</p>
            <p>Full Stack Developer</p>
            <div class="success-badge">✓ Payment Successful</div>
          </div>
          
          <div class="receipt-body">
            <div class="receipt-section">
              <h2>Transaction Details</h2>
              ${paymentData?.transactionId ? `
                <div class="receipt-row">
                  <span class="receipt-label">Transaction ID:</span>
                  <span class="receipt-value">${paymentData.transactionId}</span>
                </div>
              ` : ''}
              ${paymentData?.merchantTransactionId ? `
                <div class="receipt-row">
                  <span class="receipt-label">Order ID:</span>
                  <span class="receipt-value">${paymentData.merchantTransactionId}</span>
                </div>
              ` : ''}
              ${paymentData?.orderId && paymentData.orderId !== paymentData.transactionId ? `
                <div class="receipt-row">
                  <span class="receipt-label">Reference ID:</span>
                  <span class="receipt-value">${paymentData.orderId}</span>
                </div>
              ` : ''}
              <div class="receipt-row">
                <span class="receipt-label">Payment Date:</span>
                <span class="receipt-value">${new Date().toLocaleString('en-IN', { 
                  timeZone: 'Asia/Kolkata',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
              </div>
              ${paymentData?.paymentMode ? `
                <div class="receipt-row">
                  <span class="receipt-label">Payment Method:</span>
                  <span class="receipt-value">${paymentData.paymentMode}</span>
                </div>
              ` : ''}
            </div>

            ${paymentData?.customerName || paymentData?.serviceName ? `
              <div class="receipt-section">
                <h2>Service Details</h2>
                ${paymentData?.serviceName ? `
                  <div class="receipt-row">
                    <span class="receipt-label">Service:</span>
                    <span class="receipt-value">${paymentData.serviceName}</span>
                  </div>
                ` : ''}
                ${paymentData?.customerName ? `
                  <div class="receipt-row">
                    <span class="receipt-label">Customer Name:</span>
                    <span class="receipt-value">${paymentData.customerName}</span>
                  </div>
                ` : ''}
                ${paymentData?.customerEmail ? `
                  <div class="receipt-row">
                    <span class="receipt-label">Email:</span>
                    <span class="receipt-value">${paymentData.customerEmail}</span>
                  </div>
                ` : ''}
                ${paymentData?.customerPhone ? `
                  <div class="receipt-row">
                    <span class="receipt-label">Phone:</span>
                    <span class="receipt-value">${paymentData.customerPhone}</span>
                  </div>
                ` : ''}
              </div>
            ` : ''}

            <div class="receipt-section">
              <h2>Payment Summary</h2>
              <div class="amount-highlight">
                <div class="receipt-row">
                  <span class="receipt-label">Amount Paid:</span>
                  <span class="receipt-value">₹${paymentData?.amount ? (paymentData.amount / 100).toFixed(2) : '0.00'}</span>
                </div>
              </div>
              <div class="receipt-row">
                <span class="receipt-label">Status:</span>
                <span class="receipt-value" style="color: #059669; font-weight: 600;">✓ Completed</span>
              </div>
            </div>
          </div>

          <div class="receipt-footer">
            <p>This is a computer-generated receipt. No signature is required.</p>
            <p>For any queries, contact: support@abhishek-chaudhary.com</p>
            <p>Printed on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(receiptContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {paymentStatus === 'verifying' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying Payment...</h2>
            <p className="text-gray-600">Please wait while we verify your payment.</p>
          </>
        )}

        {paymentStatus === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-600 mb-4">
              Thank you for your payment. Your transaction has been completed successfully.
            </p>
            {paymentData && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
                {paymentData.transactionId && (
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Transaction ID:</span> {paymentData.transactionId}
                  </p>
                )}
                {paymentData.orderId && paymentData.orderId !== paymentData.transactionId && (
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="font-semibold">Order ID:</span> {paymentData.orderId}
                  </p>
                )}
                {paymentData.amount && (
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="font-semibold">Amount:</span> ₹{(paymentData.amount / 100).toFixed(2)}
                  </p>
                )}
                {paymentData.merchantTransactionId && (
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="font-semibold">Merchant Order ID:</span> {paymentData.merchantTransactionId}
                  </p>
                )}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handlePrintReceipt}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Receipt
              </button>
              <button
                onClick={() => router.push('/')}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Return to Home
              </button>
            </div>
          </>
        )}

        {paymentStatus === 'pending' && (
          <>
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-600"></div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Verification</h2>
            {paymentData?.warning ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-left">
                  <p className="text-sm text-blue-800 font-semibold mb-1">⚠️ Verification Note</p>
                  <p className="text-sm text-blue-700">{paymentData.warning}</p>
                  {paymentData.note && (
                    <p className="text-xs text-blue-600 mt-2">{paymentData.note}</p>
                  )}
                </div>
                {paymentData?.isCompleted && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-green-800 font-semibold">✓ Payment Record Found</p>
                    <p className="text-xs text-green-700 mt-1">Your payment information is available. PhonePe verification will update shortly.</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-600 mb-4">
                {paymentData?.errorMessage || 'Your payment is being processed. Please wait a few moments and refresh this page.'}
              </p>
            )}
            {paymentData && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
                {paymentData.transactionId && (
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Transaction ID:</span> {paymentData.transactionId}
                  </p>
                )}
                {paymentData.merchantTransactionId && (
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="font-semibold">Order ID:</span> {paymentData.merchantTransactionId}
                  </p>
                )}
                {paymentData.amount && (
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="font-semibold">Amount:</span> ₹{(paymentData.amount / 100).toFixed(2)}
                  </p>
                )}
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors mb-2"
            >
              Refresh Status
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Return to Home
            </button>
          </>
        )}

        {paymentStatus === 'failed' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>
            <p className="text-gray-600 mb-4">
              Your payment could not be processed. Please try again.
            </p>
            {paymentData?.errorCode && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Error Code:</span> {paymentData.errorCode}
                </p>
                {paymentData.detailedErrorCode && (
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-semibold">Details:</span> {paymentData.detailedErrorCode}
                  </p>
                )}
              </div>
            )}
            <button
              onClick={() => router.push('/')}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Return to Home
            </button>
          </>
        )}

        {paymentStatus === 'error' && (
          <>
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Error</h2>
            <p className="text-gray-600 mb-4">
              We couldn&apos;t verify your payment status. Please contact support if the amount was deducted.
            </p>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Return to Home
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}

