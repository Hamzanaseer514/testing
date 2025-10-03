const fs = require('fs');
const path = require('path');

class FileHandler {
  /**
   * Process uploaded file and return file data for database storage
   * @param {Object} file - Multer file object
   * @returns {Object} File data object
   */
  static processFile(file) {
    if (!file) {
      throw new Error('No file provided');
    }

    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    const fileName = file.fieldname + '-' + uniqueSuffix + fileExtension;

    // Convert buffer to base64
    const base64Data = file.buffer.toString('base64');
    const dataUrl = `data:${file.mimetype};base64,${base64Data}`;

    return {
      fileName: fileName,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      dataUrl: dataUrl,
      base64Data: base64Data,
      fileType: file.mimetype.startsWith('image/') ? 'image' : 'pdf'
    };
  }

  /**
   * Create a file URL for serving files
   * @param {String} fileName - The stored filename
   * @param {String} baseUrl - Base URL of your server
   * @returns {String} Complete file URL
   */
  static createFileUrl(fileName, baseUrl) {
    return `${baseUrl}/api/files/${fileName}`;
  }

  /**
   * Serve file from base64 data
   * @param {String} base64Data - Base64 encoded file data
   * @param {String} mimetype - File MIME type
   * @param {Object} res - Express response object
   */
  static serveFile(base64Data, mimetype, res) {
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      res.set({
        'Content-Type': mimetype,
        'Content-Length': buffer.length,
        'Cache-Control': 'public, max-age=31536000' // Cache for 1 year
      });
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ error: 'Error serving file' });
    }
  }

  /**
   * Validate file size and type
   * @param {Object} file - Multer file object
   * @param {Number} maxSize - Maximum file size in bytes
   * @returns {Boolean} True if valid
   */
  static validateFile(file, maxSize = 10 * 1024 * 1024) {
    if (!file) return false;
    if (file.size > maxSize) return false;
    
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf'
    ];
    
    return allowedTypes.includes(file.mimetype);
  }
}

module.exports = FileHandler;
