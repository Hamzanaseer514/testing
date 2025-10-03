const AWS = require('aws-sdk');
const multer = require('multer');

// Configure AWS SDK for Tebi.io
const s3 = new AWS.S3({
  endpoint: 'https://s3.tebi.io',
  accessKeyId: process.env.TEBI_ACCESS_KEY,
  secretAccessKey: process.env.TEBI_SECRET_KEY,
  region: 'us-east-1', // Tebi uses us-east-1
  s3ForcePathStyle: true
});

// Configure memory storage for Vercel
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

class TebiFileHandler {
  /**
   * Upload file to Tebi.io
   * @param {Object} file - Multer file object
   * @param {String} bucketName - S3 bucket name
   * @param {String} folder - Folder path in bucket
   * @returns {Object} Upload result with URL
   */
  static async uploadFile(file, bucketName = 'tuterby-documents', folder = 'uploads') {
    try {
      // Generate unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const fileExtension = file.originalname.split('.').pop();
      const fileName = `${file.fieldname}-${uniqueSuffix}.${fileExtension}`;
      const key = `${folder}/${fileName}`;

      // Upload parameters
      const uploadParams = {
        Bucket: bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read' // Make file publicly accessible
      };

      // Upload to Tebi
      const result = await s3.upload(uploadParams).promise();

      return {
        fileName: fileName,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        key: key,
        url: result.Location,
        fileType: file.mimetype.startsWith('image/') ? 'image' : 'pdf'
      };

    } catch (error) {
      console.error('Tebi upload error:', error);
      throw error;
    }
  }

  /**
   * Delete file from Tebi.io
   * @param {String} key - File key in S3
   * @param {String} bucketName - S3 bucket name
   * @returns {Boolean} Success status
   */
  static async deleteFile(key, bucketName = 'tuterby-documents') {
    try {
      const deleteParams = {
        Bucket: bucketName,
        Key: key
      };

      await s3.deleteObject(deleteParams).promise();
      return true;
    } catch (error) {
      console.error('Tebi delete error:', error);
      return false;
    }
  }

  /**
   * Create bucket if it doesn't exist
   * @param {String} bucketName - Bucket name
   * @returns {Boolean} Success status
   */
  static async createBucket(bucketName) {
    try {
      await s3.createBucket({ Bucket: bucketName }).promise();
      return true;
    } catch (error) {
      if (error.code === 'BucketAlreadyOwnedByYou') {
        return true; // Bucket already exists
      }
      console.error('Tebi bucket creation error:', error);
      return false;
    }
  }
}

module.exports = {
  upload,
  TebiFileHandler
};
