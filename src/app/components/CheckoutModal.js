'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import basicInfo from '../../data/basicInfo.json';

export default function CheckoutModal({ service, onClose }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [customerDetails, setCustomerDetails] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });

  const { name } = basicInfo.personalInfo;

  // PhonePe doesn't require loading a script - we redirect to their payment page

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCustomerDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckout = async () => {
    // Validate required fields
    if (!customerDetails.name || !customerDetails.email || !customerDetails.phone) {
      alert('Please fill in all required fields (Name, Email, Phone)');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerDetails.email)) {
      alert('Please enter a valid email address');
      return;
    }

    // Validate phone (basic validation)
    if (customerDetails.phone.length < 10) {
      alert('Please enter a valid phone number');
      return;
    }

    setIsProcessing(true);

    try {
      // Create PhonePe payment order on your backend
      const response = await fetch('/api/create-phonepe-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          amount: parseFloat(service.price) * 100, // Convert to paise
          serviceId: service.id,
          serviceName: service.title,
          customerDetails: customerDetails
        }),
      });

      const orderData = await response.json();

      if (!response.ok) {
        // Show detailed error message
        let errorMessage = orderData.details 
          ? `${orderData.error || 'Payment failed'}: ${orderData.details}`
          : orderData.error || 'Failed to create payment order';
        
        // Add suggestion if available
        if (orderData.suggestion) {
          errorMessage += `\n\n${orderData.suggestion}`;
        }
        
        // Check if it's a configuration error
        if (orderData.missingVariables) {
          alert(`Configuration Error: ${errorMessage}\n\nPlease contact support or check your payment gateway configuration.`);
        } else if (orderData.details && orderData.details.includes('key not found')) {
          alert(`PhonePe Authentication Error\n\n${errorMessage}\n\nThis usually means:\n• Merchant ID is incorrect\n• Salt Key doesn't match Merchant ID\n• Wrong environment (SANDBOX vs PRODUCTION)\n• Merchant account not activated\n\nPlease check your PhonePe credentials in Vercel environment variables.`);
        } else {
          alert(`Payment Error: ${errorMessage}`);
        }
        
        setIsProcessing(false);
        return;
      }

      if (!orderData.success || !orderData.paymentUrl) {
        throw new Error(orderData.error || 'Payment URL not received');
      }

      // Redirect to PhonePe payment page
      window.location.href = orderData.paymentUrl;
    } catch (error) {
      console.error('Payment error:', error);
      
      // Show user-friendly error message
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        alert('Network error: Please check your internet connection and try again.');
      } else {
        alert(`Payment Error: ${error.message || 'Payment initiation failed. Please try again.'}`);
      }
      
      setIsProcessing(false);
    }
  };

  // Payment verification is now handled on the success page
  // No need for this function anymore as PhonePe redirects to success page

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Checkout</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Service Details */}
            <div className="bg-indigo-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">{service.title}</h3>
              <p className="text-sm text-gray-700 mb-2">{service.description}</p>
              <div className="flex items-baseline">
                <span className="text-2xl font-bold text-indigo-600">₹{service.price}</span>
                {service.priceType && (
                  <span className="text-gray-500 ml-2 text-sm">/{service.priceType}</span>
                )}
              </div>
            </div>

            {/* Customer Details Form */}
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={customerDetails.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={customerDetails.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={customerDetails.phone}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                  placeholder="Enter your phone number"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Project Details (Optional)
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={customerDetails.message}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                  placeholder="Tell me about your project requirements..."
                />
              </div>
            </div>

            {/* Checkout Button */}
            <div className="mt-6">
              <motion.button
                onClick={handleCheckout}
                disabled={isProcessing}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                whileHover={{ scale: isProcessing ? 1 : 1.02 }}
                whileTap={{ scale: isProcessing ? 1 : 0.98 }}
              >
                {isProcessing ? 'Processing...' : `Proceed to Pay ₹${service.price}`}
              </motion.button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              Secure payment powered by PhonePe
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

