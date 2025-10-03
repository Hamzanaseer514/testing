// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const  User  = require("../Models/userSchema");

const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer")) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select("-password");
        console.log("Passed");
        if (!req.user) {
          res.status(401);
          throw new Error("User not found");
        }

        next();
      } catch (error) {
        console.error("Token verification failed");
        res.status(401);
        throw new Error("Invalid or expired token");
      }
  } else {
    res.status(401);
    throw new Error("Not authorized, no token");
  }
});



// ✅ 2. Admin Only Middleware
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403);
    throw new Error("Access denied: Admins only");
  }
};

module.exports = { protect, adminOnly };
