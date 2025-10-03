// Migration script to update existing reviews with review_type
// Run this once to update existing reviews in the database

const mongoose = require('mongoose');
const TutorReview = require('./Models/tutorReviewSchema');

const updateExistingReviews = async () => {
  try {
    // Update all existing reviews that don't have review_type set
    const result = await TutorReview.updateMany(
      { review_type: { $exists: false } },
      { 
        $set: { 
          review_type: 'student' // Default existing reviews to student type
        } 
      }
    );
    
    console.log(`Updated ${result.modifiedCount} existing reviews with review_type: 'student'`);
    
    // Also update any reviews that have parent_id but no review_type
    const parentResult = await TutorReview.updateMany(
      { parent_id: { $exists: true }, review_type: { $exists: false } },
      { 
        $set: { 
          review_type: 'parent' 
        } 
      }
    );
    
    console.log(`Updated ${parentResult.modifiedCount} parent reviews with review_type: 'parent'`);
    
  } catch (error) {
    console.error('Error updating existing reviews:', error);
  }
};

// Uncomment the line below to run the migration
// updateExistingReviews().then(() => process.exit(0));
