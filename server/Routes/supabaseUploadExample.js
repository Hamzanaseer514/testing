// Example: How to use Supabase Storage Solution
const express = require('express');
const router = express.Router();
const { upload, SupabaseFileHandler } = require('../Utils/supabaseFileHandler');

// Example route for uploading documents to Supabase
router.post('/upload-document-supabase', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Upload to Supabase Storage
    const fileData = await SupabaseFileHandler.uploadFile(req.file);

    // Save file metadata to your database
    const document = new DocumentModel({
      fileName: fileData.fileName,
      originalName: fileData.originalName,
      mimetype: fileData.mimetype,
      size: fileData.size,
      filePath: fileData.path,
      fileUrl: fileData.url,
      fileType: fileData.fileType,
      uploadedBy: req.user.id,
      uploadedAt: new Date()
    });

    await document.save();

    res.json({
      success: true,
      message: 'File uploaded successfully to Supabase',
      file: {
        id: document._id,
        fileName: fileData.fileName,
        originalName: fileData.originalName,
        fileType: fileData.fileType,
        size: fileData.size,
        url: fileData.url,
        uploadedAt: document.uploadedAt
      }
    });

  } catch (error) {
    console.error('Supabase upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Example route for deleting files from Supabase
router.delete('/delete-document/:id', async (req, res) => {
  try {
    const document = await DocumentModel.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete from Supabase Storage
    const deleted = await SupabaseFileHandler.deleteFile(document.filePath);
    
    if (deleted) {
      // Delete from database
      await DocumentModel.findByIdAndDelete(req.params.id);
      
      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } else {
      res.status(500).json({ error: 'Failed to delete file from storage' });
    }

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'File deletion failed' });
  }
});

module.exports = router;
