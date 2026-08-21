const Razorpay = require('razorpay');

let razorpay = null;

function getClient() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw Object.assign(
      new Error('Payment gateway is not configured yet. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env.'),
      { status: 503 }
    );
  }
  if (!razorpay) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
}

// amountInRupees: e.g. 1499.00 -> Razorpay wants the smallest currency unit (paise)
async function createOrder({ amountInRupees, receipt }) {
  return getClient().orders.create({
    amount: Math.round(amountInRupees * 100),
    currency: 'INR',
    receipt,
  });
}

module.exports = { createOrder };
