// app/admin-user/page.tsx (Admin User Page)
'use client';
import Layout from '../../components/root/Layout';
import { useEffect, useState } from 'react';
import { app } from '../firebase/config'; 
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, collection, getDoc, getDocs, doc, updateDoc, deleteField, Timestamp } from 'firebase/firestore'; 
import { FaEdit } from 'react-icons/fa'; 
import { AiOutlineClose } from 'react-icons/ai';  
import { useRouter } from 'next/navigation';
import useBannedWords from '../../components/forum/hooks/useBannedWords';
import Link from 'next/link';

interface User {
  id: string;
  profilePhoto: string;
  username: string;
  bio: string;
  contactNumber: string;
  visibility: 'public' | 'private';
  role: 'admin' | 'user';
  disabled: boolean; 
  disabledBy: string | null; 
  disabledAt: Timestamp | null; 
}

const AdminUserPage = () => {
  const [users, setUsers] = useState<User[]>([]); 
  const [error, setError] = useState<string | null>(null); 
  const [isLoading, setIsLoading] = useState<boolean>(true); 
  const [isSaving, setIsSaving] = useState<boolean>(false); 
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false); 
  const [selectedUser, setSelectedUser] = useState<User | null>(null); 
  const [editImageFile, setEditImageFile] = useState<File | null>(null); 
  const firestore = getFirestore(app);
  const router = useRouter();
  const auth = getAuth();
  const { bannedWords, loading: bannedWordsLoading } = useBannedWords();
  const [searchQuery, setSearchQuery] = useState<string>(""); 
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]); 
  const [statusFilter, setStatusFilter] = useState<'all' | 'disabled' | 'notDisabled'>('all');

  useEffect(() => {
    
    const checkAdminRole = async (authUser: FirebaseUser | null) => {
      if (!authUser) {
        
        router.push('/sign-in');
        return;
      }

      try {
        
        const userDocRef = doc(firestore, 'users', authUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;

          if (userData.role !== 'admin') {
            
            router.push('/forum');
          }
        } else {
          
          router.push('/sign-in');
        }
      } catch (error) {
        console.error('Error checking user role: ', error);
        router.push('/sign-in');
      }
    };

    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        checkAdminRole(user); 
      } else {
        router.push('/sign-in'); 
      }
    });

    return () => unsubscribe(); 
  }, [auth, firestore, router]);

  useEffect(() => {
    let filtered = [...users];
  
    
    if (statusFilter === 'disabled') {
      filtered = filtered.filter((user) => user.disabled === true);
    } else if (statusFilter === 'notDisabled') {
      filtered = filtered.filter((user) => user.disabled === false);
    }
  
    
    if (searchQuery.trim() !== "") {
      filtered = filtered.filter((user) =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
  
    setFilteredUsers(filtered); 
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
              return acc.replace(regex, (match) => `(**${match}**)`);
            }, text);
          };
  
          usersList.push({
            ...data,
            id: doc.id,
            bio: highlightBannedWords(data.bio || ""),
            contactNumber: highlightBannedWords(data.contactNumber || ""),
            disabled: data.disabled || false, 
          });
        });
  
        setUsers(usersList);
        setFilteredUsers(usersList); 
      } catch (err) {
        setError("Failed to load users.");
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchUsers();
  }, [bannedWords, firestore]);

  const handleEditButtonClick = (user: User) => {
    setSelectedUser(user); 
    setIsModalOpen(true); 
  };

  const handleModalClose = () => {
    setIsModalOpen(false); 
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
      setEditImageFile(e.target.files[0]); 
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (!selectedUser) {
      console.error('No user selected.');
      return;
    }
  
    // Validate username
    if (!selectedUser.username || selectedUser.username.trim() === '') {
      alert('Username cannot be empty. Please provide a valid username.');
      return;
    }
  
    // Validate contact number format
    const contactNumberRegex = /^\+63\s\d{3}\s\d{3}\s\d{4}$/; // Example: +63 123 456 7890
    if (
      selectedUser.contactNumber && 
      !contactNumberRegex.test(selectedUser.contactNumber)
    ) {
      alert(
        'Contact number is invalid. It should be in the format: +63 123 456 7890'
      );
      return;
    }
  
    setIsSaving(true);
  
    try {
      let imageUrl = selectedUser.profilePhoto;
  
      // Handle image upload if a new file is provided
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
        imageUrl = data.secure_url; // Update image URL
      }
  
      // Update Firestore document
      const userRef = doc(firestore, 'users', selectedUser.id);
      await updateDoc(userRef, {
        profilePhoto: imageUrl,
        username: selectedUser.username,
        bio: selectedUser.bio,
        contactNumber: selectedUser.contactNumber,
      });
  
      // Update local user state
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
  
      // Reset modal and selected user
      setIsModalOpen(false);
      setSelectedUser(null);
      setEditImageFile(null);
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
  
        
        const response = await fetch('/api/admin/disableUser', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uid: userId,
            isDisabled: !isCurrentlyDisabled, 
          }),
        });
  
        const data = await response.json();
        if (response.ok) {
          
          await updateDoc(userRef, {
            disabled: !isCurrentlyDisabled, 
            disabledBy: !isCurrentlyDisabled ? auth.currentUser?.uid : null, 
            disabledAt: !isCurrentlyDisabled ? currentTimestamp : null, 
          });
  
          
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

  const handleToggleRole = async (userId: string, currentRole: 'admin' | 'user') => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
  
    if (!confirm(`Are you sure you want to ${newRole === 'admin' ? 'make this user an admin' : 'revoke admin rights from this user'}?`)) return;
  
    try {
      const userRef = doc(firestore, 'users', userId);
  
      
      await updateDoc(userRef, {
        role: newRole,
      });
  
      
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      );
      setFilteredUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      );
  
    } catch (error) {
      console.error("Error toggling user role:", error);
      setError("Failed to update user role.");
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
          <h1 className="text-xl text-white mb-8 border-b-2 border-white pb-2">Users (Admin Mode)</h1>
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
                  {/* Role Button */}
                  <button
                    onClick={() => handleToggleRole(user.id, user.role)} 
                    className="h-8 w-28 text-xs rounded-2xl bg-[#2c2c2c] text-white"
                  >
                    {user.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                  </button>
                  {/* Edit Button */}
                  <button
                    onClick={() => handleEditButtonClick(user)}
                    className="pl-3 text-center justify-center h-8 w-10 bg-[#2c2c2c] rounded-2xl text-sm text-white hover:bg-yellow-500"
                  >
                    <FaEdit className="h-4 w-4"/>
                  </button>

                  {/* Ban Button */}
                  <button
                    onClick={() => handleBanUser(user.id, user.disabled)} 
                    className={`h-8 w-12 text-xs rounded-2xl ${user.disabled ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white`}
                  >
                    {user.disabled ? 'Unban' : 'Ban'}
                  </button>
                </div>

                {/* Left Section: Profile Image and Username */}
                <div className="flex flex-col items-center w-1/3">
                  <Link href={`/profile-view/${user.id}`}>
                    <img
                      src={user.profilePhoto || 'https://via.placeholder.com/150'}
                      alt="Profile"
                      className="w-32 h-32 rounded-full mb-4"
                    />
                  </Link>
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
                          onClick={() => setEditImageFile(null)} 
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
                    value={selectedUser?.username || ""}
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
