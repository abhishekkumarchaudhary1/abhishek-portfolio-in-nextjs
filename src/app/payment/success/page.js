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
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Transaction ID:</span> {paymentData.transactionId}
                </p>
                {paymentData.amount && (
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="font-semibold">Amount:</span> ₹{(paymentData.amount / 100).toFixed(2)}
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

        {paymentStatus === 'pending' && (
          <>
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-600"></div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Pending</h2>
            <p className="text-gray-600 mb-4">
              Your payment is being processed. Please wait a few moments and refresh this page.
            </p>
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

