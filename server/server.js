const express = require("express");
const app = express();
require("dotenv").config();
const router = express.Router();


// Validate required environment variables
const requiredEnvVars = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'FRONTEND_URL',
  'MONGO_URI',
  'JWT_SECRET'
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
});

// Validate Stripe key format
if (!process.env.STRIPE_SECRET_KEY.startsWith('sk_live_') && 
    !process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
  console.error('❌ Invalid Stripe secret key format. Must start with sk_live_ or sk_test_');
  process.exit(1);
}

// Validate webhook secret format
if (!process.env.STRIPE_WEBHOOK_SECRET.startsWith('whsec_')) {
  console.error('❌ Invalid Stripe webhook secret format. Must start with whsec_');
  process.exit(1);
}

console.log('✅ Environment variables validated successfully');

const PORT = process.env.PORT || 5000;
const cors = require("cors");
const cookieParser = require("cookie-parser");
// ⚠️ Webhook route needs raw body, so put this BEFORE express.json()
// Add webhook security middleware
const webhookSecurity = (req, res, next) => {
  // Add timestamp to prevent replay attacks
  const timestamp = req.headers['stripe-signature'] ? 
    req.headers['stripe-signature'].split(',')[0].split('=')[1] : null;
  
  if (timestamp) {
    const currentTime = Math.floor(Date.now() / 1000);
    const webhookTime = parseInt(timestamp);
    
    // Reject webhooks older than 5 minutes
    if (currentTime - webhookTime > 300) {
      console.error('❌ Webhook timestamp too old:', {
        webhookTime: new Date(webhookTime * 1000),
        currentTime: new Date(currentTime * 1000),
        difference: currentTime - webhookTime
      });
      return res.status(400).send('Webhook timestamp too old');
    }
  }
  
  next();
};

app.post(
  "/webhooks/stripe",
  express.raw({ type: "application/json" }),
  webhookSecurity,
  require("./Routes/stripeWebhook") // ✅ webhook ka route alag file me rakho
);
// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, true); // allow any origin dynamically
    }, // tumhare React/Vite frontend ka port
    credentials: true, // agar cookies ya authentication bhejna ho
  })
);
// app.use(
//   cors({
//     origin: process.env.FRONTEND_URL, // tumhare React/Vite frontend ka port
//     credentials: true, // agar cookies ya authentication bhejna ho
//   })
// );

app.use(express.json()); // For JSON requests
app.use(express.urlencoded({ extended: true })); // For form data
app.use(cookieParser());
app.use("/uploads", express.static("uploads"));

// Import DB connection
const { ConnectToDB } = require("./Configuration/db");

// Routes
const UserRoute = require("./Routes/UserRoute");
const tutorRoutes = require("./Routes/tutorRoutes");
const adminRoutes = require("./Routes/adminRoutes");
const paymentRoutes = require("./Routes/PaymentRoute");
const parentRoutes = require("./Routes/ParentRoutes");
const publicRoutes = require("./Routes/publicRoutes");

// Mount Routes
app.use("/api/auth", UserRoute);
app.use("/api/tutor", tutorRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/parent", parentRoutes);
app.use("/api/public", publicRoutes);


router.get('/', (req, res) => {
  res.send("Hi, TutorNearby");
});
app.use("/", router);

// Error handler (should be AFTER routes)
const { errorHandler } = require("./Middleware/errorHandler");
app.use(errorHandler);

// DB Connect and Start Server
ConnectToDB()
  .then(() => {
    console.log("✅ Database connected");
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Database connection failed:", err.message);
  });
