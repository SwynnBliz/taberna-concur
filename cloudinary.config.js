import { v2 as cloudinary } from 'cloudinary';

// Configuration
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,  // Use environment variable
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,        // Use environment variable
  api_secret: process.env.CLOUDINARY_API_SECRET,              // Use environment variable
});

// Export cloudinary so it can be used in other parts of the app
export { cloudinary };