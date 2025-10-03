const multer = require('multer');

// Configure memory storage for Vercel compatibility
const storage = multer.memoryStorage();

// File filter function - Updated to support both images and PDFs
const fileFilter = (req, file, cb) => {
  // Allow image files and PDF files
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only image and PDF files are allowed!'), false);
  }
};

// Configure multer with memory storage
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit (increased for PDFs)
  }
});

module.exports = upload;



















