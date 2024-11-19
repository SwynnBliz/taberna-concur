// app/discussion-board/page.tsx (Discussion Board Page)
'use client';
import Layout from '../../../components/root/Layout'; // Layout component
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation'; // For dynamic route params
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../../firebase/config'; // Import Firestore instance

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

  useEffect(() => {
    if (!id || Array.isArray(id)) return; // Ensure `id` is a single string before proceeding
  
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const userDoc = await getDoc(doc(firestore, 'users', id)); // id is now correctly passed as string
        if (userDoc.exists()) {
          setUserData(userDoc.data() as User);
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
  }, [id]);

  if (loading) {
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

  return (
    <Layout>
      <div className="max-w-7xl h-5/6 mx-40 mt-10 p-8 bg-[#383434] rounded-lg">
        <div className="flex items-start space-x-8"> {/* Flex container with space between */}
          
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
