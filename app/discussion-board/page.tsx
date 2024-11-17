// app/discussion-board/page.tsx (Discussion Board Page)
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth'; // Firebase Auth import
import { getFirestore, doc, getDoc } from 'firebase/firestore'; // Firestore import
import { app } from '../firebase/config'; // Firebase config import
import Layout from '../../components/root/Layout'; // Layout component import

const DashboardPage = () => {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [bio, setBio] = useState<string | null>(null);
  const [contactNumber, setContactNumber] = useState<string | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string>(''); // Default to empty string, not null
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const firestore = getFirestore(app);
  const auth = getAuth(app);

  useEffect(() => {
    // Check for the authenticated user on component mount
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUserEmail(user.email); // Set the email of the logged-in user
        setIsAuthenticated(true);

        // Get the user data from Firestore
        const userRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          setUsername(data?.username || 'No username found');
          setBio(data?.bio || 'No bio available');
          setContactNumber(data?.contactNumber || 'No contact number available');
          setProfilePhoto(data?.profilePhoto || 'https://via.placeholder.com/150'); // Set default placeholder
        }
      } else {
        setIsAuthenticated(false);
        setUserEmail(null);
        setUsername(null);
        setBio(null);
        setContactNumber(null);
        setProfilePhoto('');
      }
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [auth, firestore]);

  const handleProfile = () => {
    router.push('/profile'); // Navigate to profile page (example)
  };

  const handleLogout = () => {
    router.push('/sign-in'); // Redirect to sign-in page after logout
  };

  return (
    <Layout>
      {/* Changed the background to solid color */}
      <div className="flex justify-center items-center min-h-screen bg-[#484242]">
        <div className="bg-white/20 border border-white rounded-lg backdrop-blur-md p-8 shadow-lg w-full max-w-md">
          <h1 className="text-5xl font-bold text-center text-white mb-6">
            <span style={{ fontFamily: 'Arial, sans-serif' }}>Welcome to </span>
            <span className="text-yellow-500 italic island-moments">TabernaConcur</span>
          </h1>

          {isAuthenticated && userEmail && username ? (
            <div className="text-center text-white mb-6">
              <p className="text-lg">Logged in as:</p>
              <p className="text-xl font-semibold">{username}</p>
              <p className="text-sm">{userEmail}</p>
              <img
                src={profilePhoto || 'https://via.placeholder.com/150'} // Provide a fallback URL if profilePhoto is empty
                alt="Profile Photo"
                className="w-32 h-32 rounded-full mx-auto mb-4"
              />
              <p className="text-lg">{bio}</p>
              <p className="text-sm">{contactNumber}</p>
            </div>
          ) : (
            <p className="text-lg text-center text-white mb-8">
              Please log in to continue.
            </p>
          )}

          <div className="flex gap-4 justify-center">
            <button
              onClick={handleProfile}
              className="w-1/2 py-2 border border-[#D6A336] bg-[#2B1A0A] text-white font-semibold rounded-md hover:bg-transparent transition duration-200"
            >
              View Profile
            </button>
            <button
              onClick={handleLogout}
              className="w-1/2 py-2 border border-[#D6A336] bg-[#2B1A0A] text-white font-semibold rounded-md hover:bg-transparent transition duration-200"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardPage;
