'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RazorpayDonation() {
  const [amount, setAmount] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTestCards, setShowTestCards] = useState(false);

  const predefinedAmounts = [50, 100, 200, 500, 1000];
  
  // Check if we're in test mode (test keys usually start with 'rzp_test_')
  const isTestMode = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.startsWith('rzp_test_') || 
                     !process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  
  const testCards = [
    { 
      number: '5267 3181 8797 5449', 
      cvv: 'Any 3 digits', 
      expiry: 'Any future date', 
      result: 'Success',
      type: 'Mastercard (Indian)',
      note: 'Recommended for Indian payments'
    },
  ];

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (!amount || amount < 1) {
      alert('Please enter a valid amount');
      return;
    }

    setIsProcessing(true);

    try {
      // Load Razorpay script
      const razorpayLoaded = await loadRazorpay();
      if (!razorpayLoaded) {
        alert('Failed to load payment gateway. Please try again.');
        setIsProcessing(false);
        return;
      }

      // Create order on your backend
      const response = await fetch('/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: parseFloat(amount) * 100 }), // Convert to paise
      });

      const orderData = await response.json();

      if (!response.ok) {
        throw new Error(orderData.error || 'Failed to create order');
      }

      // Initialize Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, // Add this to your .env.local
        amount: orderData.amount,
        currency: 'INR',
        name: 'Abhishek Kumar Chaudhary',
        description: 'Donation',
        order_id: orderData.id,
        handler: function (response) {
          // Handle successful payment
          verifyPayment(response);
        },
        prefill: {
          name: '',
          email: '',
          contact: '',
        },
        theme: {
          color: '#4F46E5',
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
      setIsProcessing(false);
    }
  };

  const verifyPayment = async (paymentResponse) => {
    try {
      const response = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentResponse),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert('Payment successful! Thank you for your support.');
        setAmount('');
        setShowModal(false);
      } else {
        alert('Payment verification failed. Please contact support.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      alert('Payment verification failed. Please contact support.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <motion.button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-5 rounded-lg transition-colors shadow-md hover:shadow-lg"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <span>Donate via Razorpay</span>
      </motion.button>

      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
            />
            <motion.div
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white rounded-lg max-w-md w-full shadow-xl max-h-[90vh] flex flex-col"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Fixed Header */}
                <div className="flex justify-between items-center p-6 pb-4 border-b border-gray-200 flex-shrink-0">
                  <h3 className="text-xl font-bold text-gray-900">Make a Donation</h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto flex-1 px-6 py-4">
                  <p className="text-gray-600 mb-4">
                    Thank you for considering a donation! Your support helps me continue creating great content.
                  </p>

                  {isTestMode && (
                  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span className="font-semibold text-yellow-800">Test Mode Active</span>
                        </div>
                        <p className="text-sm text-yellow-700 mb-3">
                          You're in test mode. Use the <strong>Indian test cards</strong> below to simulate payments. No real money will be charged.
                        </p>
                        <div className="text-xs text-yellow-800 bg-yellow-100 p-2 rounded mb-2">
                          <strong>Note:</strong> This account accepts Indian cards only. Use the Indian test cards listed below.
                        </div>
                        <button
                          onClick={() => setShowTestCards(!showTestCards)}
                          className="text-sm text-yellow-800 hover:text-yellow-900 font-medium underline"
                        >
                          {showTestCards ? 'Hide' : 'Show'} Test Cards
                        </button>
                      </div>
                    </div>
                    
                    {showTestCards && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 pt-3 border-t border-yellow-300"
                      >
                        <p className="text-xs font-semibold text-yellow-800 mb-2">Indian Test Card Details:</p>
                        <div className="space-y-2">
                          {testCards.map((card, index) => (
                            <div key={index} className="text-xs bg-white p-2 rounded border border-yellow-200">
                              <div className="flex items-center justify-between mb-1">
                                <div className="font-mono font-semibold text-gray-800">{card.number}</div>
                                <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded">{card.type}</span>
                              </div>
                              <div className="text-gray-600 mt-1">
                                CVV: {card.cvv} | Expiry: {card.expiry} | Result: <span className="text-green-600 font-semibold">{card.result}</span>
                              </div>
                              {card.note && (
                                <div className="text-yellow-700 mt-1 italic text-xs">💡 {card.note}</div>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-xs font-semibold text-blue-800 mb-1">📋 How to Test:</p>
                          <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                            <li>Use any of the Indian test cards above</li>
                            <li>CVV: Any 3 digits (e.g., 123, 456)</li>
                            <li>Expiry: Any future date (e.g., 12/25, 06/26)</li>
                            <li>Name: Any name</li>
                            <li>OTP: Use <strong>123456</strong> when prompted</li>
                          </ul>
                        </div>
                        <p className="text-xs text-yellow-700 mt-2 italic">
                          ⚠️ <strong>Important:</strong> Only Indian test cards work. International cards will be rejected.
                        </p>
                      </motion.div>
                    )}
                  </div>
                  )}

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select or Enter Amount (₹)
                    </label>
                    <div className="grid grid-cols-5 gap-2 mb-3">
                      {predefinedAmounts.map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setAmount(amt.toString())}
                          className={`py-2 px-3 rounded-md border transition-colors ${
                            amount === amt.toString()
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-500'
                          }`}
                        >
                          ₹{amt}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      min="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter custom amount"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                    />
                  </div>
                </div>

                {/* Fixed Footer */}
                <div className="flex space-x-3 p-6 pt-4 border-t border-gray-200 flex-shrink-0">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePayment}
                    disabled={isProcessing || !amount || amount < 1}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? 'Processing...' : 'Proceed to Pay'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

