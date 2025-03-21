// app/admin-user/page.tsx (Admin User Page)
'use client';
import Layout from '../../components/root/Layout';
import { useEffect, useState } from 'react';
import { app } from '../firebase/config'; 
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, collection, getDoc, getDocs, doc, updateDoc, Timestamp, query, where, addDoc, setDoc, deleteDoc } from 'firebase/firestore'; 
import { FaEdit, FaTrash, FaTimes } from 'react-icons/fa'; 
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
  isNCIIHolder: boolean;
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
  const [selectedWarningUser, setSelectedWarningUser] = useState<User | null>(null);
  const [warnings, setWarnings] = useState<{ id: string; [key: string]: any }[]>([]);
  const [newWarning, setNewWarning] = useState({ category: '', message: '', id: '' });

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
  
    setIsSaving(true);
  
    try {
      let imageUrl = selectedUser.profilePhoto;
  
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
        imageUrl = data.secure_url;
      }
  
      const userRef = doc(firestore, 'users', selectedUser.id);
      await updateDoc(userRef, {
        profilePhoto: imageUrl,
        username: selectedUser.username,
        bio: selectedUser.bio,
      });
  
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === selectedUser.id
            ? {
                ...user,
                profilePhoto: imageUrl,
                username: selectedUser.username,
                bio: selectedUser.bio,
              }
            : user
        )
      );
  
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
  
    let banMessage: string | null = '';
    if (!isCurrentlyDisabled) {
      do {
        banMessage = prompt("Please provide a reason for banning (cannot be empty):");
        if (banMessage === null) return;
      } while (banMessage.trim() === '');
    }
  
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
          // Update user document
          await updateDoc(userRef, {
            disabled: !isCurrentlyDisabled, 
            disabledBy: !isCurrentlyDisabled ? auth.currentUser?.uid : null, 
            disabledAt: !isCurrentlyDisabled ? currentTimestamp : null, 
            banMessage: !isCurrentlyDisabled ? banMessage || '' : null,
          });
  
          // Update the settings document with disabledIds array
          const settingsRef = doc(firestore, "settings", "disabledIds");
          const settingsDoc = await getDoc(settingsRef);
  
          let disabledIds = [];
          if (settingsDoc.exists()) {
            const settingsData = settingsDoc.data();
            disabledIds = settingsData?.disabledIds || [];
          } else {
            // If settings document doesn't exist, create it with an empty disabledIds array
            await setDoc(settingsRef, { disabledIds: [] });
          }
  
          if (!isCurrentlyDisabled) {
            // Ban: Add userId to disabledIds array
            if (!disabledIds.includes(userId)) {
              disabledIds.push(userId);
            }
          } else {
            // Unban: Remove userId from disabledIds array
            disabledIds = disabledIds.filter((id: string) => id !== userId);
          }
          await updateDoc(settingsRef, { disabledIds: disabledIds });

          alert(`User has been ${isCurrentlyDisabled ? 'unbanned' : 'banned and logged out'} successfully.`);
  
          // Update users list UI
          setUsers((prevUsers) =>
            prevUsers.map((user) =>
              user.id === userId
                ? { ...user, disabled: !isCurrentlyDisabled, banMessage: !isCurrentlyDisabled ? banMessage : null }
                : user
            )
          );
          setFilteredUsers((prevUsers) =>
            prevUsers.map((user) =>
              user.id === userId
                ? { ...user, disabled: !isCurrentlyDisabled, banMessage: !isCurrentlyDisabled ? banMessage : null }
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

  const handleToggleNCIIHolder = async (userId: string, isNCIIHolder: boolean) => {
    const newStatus = !isNCIIHolder;
  
    if (!confirm(`Are you sure you want to ${newStatus ? 'make this user an NC II holder' : 'revoke NC II status from this user'}?`)) return;
  
    try {
      const userRef = doc(firestore, 'users', userId);
  
      await updateDoc(userRef, {
        isNCIIHolder: newStatus,
      });
  
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, isNCIIHolder: newStatus } : user
        )
      );
      setFilteredUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, isNCIIHolder: newStatus } : user
        )
      );
  
    } catch (error) {
      console.error("Error toggling NC II status:", error);
      setError("Failed to update NC II status.");
    }
  };

  const handleOpenWarningModal = async (user: User) => {
    setSelectedWarningUser(user);
    
    try {
      // Fetch warnings from Firestore
      const warningsSnapshot = await getDocs(
        query(collection(firestore, "warnings"), where("userId", "==", user.id))
      );

      const userWarnings = warningsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Record<string, any>),
      }));

      setWarnings(userWarnings);
    } catch (error) {
      console.error("Error fetching warnings:", error);
    }
  };

  const handleCloseWarningModal = () => {
    setSelectedWarningUser(null);
    setWarnings([]);
    setNewWarning({ category: '', message: '', id: '' });
  };

  // Create Warning
  const handleCreateWarning = async () => {
    const { category, message, id } = newWarning;
    if (!category || !message || !id) {
      alert('All fields are required.');
      return;
    }

    const baseUrl = category === 'profile' ? '/profile-view/' : '/forum/';
    const link = `${baseUrl}${id}`;

    if (!selectedWarningUser) {
      alert("No user selected.");
      return;
    }

    await addDoc(collection(firestore, "warnings"), {
      userId: selectedWarningUser.id,
      username: selectedWarningUser.username,
      category,
      message,
      link,
      timestamp: new Date().toISOString(),
      status: "pending",
    });

    alert('Warning created successfully.');
    handleOpenWarningModal(selectedWarningUser);

    setNewWarning({
      category: '',
      message: '',
      id: ''
    });
  };

  const handleDeleteWarning = async (warningId: string) => {
    if (window.confirm("Are you sure you want to delete this warning?")) {
      try {
        await deleteDoc(doc(firestore, "warnings", warningId));
        setWarnings(warnings.filter((warning) => warning.id !== warningId));
        alert("Warning deleted successfully.");
      } catch (error) {
        console.error("Error deleting warning:", error);
        alert("Failed to delete the warning. Please try again.");
      }
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
    return (
      <Layout>
        <p className="text-center text-white mt-10">{error}</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto mt-10 p-6 bg-[#383838] rounded-lg relative flex flex-col w-full sm:p-8">
      <section>
        <h1 className="text-xl text-white mb-6 border-b-2 border-white pb-2">Manage Users</h1>
        <div className="space-y-6">
          {/* Status Filter Dropdown */}
          <div>
            <label className="block text-white">User Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'disabled' | 'notDisabled')}
              className="w-full p-2 rounded-md focus:ring-2 focus:ring-yellow-500 outline-none text-white bg-[#2c2c2c]"
            >
              <option value="all">All Users</option>
              <option value="disabled">Disabled Users</option>
              <option value="notDisabled">Active Users</option>
            </select>
          </div>

          {/* Search Bar */}
          <div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by username..."
              className="w-full p-3 rounded-md focus:ring-2 focus:ring-yellow-500 outline-none text-white bg-[#2c2c2c]"
            />
          </div>

            {/* Display Users */}
{filteredUsers.map((user) => (
  <div
    key={user.id}
    className="flex flex-col md:flex-row items-start md:items-center space-x-0 md:space-x-8 space-y-4 bg-[#484848] p-4 md:p-8 rounded-lg mb-6 relative"
  >
    {/* Action Buttons - Mobile Responsive */}
    <div className="flex flex-wrap gap-2 justify-end md:absolute md:top-2 md:right-8">
      {/* Role Button */}
      <button
        onClick={() => handleToggleRole(user.id, user.role)} 
        className="h-8 px-4 text-xs rounded-2xl bg-[#2c2c2c] text-white hover:bg-yellow-500"
      >
        {user.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
      </button>

      {/* NCII Holder Button */}
      <button
        onClick={() => handleToggleNCIIHolder(user.id, user.isNCIIHolder)}
        className="h-8 px-4 text-xs rounded-2xl bg-[#2c2c2c] text-white hover:bg-yellow-500"
      >
        {user.isNCIIHolder ? 'Revoke NC II' : 'Make NC II'}
      </button>

      {/* Edit Button */}
      <button
        onClick={() => handleEditButtonClick(user)}
        className="h-8 w-10 flex items-center justify-center bg-[#2c2c2c] rounded-2xl text-sm text-white hover:bg-yellow-500"
      >
        <FaEdit className="h-4 w-4"/>
      </button>

      {/* Warning Button */}
      <button
        onClick={() => handleOpenWarningModal(user)}
        className="h-8 px-4 text-xs rounded-2xl bg-orange-500 text-white hover:bg-orange-600"
      >
        Warn
      </button>

      {/* Ban Button */}
      <button
        onClick={() => handleBanUser(user.id, user.disabled)} 
        className={`h-8 px-4 text-xs rounded-2xl ${user.disabled ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white`}
      >
        {user.disabled ? 'Unban' : 'Ban'}
      </button>
    </div>


    {selectedWarningUser && (
  <div className="fixed inset-0 bg-[#484848] bg-opacity-40 flex items-center justify-center z-40 pt-10 pb-10">
    <div className="bg-[#2c2c2c] p-4 md:p-6 rounded-lg w-11/12 md:w-8/12 max-h-[80vh] md:max-h-[74vh] overflow-y-auto relative">
      <h2 className="text-white font-bold mb-4 text-center md:text-left">
        Warnings for {selectedWarningUser.username}
      </h2>

      {/* List Existing Warnings */}
      {warnings.length > 0 ? (
        <div className="space-y-4 max-h-56 md:max-h-48 overflow-y-auto">
          {warnings
            .sort((a, b) => {
              if (a.category === 'profile' && b.category !== 'profile') return -1;
              if (a.category !== 'profile' && b.category === 'profile') return 1;
              return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
            })
            .map((warning) => (
              <div key={warning.id} className="relative p-4 bg-[#484848] rounded-lg">
                {/* Delete Button */}
                <button
                  onClick={() => handleDeleteWarning(warning.id)}
                  className="absolute top-2 right-2 bg-[#2c2c2c] hover:bg-yellow-500 text-white p-1 rounded-full"
                >
                  <FaTrash className="h-4 w-4" />
                </button>

                <p className="text-gray-300">
                  <span className="font-bold">Category:</span>{" "}
                  <span className="text-yellow-500 font-bold">{warning.category}</span>
                </p>
                <p className="text-gray-300">
                  <span className="font-bold">Message:</span> {warning.message}
                </p>
                <p className="text-gray-300">
                  <span className="font-bold">Status:</span> {warning.status}
                </p>
                <p className="text-gray-300">
                  <span className="font-bold">Created:</span>{" "}
                  {new Date(warning.timestamp).toLocaleString()}
                </p>

                {/* Warning URL (clickable) */}
                <p className="text-gray-300">
                  <span className="font-bold">URL:</span>{" "}
                  <a
                    href={`${window.location.origin}${warning.link}`}
                    onClick={(e) => {
                      window.location.href = `${window.location.origin}${warning.link}`;
                    }}
                    className="text-yellow-500 hover:text-yellow-600 break-all"
                  >
                    View {warning.category} link
                  </a>
                </p>
              </div>
            ))}
        </div>
      ) : (
        <p className="text-gray-400 text-center">No warnings for this user.</p>
      )}
 


                      {/* Create New Warning */}
<div className="mt-4">
  <select
    value={newWarning.category}
    onChange={(e) => setNewWarning({ ...newWarning, category: e.target.value })}
    className="w-full p-2 mb-2 bg-[#484848] text-white rounded-lg outline-none focus:ring-2 focus:ring-yellow-500"
  >
    <option value="" disabled>Select Category</option>
    <option value="profile">Profile</option>
    <option value="forum">Forum</option>
  </select>
  
  <textarea
    placeholder="Message"
    value={newWarning.message}
    onChange={(e) => setNewWarning({ ...newWarning, message: e.target.value })}
    className="w-full p-2 mb-2 bg-[#484848] text-white rounded-lg h-auto resize-none outline-none focus:ring-2 focus:ring-yellow-500"
    rows={6}
  />

  <input
    type="text"
    placeholder="ID (Profile or Forum Post)"
    value={newWarning.id}
    onChange={(e) => setNewWarning({ ...newWarning, id: e.target.value })}
    className="w-full p-2 mb-2 bg-[#484848] text-white rounded-lg outline-none focus:ring-2 focus:ring-yellow-500"
  />

  <div className="flex justify-between mt-4">
    <button
      onClick={handleCloseWarningModal}
      className="bg-gray-500 hover:bg-gray-600 px-4 py-2 text-white rounded-lg"
    >
      Close
    </button>
    <button
      onClick={handleCreateWarning}
      className="bg-orange-500 hover:bg-orange-600 px-4 py-2 text-white rounded-lg"
    >
      Add
    </button>
  </div>
</div>
                    </div>
                  </div>
                )}

                {/* Left Section: Profile Image and Username */}
<div className="flex flex-col items-center w-full md:w-1/4 relative">
  <Link href={`/profile-view/${user.id}`} className="relative">
    <img
      src={user.profilePhoto || '/placeholder.jpg'}
      alt="Profile"
      className="w-32 h-32 md:w-40 md:h-40 rounded-full mb-4 transition-opacity duration-300"
    />
    {/* Overlay for Yellow Tint */}
    <div className="absolute inset-0 w-32 h-32 md:w-40 md:h-40 rounded-full bg-yellow-500 opacity-0 hover:opacity-60 transition-opacity duration-300"></div>
  </Link>
  <h2 className="text-base md:text-lg text-white font-bold text-center">{user.username}</h2>
</div>

{/* Right Section: Bio and Contact Number */}
<div className="flex flex-col w-full md:w-2/3">
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
  <div className="fixed inset-0 bg-[#484848] bg-opacity-40 flex justify-center items-center z-50 p-4">
    <div className="bg-[#383838] p-6 mt-20 mb-10 h-auto max-h-[80vh] rounded-lg w-full sm:w-3/5 max-w-2xl overflow-auto">
      <h3 className="text-2xl text-white mb-4 text-center">Edit Profile</h3>
      <form onSubmit={handleSubmit}>
        {/* Image Preview */}
        <div className="flex flex-col items-center mb-4">
          <label className="block text-white">Profile Image</label>
          <div className="flex flex-wrap items-center justify-center space-x-2 sm:space-x-4">
            {/* Current Profile Image */}
            <img
              src={selectedUser.profilePhoto || '/placeholder.jpg'}
              alt="Current Profile"
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-full"
            />

            {/* New Image Preview */}
            {editImageFile && (
              <div className="relative">
                <img
                  src={URL.createObjectURL(editImageFile)}
                  alt="New Preview"
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-full"
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
            className="mt-4 p-2 text-white w-full bg-[#2c2c2c] outline-none focus:ring-2 focus:ring-yellow-500 rounded"
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
            className="w-full p-2 rounded-md focus:ring-2 focus:ring-yellow-500 outline-none text-white bg-[#2c2c2c]"
          />
        </div>

        {/* Bio */}
        <div className="mb-4">
          <label className="block text-white">Bio</label>
          <textarea
            name="bio"
            value={selectedUser?.bio || ""}
            onChange={handleInputChange}
            className="w-full p-2 min-h-32 rounded-md focus:ring-2 focus:ring-yellow-500 outline-none text-white bg-[#2c2c2c]"
          />
        </div>

        {/* Modal Buttons */}
        <div className="flex flex-col sm:flex-row justify-between mt-4 gap-2">
          <button
            type="button"
            onClick={handleModalClose}
            className="bg-gray-500 hover:bg-gray-600 px-4 py-2 rounded-md text-white w-full sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-yellow-500 hover:bg-yellow-600 px-4 py-2 rounded-md text-white w-full sm:w-auto"
          >
            {isSaving ? 'Saving...' : 'Update'}
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
