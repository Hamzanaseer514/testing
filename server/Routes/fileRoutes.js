const express = require('express');
const router = express.Router();
const FileHandler = require('../Utils/fileHandler');
const TutorDocument = require('../Models/tutorDocumentSchema');

/**
 * Serve file by filename
 * GET /api/files/:filename
 */
router.get('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Find the file in your database
    const document = await TutorDocument.findOne({ fileName: filename });
    
    if (!document) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if document has base64 data (new format)
    if (document.base64Data) {
      // Serve the file from base64 data
      FileHandler.serveFile(document.base64Data, document.mimetype, res);
    } else if (document.file_url) {
      // Legacy format - redirect to file URL
      res.redirect(document.file_url);
    } else {
      return res.status(404).json({ error: 'File data not found' });
    }
    
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ error: 'Error serving file' });
  }
});

/**
 * Serve file by document ID (alternative endpoint)
 * GET /api/files/document/:documentId
 */
router.get('/document/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    
    // Find the document by ID
    const document = await TutorDocument.findById(documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check if document has base64 data (new format)
    if (document.base64Data) {
      // Serve the file from base64 data
      FileHandler.serveFile(document.base64Data, document.mimetype, res);
    } else if (document.file_url) {
      // Legacy format - redirect to file URL
      res.redirect(document.file_url);
    } else {
      return res.status(404).json({ error: 'File data not found' });
    }
    
  } catch (error) {
    console.error('Error serving document:', error);
    res.status(500).json({ error: 'Error serving document' });
  }
});

module.exports = router;
