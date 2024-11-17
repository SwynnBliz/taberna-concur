// components/forum/PostForum.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getFirestore, addDoc, collection } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Cloudinary } from 'cloudinary-core';
import { HiPaperClip } from 'react-icons/hi'; // Import the correct icon

const PostForum = () => {
  const router = useRouter();
  const firestore = getFirestore();
  const auth = getAuth();
  
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null); // Added state for image preview

  // Initialize Cloudinary with environment variables
  const cloudinary = new Cloudinary({ cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME });

  // Handle file change for image upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImagePreview(URL.createObjectURL(selectedFile)); // Set image preview
    }
  };

  // Upload image to Cloudinary
  const handleImageUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'post-image-upload'); // Use the preset you created for posts

    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, 
        {
          method: 'POST',
          body: formData,
        }
      );
      const data = await res.json();
      return data.secure_url; // Return the Cloudinary URL for the uploaded image
    } catch (error) {
      setErrorMessage('Failed to upload image');
      throw new Error('Failed to upload image');
    }
  };

  // Handle post creation
  const handlePostCreation = async () => {
    if (!message.trim()) {
      setErrorMessage('Message cannot be empty.');
      return;
    }
  
    setUploading(true);
    try {
      const uploadedImageUrl = file ? await handleImageUpload(file) : null; // Use null if no file
  
      const user = auth.currentUser;
      if (user) {
        // Save the post to Firestore
        await addDoc(collection(firestore, 'posts'), {
          userId: user.uid,
          username: user.displayName || 'Anonymous',
          userEmail: user.email,
          profilePhoto: user.photoURL || 'https://via.placeholder.com/150',
          message,
          imageUrl: uploadedImageUrl, // Safely set to null if no image
          createdAt: new Date(),
          likes: 0,
          dislikes: 0,
          comments: [],
        });
  
        // Clear the form after posting
        setMessage('');
        setFile(null);
        setImagePreview(null); // Clear image preview
        setUploading(false);
        router.push('/discussion-board'); // Redirect to the discussion board
      }
    } catch (error) {
      console.error('Error creating post:', error);
      setErrorMessage('Failed to create post. Please try again.');
      setUploading(false);
    }
  };

  return (
    <div className="flex justify-center items-center bg-[#484242] p-8">
      <div className="w-full max-w-3xl bg-[#383434] rounded-lg shadow-lg p-8 space-y-6">
        <div className="flex flex-row justify-between">
          <h1 className="text-2xl font-bold text-white mb-4">Create a Post</h1>
          {/* Post Button */}
          <div className="flex justify-center">
            <button
              onClick={handlePostCreation}
              className="py-1 px-4 bg-yellow-500 text-white rounded-md hover:bg-yellow-400 transition-all duration-200"
              disabled={uploading}
            >
              {uploading ? 'Creating Post...' : 'Post'}
            </button>
          </div>
        </div>

        {/* Message Section */}
        <div className="mb-4">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full px-4 py-3 rounded-md text-white outline-none focus:ring-2 focus:ring-yellow-500 bg-[#2c2c2c] h-32 resize-none"
          />
        </div>

        {/* Error Message */}
        {errorMessage && <p className="text-red-500 text-center">{errorMessage}</p>}

        {/* Image Attachment Section */}
        <div className="flex flex-col items-center text-center mb-4">
          <div className="relative">
            <div className="flex flex-row">
              <label className="text-white text-lg mb-2 mr-2">Attach an Image (Optional)</label>
              <input
                type="file"
                id="image-upload"
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
              />
              <button 
                onClick={() => document.getElementById('image-upload')?.click()} // Trigger the file input programmatically
                className="text-white p-2 bg-[#2c2c2c] rounded-full hover:bg-yellow-500 transition-all duration-200">
                <HiPaperClip size={20} />
              </button>
            </div>
            {/* Image Preview */}
            {imagePreview && (
              <div className="mt-4 w-full max-w-xs border border-bd">
                <img src={imagePreview} alt="Selected" className="w-full h-auto rounded-md shadow-lg" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostForum;
