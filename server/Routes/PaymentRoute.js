// Routes/PaymentRoute.js
const express = require("express");
const router = express.Router();
const { createCheckoutSession, confirmPayment } = require("../Controllers/PaymentController");

// ✅ ab sirf controller use karo
router.post("/create-checkout-session", createCheckoutSession);
router.post("/confirm/:paymentId", confirmPayment);

module.exports = router;
