import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Payment Storage Utility
 * Uses in-memory storage for serverless environments (Vercel)
 * Falls back to file-based storage for local development
 * 
 * Note: In production, you should use a proper database (MongoDB, PostgreSQL, etc.)
 * This is a temporary solution that can be easily migrated to a database.
 */

// In-memory storage for serverless environments
let inMemoryPayments = [];

// Check if we're in a serverless environment (read-only filesystem)
// Vercel sets VERCEL=1, and filesystem is read-only except /tmp
const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME || (() => {
  // Try to detect read-only filesystem
  try {
    const testDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(testDir)) {
      try {
        fs.mkdirSync(testDir, { recursive: true });
        fs.rmdirSync(testDir);
        return false; // Can write
      } catch {
        return true; // Cannot write, likely serverless
      }
    }
    return false; // Directory exists, assume we can write
  } catch {
    return true; // Error accessing filesystem, likely serverless
  }
})();

const PAYMENTS_DIR = isServerless ? null : path.join(process.cwd(), 'data', 'payments');
const PAYMENTS_FILE = isServerless ? null : path.join(PAYMENTS_DIR, 'payments.json');

if (isServerless) {
  console.log('📦 Serverless environment detected - using in-memory payment storage');
} else {
  console.log('💾 Local environment detected - using file-based payment storage');
}

// Ensure payments directory exists (only for non-serverless)
function ensurePaymentsDirectory() {
  if (isServerless || !PAYMENTS_DIR) return;
  try {
    if (!fs.existsSync(PAYMENTS_DIR)) {
      fs.mkdirSync(PAYMENTS_DIR, { recursive: true });
    }
  } catch (error) {
    console.warn('Could not create payments directory:', error.message);
  }
}

// Load all payments
function loadPayments() {
  if (isServerless) {
    // Return in-memory storage
    return inMemoryPayments;
  }
  
  // Try to load from file
  try {
    ensurePaymentsDirectory();
    if (!PAYMENTS_FILE || !fs.existsSync(PAYMENTS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(PAYMENTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('Error loading payments from file, using in-memory storage:', error.message);
    return inMemoryPayments; // Fallback to in-memory
  }
}

// Save payments
function savePayments(payments) {
  if (isServerless) {
    // Save to in-memory storage
    inMemoryPayments = payments;
    return true;
  }
  
  // Try to save to file
  try {
    ensurePaymentsDirectory();
    if (PAYMENTS_FILE) {
      fs.writeFileSync(PAYMENTS_FILE, JSON.stringify(payments, null, 2), 'utf8');
      return true;
    }
  } catch (error) {
    console.warn('Error saving payments to file, using in-memory storage:', error.message);
    // Fallback to in-memory storage
    inMemoryPayments = payments;
    return true;
  }
  
  return false;
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

