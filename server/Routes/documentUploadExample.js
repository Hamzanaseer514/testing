// Example: How to use Base64 Database Storage Solution
const express = require('express');
const router = express.Router();
const upload = require('../Utils/multerConfigVercel');
const FileHandler = require('../Utils/fileHandler');

// Example route for uploading documents
router.post('/upload-document', upload.single('document'), async (req, res) => {
  try {
    // Validate file
    if (!FileHandler.validateFile(req.file)) {
      return res.status(400).json({ 
        error: 'Invalid file. Only images and PDFs up to 10MB are allowed.' 
      });
    }

    // Process file and get data for database storage
    const fileData = FileHandler.processFile(req.file);
    
    // Save to your database (adjust model as needed)
    const document = new DocumentModel({
      fileName: fileData.fileName,
      originalName: fileData.originalName,
      mimetype: fileData.mimetype,
      size: fileData.size,
      base64Data: fileData.base64Data,
      fileType: fileData.fileType,
      uploadedBy: req.user.id, // Assuming you have user authentication
      uploadedAt: new Date()
    });

    await document.save();

    // Create file URL for frontend
    const fileUrl = FileHandler.createFileUrl(fileData.fileName, process.env.BASE_URL);

    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: {
        id: document._id,
        fileName: fileData.fileName,
        originalName: fileData.originalName,
        fileType: fileData.fileType,
        size: fileData.size,
        url: fileUrl,
        uploadedAt: document.uploadedAt
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Example route for uploading multiple files
router.post('/upload-multiple', upload.array('documents', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedFiles = [];

    for (const file of req.files) {
      if (!FileHandler.validateFile(file)) {
        continue; // Skip invalid files
      }

      const fileData = FileHandler.processFile(file);
      
      const document = new DocumentModel({
        fileName: fileData.fileName,
        originalName: fileData.originalName,
        mimetype: fileData.mimetype,
        size: fileData.size,
        base64Data: fileData.base64Data,
        fileType: fileData.fileType,
        uploadedBy: req.user.id,
        uploadedAt: new Date()
      });

      await document.save();

      const fileUrl = FileHandler.createFileUrl(fileData.fileName, process.env.BASE_URL);

      uploadedFiles.push({
        id: document._id,
        fileName: fileData.fileName,
        originalName: fileData.originalName,
        fileType: fileData.fileType,
        size: fileData.size,
        url: fileUrl
      });
    }

    res.json({
      success: true,
      message: `${uploadedFiles.length} files uploaded successfully`,
      files: uploadedFiles
    });

  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

module.exports = router;
