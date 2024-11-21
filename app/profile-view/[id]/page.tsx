// app/discussion-board/page.tsx (Discussion Board Page)
'use client';
import Layout from '../../../components/root/Layout'; // Layout component
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation'; // For dynamic route params
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../../firebase/config'; // Import Firestore instance
import { getAuth } from 'firebase/auth'; // For getting the current logged-in user's UID
import { FaEdit } from 'react-icons/fa'; // Importing the Edit icon from react-icons
import useBannedWords from '../../../components/forum/hooks/useBannedWords';

interface User {
  profilePhoto: string;
  username: string;
  bio: string;
  contactNumber: string;
}

const ProfileView = () => {
  const { id } = useParams(); // Get the `id` from the dynamic route
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null); // To store current logged-in user's UID
  const router = useRouter();
  const { bannedWords, loading: bannedWordsLoading } = useBannedWords();

  useEffect(() => {
    // Get the current user's ID from Firebase Authentication
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      setCurrentUserId(user.uid); // Store the UID of the logged-in user
    }
  }, []);

  useEffect(() => {
    if (!id || Array.isArray(id)) return; // Ensure `id` is a single string before proceeding
  
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const userDoc = await getDoc(doc(firestore, 'users', id)); // Fetch user data
        if (userDoc.exists()) {
          const data = userDoc.data() as User;
  
          // Filter banned words from bio and contactNumber
          let filteredBio = data.bio || "";
          let filteredContact = data.contactNumber || "";
  
          bannedWords.forEach((word) => {
            const regex = new RegExp(`\\b${word}\\b`, "gi"); // Match full words, case insensitive
            filteredBio = filteredBio.replace(regex, "*".repeat(word.length));
            filteredContact = filteredContact.replace(regex, "*".repeat(word.length));
          });
  
          setUserData({
            ...data,
            bio: filteredBio,
            contactNumber: filteredContact,
          });
        } else {
          setError('User not found.');
        }
      } catch (err) {
        setError('Failed to load user data.');
      } finally {
        setLoading(false);
      }
    };
  
    fetchUserData();
  }, [id, bannedWords]);

  if (loading || bannedWordsLoading) {
    return (
      <Layout>
        <div>
          <p className="text-center text-white mt-10">Loading profile...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return <p className="text-center text-red-500 mt-10">{error}</p>;
  }

  if (!userData) {
    return null; // Safety check for null user data
  }

  const handleEditProfile = () => {
    // Redirect to the profile-manage page only if the logged-in user's UID matches the profile ID
    if (currentUserId === id) {
      router.push('/profile-manage'); // Navigate to the profile manage page
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl h-5/6 mx-40 mt-10 p-8 bg-[#383434] rounded-lg relative">
        {/* Edit Button with Tooltip - Visible only if the logged-in user is the same as the profile */}
        {currentUserId === id && (
          <div className="relative group">
            <button
              onClick={handleEditProfile}
              className="absolute -top-4 -right-4 p-2 bg-[#4A4A4A] rounded-full text-white hover:bg-yellow-500"
            >
              <FaEdit />
            </button>

            {/* Tooltip */}
            <div className="absolute top-full mt-4 -right-9 transform translate-x-0 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
              Edit Profile
            </div>
          </div>
        )}

        <div className="mt-6 flex items-start space-x-8"> {/* Flex container with space between */}
          
          {/* Left Section: Profile Image and Username */}
          <div className="flex flex-col items-center w-1/3">
            <img
              src={userData.profilePhoto || 'https://via.placeholder.com/150'}
              alt="Profile"
              className="w-60 h-60 rounded-full mb-4" // Adjusted for bigger image
            />
            <h1 className="text-2xl text-white font-bold">{userData.username}</h1>
          </div>

          {/* Right Section: Bio and Contact Number */}
          <div className="flex flex-col w-2/3">
            {/* Bio */}
            <div className="bg-[#4A4A4A] p-4 rounded-lg mb-4 flex-grow min-h-60">
              <p className="text-gray-300 italic">
                <span className="font-bold text-white">Bio: </span><br></br>
                {userData.bio || 'No bio available'}
              </p>
            </div>

            {/* Contact Number */}
            <div className="bg-[#4A4A4A] p-4 rounded-lg">
              <p className="text-white">
                <span className="font-bold">Contact: </span>
                {userData.contactNumber || 'Not provided'}
              </p>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
};

export default ProfileView;
