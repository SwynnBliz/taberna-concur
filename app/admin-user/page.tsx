// app/admin-user/page.tsx (Admin User Page)
'use client';
import Layout from '../../components/root/Layout';
import { useEffect, useState } from 'react';
import { app } from '../firebase/config'; // Firebase config import
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, collection, getDoc, getDocs, doc, updateDoc, deleteField, Timestamp } from 'firebase/firestore'; // Import Firestore methods
import { FaEdit } from 'react-icons/fa'; // Importing React Icons
import { AiOutlineClose } from 'react-icons/ai';  // Import close icon
import { useRouter } from 'next/navigation';
import useBannedWords from '../../components/forum/hooks/useBannedWords';

interface User {
  id: string;
  profilePhoto: string;
  username: string;
  bio: string;
  contactNumber: string;
  visibility: 'public' | 'private';
  role: 'admin' | 'user';
  disabled: boolean; // Indicates if the user is banned
  disabledBy: string | null; // The ID of the admin who banned the user, or null if not banned
  disabledAt: Timestamp | null; // Timestamp when the user was banned
}

const AdminUserPage = () => {
  const [users, setUsers] = useState<User[]>([]); // State to store users
  const [error, setError] = useState<string | null>(null); // State to store error message
  const [isLoading, setIsLoading] = useState<boolean>(true); // Loading state
  const [isSaving, setIsSaving] = useState<boolean>(false); // Saving state to show loading spinner
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false); // State to control the modal visibility
  const [selectedUser, setSelectedUser] = useState<User | null>(null); // State for selected user to edit
  const [editImageFile, setEditImageFile] = useState<File | null>(null); // State for the new image file
  const firestore = getFirestore(app);
  const router = useRouter();
  const auth = getAuth();
  const { bannedWords, loading: bannedWordsLoading } = useBannedWords();
  const [searchQuery, setSearchQuery] = useState<string>(""); // State for search bar
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]); // For search results
  const [statusFilter, setStatusFilter] = useState<'all' | 'disabled' | 'notDisabled'>('all');

  useEffect(() => {
    // Function to check if the user has admin role
    const checkAdminRole = async (authUser: FirebaseUser | null) => {
      if (!authUser) {
        // Redirect to login or home if no user is logged in
        router.push('/sign-in');
        return;
      }

      try {
        // Fetch the user document from Firestore using the Firebase auth user id (uid)
        const userDocRef = doc(firestore, 'users', authUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;

          if (userData.role !== 'admin') {
            // Redirect if user is not an admin
            router.push('/discussion-board');
          }
        } else {
          // Redirect if user data doesn't exist in Firestore
          router.push('/sign-in');
        }
      } catch (error) {
        console.error('Error checking user role: ', error);
        router.push('/sign-in');
      }
    };

    // Check the user's authentication status and their role
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        checkAdminRole(user); // 'user' is of type FirebaseUser here
      } else {
        router.push('/sign-in'); // Redirect if no user is logged in
      }
    });

    return () => unsubscribe(); // Clean up the listener on component unmount
  }, [auth, firestore, router]);

  useEffect(() => {
    let filtered = [...users];
  
    // Apply the status filter
    if (statusFilter === 'disabled') {
      filtered = filtered.filter((user) => user.disabled === true);
    } else if (statusFilter === 'notDisabled') {
      filtered = filtered.filter((user) => user.disabled === false);
    }
  
    // Apply search query filter
    if (searchQuery.trim() !== "") {
      filtered = filtered.filter((user) =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
  
    setFilteredUsers(filtered); // Set the filtered users
  }, [statusFilter, searchQuery, users]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersCollectionRef = collection(firestore, "users");
        const querySnapshot = await getDocs(usersCollectionRef);
        const usersList: User[] = [];
  
        querySnapshot.forEach((doc) => {
          const data = doc.data() as User;
  
          const highlightBannedWords = (text: string) => {
            if (!text) return "";
            return bannedWords.reduce((acc, word) => {
              const regex = new RegExp(`\\b(${word})\\b`, "gi");
              return acc.replace(regex, "*".repeat(word.length));
            }, text);
          };
  
          usersList.push({
            ...data,
            id: doc.id,
            bio: highlightBannedWords(data.bio || ""),
            contactNumber: highlightBannedWords(data.contactNumber || ""),
            disabled: data.disabled || false, // Ensure that we are tracking disabled state
          });
        });
  
        setUsers(usersList);
        setFilteredUsers(usersList); // Set initial filtered users
      } catch (err) {
        setError("Failed to load users.");
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchUsers();
  }, [bannedWords, firestore]);

  const handleEditButtonClick = (user: User) => {
    setSelectedUser(user); // Set the selected user to be edited
    setIsModalOpen(true); // Open the modal
  };

  const handleModalClose = () => {
    setIsModalOpen(false); // Close the modal
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (selectedUser) {
      setSelectedUser({
        ...selectedUser,
        [e.target.name]: e.target.value,
      });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEditImageFile(e.target.files[0]); // Save the selected image file
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (!selectedUser) {
      console.error('No user selected.');
      return;
    }
  
    setIsSaving(true);
  
    try {
      let imageUrl = selectedUser.profilePhoto; // Default to current profile photo
  
      // If a new image file is selected, upload it to Cloudinary
      if (editImageFile) {
        const formData = new FormData();
        formData.append('file', editImageFile);
        formData.append('upload_preset', 'post-image-upload');
  
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
          { method: 'POST', body: formData }
        );
  
        if (!res.ok) {
          throw new Error('Image upload failed');
        }
  
        const data = await res.json();
        imageUrl = data.secure_url; // Update the profile photo URL
      }
  
      // Update the user in Firestore
      const userRef = doc(firestore, 'users', selectedUser.id);
      await updateDoc(userRef, {
        profilePhoto: imageUrl, // Retain current photo if no new image is uploaded
        username: selectedUser.username,
        bio: selectedUser.bio,
        contactNumber: selectedUser.contactNumber,
      });
  
      // Update local state
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === selectedUser.id
            ? {
                ...user,
                profilePhoto: imageUrl,
                username: selectedUser.username,
                bio: selectedUser.bio,
                contactNumber: selectedUser.contactNumber,
              }
            : user
        )
      );
  
      // Reset modal and state
      setIsModalOpen(false);
      setSelectedUser(null);
      setEditImageFile(null); // Reset the selected file
    } catch (error) {
      console.error('Error updating user profile:', error);
    } finally {
      setIsSaving(false);
    }
  };  

  const handleBanUser = async (userId: string, isCurrentlyDisabled: boolean) => {
    if (!confirm(`Are you sure you want to ${isCurrentlyDisabled ? 'unban' : 'ban'} this user?`)) return;
  
    try {
      const userRef = doc(firestore, "users", userId);
      const userDoc = await getDoc(userRef);
  
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const currentTimestamp = new Date().toISOString();
  
        // Make an API call to disable/enable the user in Firebase Auth
        const response = await fetch('/api/admin/disableUser', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uid: userId,
            isDisabled: !isCurrentlyDisabled, // Send the opposite of the current status
          }),
        });
  
        const data = await response.json();
        if (response.ok) {
          // Only update Firestore if the API call is successful
          await updateDoc(userRef, {
            disabled: !isCurrentlyDisabled, // Toggle disable status
            disabledBy: !isCurrentlyDisabled ? auth.currentUser?.uid : null, // Set the admin who disabled the account
            disabledAt: !isCurrentlyDisabled ? currentTimestamp : null, // Timestamp of when the user was banned
          });
  
          // Update local state
          setUsers((prevUsers) =>
            prevUsers.map((user) =>
              user.id === userId
                ? { ...user, disabled: !isCurrentlyDisabled }
                : user
            )
          );
          setFilteredUsers((prevUsers) =>
            prevUsers.map((user) =>
              user.id === userId
                ? { ...user, disabled: !isCurrentlyDisabled }
                : user
            )
          );
        } else {
          console.error('Error disabling/enabling user in Firebase Auth:', data.message);
          setError('Failed to ban/unban user in Firebase Auth.');
        }
      }
    } catch (err) {
      console.error("Error banning/unbanning user:", err);
      setError("Failed to ban/unban user.");
    }
  };  

  if (isLoading) {
    return (
      <Layout>
        <div>
          <p className="text-center text-white mt-10">Loading users...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return <p className="text-center text-red-500 mt-10">{error}</p>;
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-40 mt-10 p-8 bg-[#383434] rounded-lg relative flex flex-col">
        <section>
          <h1 className="text-3xl font-bold text-white mb-8">Users</h1>
          <div className="space-y-8">
             {/* Status Filter Dropdown */}
            <div className="mb-4">
              <label className="block text-white">User Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'disabled' | 'notDisabled')}
                className="w-full p-2 rounded-md focus:ring-2 focus:ring-yellow-500 outline-none text-white bg-[#252323]"
              >
                <option value="all">All Users</option>
                <option value="disabled">Disabled Users</option>
                <option value="notDisabled">Active Users</option>
              </select>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by username..."
                className="w-full p-3 rounded-md focus:ring-2 focus:ring-yellow-500 outline-none text-white bg-[#252323]"
              />
            </div>

            {/* Display Users */}
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-start space-x-8 space-y-4 bg-[#424242] p-8 rounded-lg mb-6 relative"
              >
                <div className="absolute top-2 right-4 flex space-x-2">
                  {/* Edit Button */}
                  <button
                    onClick={() => handleEditButtonClick(user)}
                    className="pl-3 text-center justify-center h-8 w-10 bg-[#2c2c2c] rounded-2xl text-sm text-white hover:bg-yellow-500"
                  >
                    <FaEdit className="h-4 w-4"/>
                  </button>

                  {/* Ban Button */}
                  <button
                    onClick={() => handleBanUser(user.id, user.disabled)} // Toggle ban/unban
                    className={`h-8 w-12 text-xs rounded-2xl ${user.disabled ? 'bg-green-500' : 'bg-red-500'} text-white`}
                  >
                    {user.disabled ? 'Unban' : 'Ban'}
                  </button>
                </div>

                {/* Left Section: Profile Image and Username */}
                <div className="flex flex-col items-center w-1/3">
                  <img
                    src={user.profilePhoto || 'https://via.placeholder.com/150'}
                    alt="Profile"
                    className="w-32 h-32 rounded-full mb-4"
                  />
                  <h2 className="text-xl text-white font-bold">{user.username}</h2>
                </div>
        
                {/* Right Section: Bio and Contact Number */}
                <div className="flex flex-col w-2/3">
                  {/* Bio */}
                  <div className="bg-[#2c2c2c] p-4 rounded-lg mb-4 max-h-60 overflow-auto">
                    <p className="text-gray-300 whitespace-pre-wrap">
                      {user.bio || 'No bio provided'}
                    </p>
                  </div>
                  
                  {/* Contact Number */}
                  <div className="bg-[#2c2c2c] p-4 rounded-lg">
                    <p className="text-gray-300">{user.contactNumber || 'No contact number provided'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Modal for Editing User */}
        {isModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-[#484242] bg-opacity-80 flex justify-center items-center z-50">
            <div className="bg-[#383434] p-6 rounded-lg w-3/5 max-w-2xl h-5/6 overflow-auto">
            <h3 className="text-2xl text-white mb-4">Edit Profile</h3>
            <form onSubmit={handleSubmit}>
                {/* Image Preview */}
                <div className="flex flex-col items-center mb-4">
                  <label className="block text-white">Profile Image</label>
                  <div className="flex items-center justify-center space-x-4">
                    {/* Current Profile Image */}
                    <img
                      src={selectedUser.profilePhoto || 'https://via.placeholder.com/150'}
                      alt="Current Profile"
                      className="w-32 h-32 rounded-full"
                    />

                    {/* New Image Preview */}
                    {editImageFile && (
                      <div className="relative">
                        <img
                          src={URL.createObjectURL(editImageFile)}
                          alt="New Preview"
                          className="w-32 h-32 rounded-full"
                        />
                        {/* Close button for the new image */}
                        <button
                          type="button"
                          onClick={() => setEditImageFile(null)} // Reset the new image selection
                          className="absolute top-2 right-2 bg-[#2c2c2c] text-white rounded-full p-1 hover:bg-yellow-500"
                        >
                          <AiOutlineClose size={20} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Input to upload a new image */}
                  <input
                    type="file"
                    onChange={handleImageUpload}
                    className="mt-4 p-2 text-white"
                  />
                </div>

                {/* Username */}
                <div className="mb-4">
                <label className="block text-white">Username</label>
                <input
                    type="text"
                    name="username"
                    value={selectedUser?.username || "Anonymous"}
                    onChange={handleInputChange}
                    className="w-full p-2 rounded-md focus:ring-2 focus:ring-yellow-500 outline-none text-white bg-[#252323]"
                />
                </div>

                {/* Bio */}
                <div className="mb-4">
                <label className="block text-white">Bio</label>
                <textarea
                    name="bio"
                    value={selectedUser?.bio || ""}
                    onChange={handleInputChange}
                    className="w-full p-2 min-h-40 rounded-md focus:ring-2 focus:ring-yellow-500 outline-none text-white bg-[#252323]"
                />
                </div>

                {/* Contact Number */}
                <div className="mb-4">
                <label className="block text-white">Contact Number</label>
                <input
                    type="text"
                    name="contactNumber"
                    value={selectedUser.contactNumber}
                    onChange={handleInputChange}
                    className="w-full p-2 rounded-md focus:ring-2 focus:ring-yellow-500 outline-none text-white bg-[#252323]"
                />
                </div>

                {/* Modal Buttons */}
                <div className="flex justify-between mt-4">
                <button
                    type="button"
                    onClick={handleModalClose}
                    className="bg-gray-500 px-4 py-2 rounded-md text-white"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="bg-yellow-500 px-4 py-2 rounded-md text-white"
                >
                    {isSaving ? 'Saving...' : 'Update Profile'}
                </button>
                </div>
            </form>
            </div>
        </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminUserPage;
