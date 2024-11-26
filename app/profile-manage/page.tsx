// app/profile-manage/page.tsx (Profile Manage Page)
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Cloudinary } from 'cloudinary-core';
import Layout from '../../components/root/Layout'; // Layout component import
import PasswordStrengthChecker from '../../components/auth/PasswordStrengthChecker'; // Import the strength checker
import useBannedWords from '../../components/forum/hooks/useBannedWords'; // Import useBannedWords hook
import { FaSpinner } from "react-icons/fa";

const ProfileManagePage = () => {
  const router = useRouter();
  const [userData, setUserData] = useState({
    username: '',
    email: '',
    bio: '',
    contactNumber: '',
    profilePhoto: '',
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isGoogleUser, setIsGoogleUser] = useState(false); // To track if the user logged in with Google
  const [showOldPassword, setShowOldPassword] = useState(false); // Separate state for old password visibility
  const [showNewPassword, setShowNewPassword] = useState(false); // Separate state for new password visibility
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // Separate state for confirm password visibility
  const firestore = getFirestore();
  const authInstance = getAuth();
  const [dataLoaded, setDataLoaded] = useState(false);
  const { bannedWords, loading: bannedWordsLoading } = useBannedWords(); // Use bannedWords hook

  // Initialize Cloudinary with environment variables
  const cloudinary = new Cloudinary({ cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME });

  // Fetch user data from Firestore and check login method
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

          setDataLoaded(true);
          // Check if the user logged in with Google
          if (user.providerData.some((provider) => provider.providerId === 'google.com')) {
            setIsGoogleUser(true);
          }
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

  // Check if username contains banned words
  const containsBannedWords = (username: string) => {
    return bannedWords.some((word) => username.toLowerCase().includes(word.toLowerCase()));
  };

  // Update the user info in Firestore and Firebase Authentication
  const handleUpdateProfile = async () => {
    if (!userData.username) {
      setErrorMessage('Username is required.');
      return;
    }

    // Check if username contains banned words
    if (containsBannedWords(userData.username)) {
      setErrorMessage('Username contains a banned word, please change.');
      return;
    }
  
    // Check if password fields are provided, only validate if they are being used
    if ((oldPassword || newPassword || confirmPassword) && (oldPassword === '' || newPassword === '' || confirmPassword === '')) {
      setErrorMessage('Please fill in all the password fields if you want to change your password.');
      return;
    }
  
    // Check if the new password and confirm password match (only if both are provided)
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
  
    try {
      const user = authInstance.currentUser;
      if (!user) return;
  
      // Update user data in Firestore
      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, {
        username: userData.username,
        bio: userData.bio,
        contactNumber: userData.contactNumber,
        profilePhoto: newPhotoUrl || userData.profilePhoto, // Use the uploaded photo or keep the current one
      });
  
      // Reauthenticate and update password if provided (only for email/password users)
      if (oldPassword && newPassword && !isGoogleUser) {
        const credential = EmailAuthProvider.credential(user.email!, oldPassword);
  
        try {
          // Reauthenticate the user with the old password
          await reauthenticateWithCredential(user, credential);
  
          // If reauthentication succeeds, update the password
          await updatePassword(user, newPassword);
  
          // Clear password fields
          setNewPassword('');
          setConfirmPassword('');
          setOldPassword('');
  
          alert('Password updated successfully');
        } catch (err) {
          // If reauthentication fails, show an error
          setErrorMessage('Old password is incorrect.');
          return;
        }
      }
  
      alert('Profile updated successfully');
      router.push(`/profile-view/${user.uid}`); // Redirect to the discussion board
    } catch (error: any) {
      setErrorMessage(error.message);
    }
  };

  return (
    <Layout>
      <div className="flex justify-center items-start min-h-screen bg-[#484242] p-8">
        <div
          className="bg-[#383434] border border-white rounded-lg backdrop-blur-md p-8 shadow-lg w-full max-w-4xl"
          style={{ paddingTop: '30px', paddingBottom: '30px' }}
        >
          <h1 className="text-4xl font-bold text-center text-white mb-6">
            <span className="text-yellow-500">Profile Manager</span>
          </h1>

          {/* Profile Photo and Username Section */}
          <div className="flex justify-between items-start mb-6 border-b border-white py-2 px-10">
            <div className="text-center">
                {/* Show loading state while data is being fetched */}
                {!dataLoaded ? (
                  <div className="w-56 h-56 rounded-full bg-gray-300 animate-pulse flex items-center justify-center ml-10 mb-10 mt-0 mr-36">
                    <FaSpinner className="w-16 h-16 animate-spin text-white text-lg" />
                  </div>
                ) : isLoading ? (
                  <div className="w-56 h-56 rounded-full bg-gray-300 animate-pulse flex items-center justify-center ml-10 mb-10 mt-0 mr-36">
                    <FaSpinner className="w-16 h-16 animate-spin text-white text-lg" />
                  </div>
                ) : (
                  <img
                    src={newPhotoUrl || userData.profilePhoto || "https://via.placeholder.com/150"}
                    alt="Profile Photo"
                    className="w-56 h-56 rounded-full ml-10 mb-10 mt-0 mr-80"
                  />
                )}
            </div>

            <div className="flex flex-col items-start w-2/3">
              <label className="text-white">Profile Picture</label>
              {!dataLoaded ? (
                  <div className="w-full h-10 mb-10 bg-gray-300 animate-pulse rounded-lg"></div>
              ) : (
                <div className="relative group">
                  {/* File Input */}

                    <input
                      type="file"
                      onChange={handleProfilePhotoChange}
                      className="mb-10 text-white"
                      accept="image/*"
                    />

                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full transform -translate-x-3 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
                    Upload Profile Photo
                  </div>
                </div>
              )}
              
              <label htmlFor="username" className="text-white mb-2">Username</label>
              {/* Show loading text for username */}
              {!dataLoaded ? (
                  <div className="w-full h-10 bg-gray-300 animate-pulse rounded-lg"></div>
                ) : (
                <input
                  id="username"
                  type="text"
                  value={userData.username}
                  onChange={(e) => setUserData({ ...userData, username: e.target.value })}
                  placeholder="Username"
                  className="w-full px-4 py-2 rounded-md text-gray-800 outline-none focus:ring-2 focus:ring-yellow-500 bg-white/90"
                />
              )}
            </div>
          </div>

          {/* Bottom Section */}
          <div className="flex justify-between">
            {/* Bio Section */}
            <div className="w-1/2 pr-4">
              <div className="mb-2">
                <label htmlFor="bio" className="text-white mb-2">Additional Info (Bio)</label>
                {/* Loading state for Bio */}
                {!dataLoaded ? (
                  <div className="w-full h-56 bg-gray-300 animate-pulse rounded-lg"></div>
                ) : (
                  <textarea
                    id="bio"
                    value={userData.bio || ''}
                    onChange={(e) => setUserData({ ...userData, bio: e.target.value })}
                    placeholder="Write a short bio"
                    className="w-full h-56 px-4 py-2 rounded-md text-gray-800 outline-none focus:ring-2 focus:ring-yellow-500 bg-white/90 resize-none"
                  />
                )}
              </div>
            </div>

            {/* Password Section */}
              <div className="w-1/2 pl-4">
                {/* Contact Number */}
                <div className="mb-4">
                  <label htmlFor="contactNumber" className="text-white mb-2">Contact Number</label>
                    {/* Loading state for Bio */}
                    {!dataLoaded ? (
                      <div className="w-full h-10 bg-gray-300 animate-pulse rounded-lg"></div>
                    ) : (
                      <input
                        id="contactNumber"
                        type="text"
                        value={userData.contactNumber || ''}
                        onChange={(e) => setUserData({ ...userData, contactNumber: e.target.value })}
                        placeholder="Contact Number"
                        className="w-full px-4 py-2 rounded-md text-gray-800 outline-none focus:ring-2 focus:ring-yellow-500 bg-white/90"
                      />
                    )}
                </div>

                <label htmlFor="changePassword" className="text-white mb-2">Change Password</label>
                {!dataLoaded ? (
                  // Skeleton loader for the entire password section
                  <div className="w-full">
                    <div className="h-40 bg-gray-300 animate-pulse rounded-lg"></div>
                  </div>
                ) : (
                  <div>
                  {/* Only show password change section for non-Google users */}
                  {!isGoogleUser && (
                    <>
                      <div className="mb-2">
                        <div className="relative">
                          <input
                            id="oldPassword"
                            type={showOldPassword ? 'text' : 'password'}
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            placeholder="Old Password"
                            className="w-full px-4 py-2 rounded-md text-gray-800 outline-none focus:ring-2 focus:ring-yellow-500 bg-white/90"
                          />
                          <button
                            type="button"
                            onClick={() => setShowOldPassword(!showOldPassword)}
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                          >
                            {showOldPassword ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </div>

                      <div className="mb-2">
                        <div className="relative">
                          <input
                            id="newPassword"
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="New Password"
                            className="w-full px-4 py-2 rounded-md text-gray-800 outline-none focus:ring-2 focus:ring-yellow-500 bg-white/90"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                          >
                            {showNewPassword ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </div>

                      <div className="mb-2">
                        <div className="relative">
                          <input
                            id="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm Password"
                            className="w-full px-4 py-2 rounded-md text-gray-800 outline-none focus:ring-2 focus:ring-yellow-500 bg-white/90"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                          >
                            {showConfirmPassword ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </div>

                      <PasswordStrengthChecker password={newPassword} />
                    </>
                  )}

                  {isGoogleUser && (
                    <div className="text-white text-center">
                      <p>You cannot change your password because you signed in with Google.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="bg-red-500 text-white text-center rounded p-2 mt-4">
              {errorMessage}
            </div>
          )}

          {/* Update Button */}
          <div className="text-center mt-8">
          <button
            onClick={handleUpdateProfile}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-md"
            disabled={isLoading} // Disable button while loading
          >
            {isLoading ? 'Updating...' : 'Update Profile'}
          </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProfileManagePage;
