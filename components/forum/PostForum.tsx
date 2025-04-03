// components/forum/PostForum.tsx (Forum Posting Function)
'use client';
import { useState, useEffect } from 'react';
import { getFirestore, addDoc, collection, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { HiPaperClip } from 'react-icons/hi'; 
import { AiOutlineClose } from 'react-icons/ai'; 

const PostForum = () => {
  const firestore = getFirestore();
  const auth = getAuth();
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      fetchUserProfile(user.uid);
    }
  }, [auth.currentUser]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type.startsWith('image/')) {
        setFile(selectedFile);
        setImagePreview(URL.createObjectURL(selectedFile));
      } else {
        setErrorMessage('Only image files are allowed here.');
      }
    }
  };
  
  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedVideo = e.target.files?.[0];
    if (selectedVideo) {
      if (selectedVideo.type.startsWith('video/')) {
        setVideoFile(selectedVideo);
        setVideoPreview(URL.createObjectURL(selectedVideo));
      } else {
        setErrorMessage('Only video files are allowed.');
      }
    }
  };
  
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

  const handleVideoUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'post-video-upload'); 
  
    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );
      const data = await res.json();
      return data.secure_url;
    } catch (error) {
      setErrorMessage('Failed to upload video');
      throw new Error('Failed to upload video');
    }
  };
  
  const fetchUserProfile = async (userId: string) => {
    const userDoc = doc(firestore, 'users', userId);
    const docSnap = await getDoc(userDoc);

    if (docSnap.exists()) {
      setUserProfile(docSnap.data());
    }
  };

  const handlePostCreation = async () => {
    if (!message.trim()) {
      setErrorMessage('Message cannot be empty.');
      return;
    }
  
    setUploading(true);
    setUploadingVideo(true);
  
    try {
      const uploadedImageUrl = file ? await handleImageUpload(file) : null;
      const uploadedVideoUrl = videoFile ? await handleVideoUpload(videoFile) : null;
  
      const user = auth.currentUser;
      if (user && userProfile) {
        await addDoc(collection(firestore, 'posts'), {
          userId: user.uid,
          message,
          imageUrl: uploadedImageUrl,
          videoUrl: uploadedVideoUrl,
          createdAt: new Date(),
          likes: 0,
          dislikes: 0,
          comments: [],
        });

        setMessage('');
        setFile(null);
        setImagePreview(null);
        setVideoFile(null);
        setVideoPreview(null);
        setUploading(false);
        setUploadingVideo(false);
      } else {
        setErrorMessage('User data is unavailable.');
        setUploading(false);
        setUploadingVideo(false);
      }
    } catch (error) {
      console.error('Error creating post:', error);
      setErrorMessage('Failed to create post. Please try again.');
      setUploading(false);
      setUploadingVideo(false);
    }
  };

  const handleRemoveImage = () => {
    setFile(null);
    setImagePreview(null);
  
    const imageInput = document.getElementById('image-upload') as HTMLInputElement;
    if (imageInput) imageInput.value = '';
  };
  
  const handleRemoveVideo = () => {
    setVideoFile(null);
    setVideoPreview(null);
  
    const videoInput = document.getElementById('video-upload') as HTMLInputElement;
    if (videoInput) videoInput.value = '';
  };
  

  return (
    <div className="flex justify-center items-center | py-4 px-8 |  md:px-20 | lg:px-20 | xl:w-full">
      <div className="w-full max-w-2xl bg-[#383838] rounded-lg shadow-lg | p-6 | sm:p-6 | md:p-8 | lg:p-8 | space-y-6">
        {/* Post Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-sm | sm:text-lg | md:text-xl | lg:text-xl | xl:text-2xl | font-bold text-white">Create Post</h1>
          <button
            onClick={handlePostCreation}
            className="text-xs p-1 | sm:text-lg sm:p-2 | md:text-xl | lg:text-xl | xl:text-2xl | bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
            disabled={uploading}
          >
            {uploading ? 'Posting...' : 'Post'}
          </button>
        </div>
  
        {/* Text Input */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What's on your mind?"
          className="h-20 text-xs | sm:text-lg sm:h-40 | w-full p-3 rounded-md text-white bg-[#2c2c2c] resize-none focus:ring-2 focus:ring-yellow-500 outline-none"
        />
  
        {/* Error Message */}
        {errorMessage && <p className="text-red-500 text-center">{errorMessage}</p>}
  
        {/* Image Upload Section */}
        <div className="flex flex-col items-center space-y-2">
          <label className="text-xs | sm:text-lg | text-white font-semibold">Attach Image (Optional)</label>
          <input type="file" id="image-upload" onChange={handleFileChange} className="hidden" accept="image/*" />
          <button
            onClick={() => document.getElementById('image-upload')?.click()}
            className="text-xs | sm:text-lg | flex items-center gap-2 px-2 py-2 bg-[#2c2c2c] text-white rounded-lg hover:bg-yellow-500 transition"
          >
            <HiPaperClip/> Upload Image
          </button>
  
          {imagePreview && (
            <div className="relative mt-4 w-full h-[150px] sm:h-[450px] max-w-2xl">
              <img src={imagePreview} alt="Selected" className="w-full h-full object-cover rounded-md shadow-lg" />
              <button
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 text-white bg-[#2c2c2c] rounded-full p-1 hover:bg-yellow-500"
              >
                <AiOutlineClose/>
              </button>
            </div>
          )}
        </div>
  
        {/* Video Upload Section */}
        <div className="flex flex-col items-center space-y-2">
          <label className="text-xs | sm:text-lg | text-white font-semibold">Attach Video (Optional)</label>
          <input type="file" id="video-upload" onChange={handleVideoChange} className="hidden" accept="video/*" />
          <button
            onClick={() => document.getElementById('video-upload')?.click()}
            className="text-xs | sm:text-lg | flex items-center gap-2 px-2 py-2 bg-[#2c2c2c] text-white rounded-lg hover:bg-yellow-500 transition"
          >
            <HiPaperClip/> Upload Video
          </button>
  
          {videoPreview && (
            <div className="relative mt-4 w-full h-[150px] sm:h-[450px] max-w-2xl">
              <video src={videoPreview} controls className="w-full h-full object-contain rounded-md shadow-lg" />
              <button
                onClick={handleRemoveVideo}
                className="absolute top-2 right-2 text-white bg-[#2c2c2c] rounded-full p-1 hover:bg-yellow-500"
              >
                <AiOutlineClose/>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );  
};

export default PostForum;
