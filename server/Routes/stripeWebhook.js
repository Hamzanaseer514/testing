// Routes/stripeWebhook.js
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const StudentPayment = require("../Models/studentPaymentSchema");

module.exports = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("⚠️ Webhook signature verification failed:", {
      error: err.message,
      signature: sig,
      bodyLength: req.body.length
    });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Log webhook event
    console.log(`📨 Webhook received: ${event.type}`, {
      id: event.id,
      created: new Date(event.created * 1000),
      livemode: event.livemode
    });

    // Handle different webhook events
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      case 'checkout.session.expired':
        await handleCheckoutSessionExpired(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("❌ Webhook processing failed:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
};

// Handle successful checkout session
async function handleCheckoutSessionCompleted(session) {
  const paymentId = session.metadata.paymentId;
  
  if (!paymentId) {
    console.error("❌ No paymentId found in session metadata");
    return;
  }

  try {
    // Update payment status in database
    const payment = await StudentPayment.findByIdAndUpdate(paymentId, {
      payment_status: "paid",
      validity_status: "active",
      payment_date: new Date(),
      gateway_transaction_id: session.payment_intent,
      academic_level_paid: true,
      validity_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      validity_start_date: new Date()
    }, { new: true });
    
    if (!payment) {
      console.error(`❌ Payment record not found: ${paymentId}`);
      return;
    }
    
    console.log(`✅ Payment confirmed for paymentId: ${paymentId}`);
  } catch (error) {
    console.error(`❌ Failed to update payment ${paymentId}:`, error);
    throw error;
  }
}

// Handle failed payment
async function handlePaymentFailed(paymentIntent) {
  const paymentId = paymentIntent.metadata?.paymentId;
  
  if (!paymentId) {
    console.error("❌ No paymentId found in payment intent metadata");
    return;
  }
  try {
    await StudentPayment.findByIdAndUpdate(paymentId, {
      payment_status: "failed",
      academic_level_paid: false,
      validity_status: "inactive",
      gateway_transaction_id: paymentIntent.id
    });
    
    console.log(`❌ Payment failed for paymentId: ${paymentId}`);
  } catch (error) {
    console.error(`❌ Failed to update failed payment ${paymentId}:`, error);
    throw error;
  }
}

// Handle expired checkout session
async function handleCheckoutSessionExpired(session) {
  const paymentId = session.metadata.paymentId;
  
  if (!paymentId) {
    console.error("❌ No paymentId found in session metadata");
    return;
  }

  try {
    await StudentPayment.findByIdAndUpdate(paymentId, {
      validity_status: "expired",
      is_active: false,
      academic_level_paid: false,
      gateway_transaction_id: session.id
    });
    
    console.log(`⏰ Checkout session expired for paymentId: ${paymentId}`);
  } catch (error) {
    console.error(`❌ Failed to update expired session ${paymentId}:`, error);
    throw error;
  }
}
