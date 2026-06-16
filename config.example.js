// Appwrite Configuration Template
// Copy this file to `config.js` in the same directory and fill in your Appwrite details.
// Ensure `config.js` is kept out of Git to keep your database IDs secure.
//test
window.AppwriteConfig = {
  endpoint: 'https://fra.cloud.appwrite.io/v1', // Your Appwrite API Endpoint
  projectId: 'YOUR_PROJECT_ID',                 // Your Appwrite Project ID
  databaseId: 'YOUR_DATABASE_ID',               // Your Appwrite Database ID
  collections: {
    users: 'users',
    batches: 'batches',
    materials: 'materials',
    chats: 'chats',
    courses: 'courses',
    enrollments: 'enrollments',
    announcements: 'announcements'
  }
};
