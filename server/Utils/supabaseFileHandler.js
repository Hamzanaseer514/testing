const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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

class SupabaseFileHandler {
  /**
   * Upload file to Supabase Storage
   * @param {Object} file - Multer file object
   * @param {String} bucketName - Supabase bucket name
   * @param {String} folder - Folder path in bucket
   * @returns {Object} Upload result with URL
   */
  static async uploadFile(file, bucketName = 'documents', folder = 'uploads') {
    try {
      // Generate unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const fileExtension = file.originalname.split('.').pop();
      const fileName = `${file.fieldname}-${uniqueSuffix}.${fileExtension}`;
      const filePath = `${folder}/${fileName}`;

      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (error) {
        throw new Error(`Supabase upload error: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      return {
        fileName: fileName,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: filePath,
        url: urlData.publicUrl,
        fileType: file.mimetype.startsWith('image/') ? 'image' : 'pdf'
      };

    } catch (error) {
      console.error('Supabase upload error:', error);
      throw error;
    }
  }

  /**
   * Delete file from Supabase Storage
   * @param {String} filePath - File path in Supabase
   * @param {String} bucketName - Supabase bucket name
   * @returns {Boolean} Success status
   */
  static async deleteFile(filePath, bucketName = 'documents') {
    try {
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);

      if (error) {
        throw new Error(`Supabase delete error: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Supabase delete error:', error);
      return false;
    }
  }
}

module.exports = {
  upload,
  SupabaseFileHandler
};
