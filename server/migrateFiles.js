// Migration script to convert existing files to base64 storage
// Run this script ONCE after deploying to Vercel to migrate existing files

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const FileHandler = require('./Utils/fileHandler');

// Import your models
const TutorDocument = require('./Models/tutorDocumentSchema');

// Database connection
const MONGO_URI = process.env.MONGO_URI || 'your_mongodb_connection_string';

async function migrateFiles() {
  try {
    // Connect to database
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to database');

    // Find all documents that have file_url but no base64Data
    const documentsToMigrate = await TutorDocument.find({
      file_url: { $exists: true, $ne: null },
      base64Data: { $exists: false }
    });

    console.log(`📁 Found ${documentsToMigrate.length} documents to migrate`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const doc of documentsToMigrate) {
      try {
        // Extract filename from file_url
        const filename = path.basename(doc.file_url);
        const filePath = path.join(__dirname, 'uploads', 'documents', filename);

        // Check if file exists
        if (fs.existsSync(filePath)) {
          // Read file
          const fileBuffer = fs.readFileSync(filePath);
          
          // Create a mock multer file object
          const mockFile = {
            buffer: fileBuffer,
            originalname: filename,
            mimetype: getMimeType(filename),
            fieldname: 'document',
            size: fileBuffer.length
          };

          // Process file using FileHandler
          const fileData = FileHandler.processFile(mockFile);

          // Update document with base64 data
          await TutorDocument.findByIdAndUpdate(doc._id, {
            fileName: fileData.fileName,
            originalName: fileData.originalName,
            mimetype: fileData.mimetype,
            size: fileData.size,
            base64Data: fileData.base64Data,
            fileType: fileData.fileType
          });

          migratedCount++;
          console.log(`✅ Migrated: ${filename}`);
        } else {
          console.log(`⚠️  File not found: ${filePath}`);
          errorCount++;
        }
      } catch (error) {
        console.error(`❌ Error migrating ${doc.file_url}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`✅ Successfully migrated: ${migratedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📁 Total processed: ${documentsToMigrate.length}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

// Helper function to determine MIME type based on file extension
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateFiles();
}

module.exports = { migrateFiles };
