"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Cloudinary } from 'cloudinary-core';

const ProfilePage = () => {
  const router = useRouter();
  const [userData, setUserData] = useState({
    username: '',
    email: '',
    bio: '',
    contactNumber: '',
    profilePhoto: '',
  });
  const [newPassword, setNewPassword] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const firestore = getFirestore();
  const authInstance = getAuth();

  // Initialize Cloudinary with environment variables
  const cloudinary = new Cloudinary({ cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME });

  // Fetch user data from Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      const user = authInstance.currentUser;
      if (user) {
        const userRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          setUserData({
            username: userDoc.data()?.username || '',
            email: user.email || '',
            bio: userDoc.data()?.bio || '',
            contactNumber: userDoc.data()?.contactNumber || '',
            profilePhoto: userDoc.data()?.profilePhoto || '',
          });
        }
      }
    };
    fetchUserData();
  }, [authInstance.currentUser, firestore]);

  // Handle profile photo upload
  const handleProfilePhotoChange = async (e: any) => {
    const file = e.target.files[0];
    if (file) {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'profile-photo-upload');  // Use the preset you created

      try {
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, 
          {
            method: 'POST',
            body: formData,
          }
        );
        const data = await res.json();
        setNewPhotoUrl(data.secure_url);  // Set the returned URL
      } catch (error) {
        setErrorMessage('Failed to upload photo');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Update the user info in Firestore and Firebase Authentication
  const handleUpdateProfile = async () => {
    // Check if username is filled
    if (!userData.username) {
      setErrorMessage('Username is required.');
      return;
    }

    try {
      const user = authInstance.currentUser;
      if (!user) return;

      // Update username, bio, contactNumber, and profile photo in Firestore
      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, {
        username: userData.username,
        bio: userData.bio,
        contactNumber: userData.contactNumber,
        profilePhoto: newPhotoUrl || userData.profilePhoto, // Use the uploaded photo or keep the current one
      });

      // Update password if provided
      if (oldPassword && newPassword) {
        const credential = EmailAuthProvider.credential(user.email!, oldPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
        setNewPassword('');
        setOldPassword('');
        alert('Password updated successfully');
      }

      alert('Profile updated successfully');
      router.push('/discussion-board'); // Redirect to the discussion board
    } catch (error: any) {
      setErrorMessage(error.message);
    }
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-cover bg-center"
      style={{
        backgroundImage: "url('https://wallup.net/wp-content/uploads/2019/09/929884-liquor-alcohol-spirits-poster-drinks-drink-whiskey.jpg')",
      }}
    >
      <div
        className="bg-white/30 border border-white rounded-lg backdrop-blur-md p-8 shadow-lg w-4/5 max-w-xl" // Adjusted width and added max width
        style={{ paddingTop: '30px', paddingBottom: '30px' }} // Added padding for better spacing
      >
        <h1 className="text-5xl font-bold text-center text-white mb-6">
          <span style={{ fontFamily: "Arial, sans-serif" }}>Welcome to </span>
          <span className="text-yellow-500 italic island-moments">TabernaConcur</span>
        </h1>
  
        <div className="text-center text-white mb-6">
          <img
            src={newPhotoUrl || userData.profilePhoto || "https://via.placeholder.com/150"}
            alt="Profile Photo"
            className="w-32 h-32 rounded-full mx-auto mb-4"
          />
          <input
            type="file"
            onChange={handleProfilePhotoChange}
            className="mt-2 text-white"
            accept="image/*"
          />
        </div>
  
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleUpdateProfile(); }}>
          <input
            type="text"
            value={userData.username}
            onChange={(e) => setUserData({ ...userData, username: e.target.value })}
            placeholder="Username"
            className="w-full px-4 py-2 rounded-md text-gray-800 outline-none focus:ring-2 focus:ring-yellow-500 bg-white/90"
          />
          <textarea
            value={userData.bio}
            onChange={(e) => setUserData({ ...userData, bio: e.target.value })}
            placeholder="Bio"
            className="w-full px-4 py-2 rounded-md text-gray-800 outline-none focus:ring-2 focus:ring-yellow-500 bg-white/90"
          />
          <input
            type="tel"
            value={userData.contactNumber}
            onChange={(e) => setUserData({ ...userData, contactNumber: e.target.value })}
            placeholder="Contact Number"
            className="w-full px-4 py-2 rounded-md text-gray-800 outline-none focus:ring-2 focus:ring-yellow-500 bg-white/90"
          />
  
          <div className="space-y-4">
            <input
              type="password"
              placeholder="Old Password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-md text-gray-800 outline-none focus:ring-2 focus:ring-yellow-500 bg-white/90"
            />
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-md text-gray-800 outline-none focus:ring-2 focus:ring-yellow-500 bg-white/90"
            />
          </div>
  
          <button
            type="submit"
            className="w-full py-2 mt-4 bg-yellow-500 text-white font-semibold rounded-md hover:bg-yellow-600"
            disabled={isLoading}
          >
            {isLoading ? "Updating..." : "Update Profile"}
          </button>
  
          {errorMessage && <p className="text-red-500 mt-4 text-center" aria-live="polite">{errorMessage}</p>}
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
