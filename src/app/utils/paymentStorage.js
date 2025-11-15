import fs from 'fs';
import path from 'path';

/**
 * Payment Storage Utility
 * Simple file-based storage for payment records
 * 
 * Note: In production, you should use a proper database (MongoDB, PostgreSQL, etc.)
 * This is a temporary solution that can be easily migrated to a database.
 */

const PAYMENTS_DIR = path.join(process.cwd(), 'data', 'payments');
const PAYMENTS_FILE = path.join(PAYMENTS_DIR, 'payments.json');

// Ensure payments directory exists
function ensurePaymentsDirectory() {
  if (!fs.existsSync(PAYMENTS_DIR)) {
    fs.mkdirSync(PAYMENTS_DIR, { recursive: true });
  }
}

// Load all payments from file
function loadPayments() {
  try {
    ensurePaymentsDirectory();
    if (!fs.existsSync(PAYMENTS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(PAYMENTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading payments:', error);
    return [];
  }
}

// Save payments to file
function savePayments(payments) {
  try {
    ensurePaymentsDirectory();
    fs.writeFileSync(PAYMENTS_FILE, JSON.stringify(payments, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving payments:', error);
    return false;
  }
}

/**
 * Save a payment record
 */
export function savePayment(paymentData) {
  try {
    const payments = loadPayments();
    
    const payment = {
      id: paymentData.merchantTransactionId || `payment_${Date.now()}`,
      merchantTransactionId: paymentData.merchantTransactionId,
      transactionId: paymentData.transactionId,
      status: paymentData.status || 'pending',
      amount: paymentData.amount,
      serviceId: paymentData.serviceId,
      serviceName: paymentData.serviceName,
      customerName: paymentData.customerName,
      customerEmail: paymentData.customerEmail,
      customerPhone: paymentData.customerPhone,
      customerMessage: paymentData.customerMessage,
      paymentMode: paymentData.paymentMode,
      paymentState: paymentData.paymentState,
      errorCode: paymentData.errorCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      environment: paymentData.environment || 'SANDBOX',
      ...paymentData
    };

    // Check if payment already exists (update) or create new
    const existingIndex = payments.findIndex(
      p => p.merchantTransactionId === payment.merchantTransactionId
    );

    if (existingIndex >= 0) {
      // Update existing payment
      payments[existingIndex] = {
        ...payments[existingIndex],
        ...payment,
        createdAt: payments[existingIndex].createdAt, // Preserve original creation date
        updatedAt: new Date().toISOString()
      };
    } else {
      // Add new payment
      payments.push(payment);
    }

    savePayments(payments);
    console.log(`✅ Payment saved: ${payment.merchantTransactionId}`);
    return payment;
  } catch (error) {
    console.error('❌ Error saving payment:', error);
    throw error;
  }
}

/**
 * Update payment status
 */
export function updatePaymentStatus(merchantTransactionId, status, additionalData = {}) {
  try {
    const payments = loadPayments();
    const paymentIndex = payments.findIndex(
      p => p.merchantTransactionId === merchantTransactionId
    );

    if (paymentIndex >= 0) {
      payments[paymentIndex] = {
        ...payments[paymentIndex],
        status,
        updatedAt: new Date().toISOString(),
        ...additionalData
      };
      savePayments(payments);
      console.log(`✅ Payment status updated: ${merchantTransactionId} -> ${status}`);
      return payments[paymentIndex];
    } else {
      console.warn(`⚠️  Payment not found: ${merchantTransactionId}`);
      return null;
    }
  } catch (error) {
    console.error('❌ Error updating payment status:', error);
    throw error;
  }
}

/**
 * Get payment by merchant transaction ID
 */
export function getPayment(merchantTransactionId) {
  try {
    const payments = loadPayments();
    return payments.find(p => p.merchantTransactionId === merchantTransactionId) || null;
  } catch (error) {
    console.error('❌ Error getting payment:', error);
    return null;
  }
}

/**
 * Get all payments (with optional filters)
 */
export function getAllPayments(filters = {}) {
  try {
    let payments = loadPayments();

    // Apply filters
    if (filters.status) {
      payments = payments.filter(p => p.status === filters.status);
    }
    if (filters.environment) {
      payments = payments.filter(p => p.environment === filters.environment);
    }
    if (filters.customerEmail) {
      payments = payments.filter(p => p.customerEmail === filters.customerEmail);
    }

    // Sort by created date (newest first)
    payments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return payments;
  } catch (error) {
    console.error('❌ Error getting payments:', error);
    return [];
  }
}

/**
 * Get payment statistics
 */
export function getPaymentStats() {
  try {
    const payments = loadPayments();
    
    const stats = {
      total: payments.length,
      successful: payments.filter(p => p.status === 'completed' || p.status === 'success').length,
      failed: payments.filter(p => p.status === 'failed').length,
      pending: payments.filter(p => p.status === 'pending').length,
      totalAmount: payments
        .filter(p => p.status === 'completed' || p.status === 'success')
        .reduce((sum, p) => sum + (p.amount || 0), 0),
      byEnvironment: {
        SANDBOX: payments.filter(p => p.environment === 'SANDBOX').length,
        PRODUCTION: payments.filter(p => p.environment === 'PRODUCTION').length
      }
    };

    return stats;
  } catch (error) {
    console.error('❌ Error getting payment stats:', error);
    return null;
  }
}

