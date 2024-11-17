// app/profile/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Cloudinary } from 'cloudinary-core';
import Layout from '../../components/root/Layout'; // Layout component import
import PasswordStrengthChecker from '../../components/auth/PasswordStrengthChecker'; // Import the strength checker

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

  // Update the user info in Firestore and Firebase Authentication
  const handleUpdateProfile = async () => {
    if (!userData.username) {
      setErrorMessage('Username is required.');
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
      } else if (isGoogleUser) {
        alert('You cannot change your password because you signed in with Google');
      }
  
      alert('Profile updated successfully');
      router.push('/discussion-board'); // Redirect to the discussion board
    } catch (error: any) {
      setErrorMessage(error.message);
    }
  };

  return (
    <Layout>
      <div className="flex justify-center items-start min-h-screen bg-[#484242] p-8">
        <div
          className="bg-white/30 border border-white rounded-lg backdrop-blur-md p-8 shadow-lg w-full max-w-4xl"
          style={{ paddingTop: '30px', paddingBottom: '30px' }}
        >
          <h1 className="text-4xl font-bold text-center text-white mb-6">
            <span className="text-yellow-500">Profile Manager</span>
          </h1>

          {/* Profile Photo and Username Section */}
          <div className="flex justify-between items-start mb-6 border-b border-white py-2 px-10">
            <div className="text-center">
              <img
                src={newPhotoUrl || userData.profilePhoto || "https://via.placeholder.com/150"}
                alt="Profile Photo"
                className="w-56 h-56 rounded-full ml-10 mb-10 mt-0 mr-80"
              />
            </div>

            <div className="flex flex-col items-start w-2/3 ml-4">
              <label className="text-white">Profile Picture</label>
              <input
                type="file"
                onChange={handleProfilePhotoChange}
                className="mb-10 text-white"
                accept="image/*" 
              />
              <label htmlFor="username" className="text-white mb-2">Username</label>
              <input
                id="username"
                type="text"
                value={userData.username}
                onChange={(e) => setUserData({ ...userData, username: e.target.value })}
                placeholder="Username"
                className="w-full px-4 py-2 rounded-md text-gray-800 outline-none focus:ring-2 focus:ring-yellow-500 bg-white/90"
              />
            </div>
          </div>

          {/* Bottom Section */}
          <div className="flex justify-between">
            <div className="w-1/2 pr-4">
              {/* Bio Section */}
              <div className="mb-2">
                <label htmlFor="bio" className="text-white mb-2">Additional Info (Bio)</label>
                <textarea
                  id="bio"
                  value={userData.bio}
                  onChange={(e) => setUserData({ ...userData, bio: e.target.value })}
                  placeholder="Tell us something about you..."
                  className="w-full px-4 py-2 rounded-md text-gray-800 outline-none focus:ring-2 focus:ring-yellow-500 bg-white/90 h-32 resize-none"
                />
              </div>

              {/* Contact Number */}
              <div className="mb-4">
                <label htmlFor="contactNumber" className="text-white mb-2">Contact Number</label>
                <input
                  id="contactNumber"
                  type="text"
                  value={userData.contactNumber}
                  onChange={(e) => setUserData({ ...userData, contactNumber: e.target.value })}
                  placeholder="Your contact number"
                  className="w-full px-4 py-2 rounded-md text-gray-800 outline-none focus:ring-2 focus:ring-yellow-500 bg-white/90"
                />
              </div>
            </div>

            {/* Password Section */}
            <div className="w-1/2 pl-4">
              <div className="mb-4">
                <label htmlFor="oldPassword" className="text-white mb-2">Old Password</label>
                <div className="relative">
                  <input
                    type={showOldPassword ? 'text' : 'password'}
                    id="oldPassword"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Enter old password"
                    className="w-full px-4 py-2 rounded-md text-gray-800 outline-none focus:ring-2 focus:ring-yellow-500 bg-white/90"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute top-2 right-2"
                  >
                    {showOldPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="newPassword" className="text-white mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-4 py-2 rounded-md text-gray-800 outline-none focus:ring-2 focus:ring-yellow-500 bg-white/90"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute top-2 right-2"
                  >
                    {showNewPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="confirmPassword" className="text-white mb-2">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-4 py-2 rounded-md text-gray-800 outline-none focus:ring-2 focus:ring-yellow-500 bg-white/90"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute top-2 right-2"
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Password strength checker */}
              <PasswordStrengthChecker password={newPassword} />
            </div>
          </div>
          <div className="flex flex-col justify-center text-center">
            {errorMessage && <p className="mt-6 text-red-500 font-semibold">{errorMessage}</p>}
            <button
                onClick={handleUpdateProfile}
                className="mt-2 w-full py-2 px-4 bg-yellow-500 text-white rounded-md"
                disabled={isLoading}
              >
                {isLoading ? 'Updating...' : 'Update Profile'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProfilePage;
