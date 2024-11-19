'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getFirestore, addDoc, collection, doc, getDoc } from 'firebase/firestore';
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
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Initialize Cloudinary
  const cloudinary = new Cloudinary({ cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME });

  // Handle file change for image upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImagePreview(URL.createObjectURL(selectedFile));
    }
  };

  // Upload image to Cloudinary
  const handleImageUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'post-image-upload');

    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, 
        {
          method: 'POST',
          body: formData,
        }
      );
      const data = await res.json();
      return data.secure_url;
    } catch (error) {
      setErrorMessage('Failed to upload image');
      throw new Error('Failed to upload image');
    }
  };

  // Fetch user profile data from Firestore
  const fetchUserProfile = async (userId: string) => {
    const userDoc = doc(firestore, 'users', userId);
    const docSnap = await getDoc(userDoc);

    if (docSnap.exists()) {
      setUserProfile(docSnap.data());
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
      const uploadedImageUrl = file ? await handleImageUpload(file) : null;
  
      const user = auth.currentUser;
      if (user && userProfile) {
        await addDoc(collection(firestore, 'posts'), {
          userId: user.uid,
          message,
          imageUrl: uploadedImageUrl,
          createdAt: new Date(),
          likes: 0,
          dislikes: 0,
          comments: [],
        });
  
        setMessage('');
        setFile(null);
        setImagePreview(null);
        setUploading(false);
        router.push('/discussion-board');
      } else {
        setErrorMessage('User data is unavailable.');
        setUploading(false);
      }
    } catch (error) {
      console.error('Error creating post:', error);
      setErrorMessage('Failed to create post. Please try again.');
      setUploading(false);
    }
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      fetchUserProfile(user.uid);
    }
  }, [auth.currentUser]);

  return (
    <div className="flex justify-center items-center bg-[#484242] p-8">
      <div className="w-8/12 bg-[#383434] rounded-lg shadow-lg p-8 space-y-6">
        <div className="flex flex-row justify-between">
          <h1 className="text-2xl font-bold text-white mb-4">Create a Post</h1>
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

        <div className="mb-4">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full px-4 py-3 rounded-md text-white outline-none focus:ring-2 focus:ring-yellow-500 bg-[#2c2c2c] h-48 resize-none"
          />
        </div>

        {errorMessage && <p className="text-red-500 text-center">{errorMessage}</p>}

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
                onClick={() => document.getElementById('image-upload')?.click()}
                className="text-white p-2 bg-[#2c2c2c] rounded-full hover:bg-yellow-500 transition-all duration-200">
                <HiPaperClip size={20} />
              </button>
            </div>
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
