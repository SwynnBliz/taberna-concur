// app/profile-view/[id]/page.tsx (Profile View Page)
'use client';
import Layout from '../../../components/root/Layout'; 
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation'; 
import { collection, query, orderBy, onSnapshot, updateDoc, doc, increment, getDoc, deleteDoc, where, deleteField, getDocs } from 'firebase/firestore';
import { firestore } from '../../firebase/config'; 
import { getAuth, onAuthStateChanged } from 'firebase/auth'; 
import useBannedWords from '../../../components/forum/hooks/useBannedWords';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns'; 
import { FaThumbsUp, FaThumbsDown, FaTrash, FaEdit, FaBookmark, FaComment, FaEllipsisV, FaShare, FaTimes, FaRegEnvelope } from 'react-icons/fa'; 
import { HiDocumentMagnifyingGlass } from "react-icons/hi2";
import { AiOutlineClose } from 'react-icons/ai'; 
import { LinkIt } from 'react-linkify-it';

interface User {
  profilePhoto: string;
  username: string;
  bio: string;
  contactNumber: string;
  visibility: 'public' | 'private';
  role: 'admin' | 'user';
  isNCIIHolder: boolean;
}

interface Post {
  id: string;
  userId: string;
  message: string;
  imageUrl: string | null;
  createdAt: any;
  likes: number;
  dislikes: number;
  updatedAt?: any;
  comments: { 
    comment: string;
    createdAt: any;
    userId: string; 
    likes: number; 
    dislikes: number; 
    likedBy: string[]; 
    dislikedBy: string[]; 
    updatedAt?: any;
  }[]; 
  likedBy: string[];
  dislikedBy: string[];
  bookmarks: { 
    userId: string;  
    bookmarkCreatedAt: any;  
  }[]; 
}

interface Warning {
  id: string;
  category: string;
  message: string;
  status: string;
  timestamp: string;
  link: string;
}

const ProfileViewPage = () => {
  const { id } = useParams(); 
  const auth = getAuth();
  const [userData, setUserData] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null); 
  const router = useRouter();
  const { bannedWords, loading: bannedWordsLoading } = useBannedWords();
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [userPhotos, setUserPhotos] = useState<Map<string, string>>(new Map());
  const [posts, setPosts] = useState<Post[]>([]);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [isEditingPost, setIsEditingPost] = useState(false); 
  const [editContentPost, setEditContentPost] = useState(''); 
  const [editCurrentImageUrl, setEditCurrentImageUrl] = useState<string | null>(null); 
  const [isSaving, setIsSaving] = useState<boolean>(false); 
  const [editImageFile, setEditImageFile] = useState<File | null>(null); 
  const [userLikes, setUserLikes] = useState<Map<string, string>>(new Map()); 
  const [showMoreOptions, setShowMoreOptions] = useState<{ [postId: string]: boolean }>({});
  const [isExpanded, setIsExpanded] = useState<{ [postId: string]: boolean }>({});
  const [isTruncated, setIsTruncated] = useState<{ [postId: string]: boolean }>({});
  const contentRefs = useRef<{ [key: string]: HTMLParagraphElement | null }>({});
  const [notification, setNotification] = useState<string | null>(null);
  const [isProfilePublic, setIsProfilePublic] = useState(true); 
  const [deletePostPrompt, setDeletePostPrompt] = useState(false);
  const [postIdToDelete, setPostIdToDelete] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState(new Map());
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [showWarningsModal, setShowWarningsModal] = useState(false);
  
  const toggleMessage = (postId: string) => {
    setIsExpanded((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  
  const checkTruncation = (postId: string) => {
    const element = contentRefs.current[postId];
    if (element) {
      
      setIsTruncated((prev) => ({
        ...prev,
        [postId]: element.scrollHeight > element.clientHeight,
      }));
    }
  };

  
  useEffect(() => {
    posts.forEach((post) => checkTruncation(post.id));
  }, [posts]);

  const handleShare = (postId: string) => {
    
    const url = `${window.location.origin}/post-view/${postId}`;
    navigator.clipboard.writeText(url)
      .then(() => {
        setNotification('Link copied!');
        setTimeout(() => {
          setNotification(null); 
        }, 2000);
      })
      .catch((err) => {
        console.error('Failed to copy the URL', err);
        setNotification('Failed to copy the link!');
        setTimeout(() => {
          setNotification(null); 
        }, 2000);
      });
  };

  
  useEffect(() => {

    if (!id || Array.isArray(id)) return; 
  
    const postsQuery = query(
      collection(firestore, 'posts'),
      where("userId", "==", id), 
      orderBy("createdAt", "desc") 
    );

    
    const unsubscribe = onSnapshot(postsQuery, (querySnapshot) => {
      const postsData: Post[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Post[]; 
      setPosts(postsData); 
      
      const userId = auth.currentUser?.uid;
      if (userId) {
        const userLikesMap = new Map();
        postsData.forEach(post => {
          if (post.likedBy && post.likedBy.includes(userId)) {
            userLikesMap.set(post.id, 'like');
          } else if (post.dislikedBy && post.dislikedBy.includes(userId)) {
            userLikesMap.set(post.id, 'dislike');
          }
        });
        setUserLikes(userLikesMap); 
      }
    });

    return () => {
      
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!id || Array.isArray(id)) return; 
  
    const postsQuery = query(
      collection(firestore, 'posts'),
      where("userId", "==", id), 
      orderBy("createdAt", "desc") 
    );
    
    const unsubscribe = onSnapshot(postsQuery, (querySnapshot) => {
      const postsData: Post[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Post[];
  
      
      const filteredPostsData = postsData.map((post) => ({
        ...post,
        message: filterBannedWords(post.message) 
      }));
  
      setPosts(filteredPostsData); 
  
      
      filterPosts(filteredPostsData); 
    });
  
    return () => {
      
      unsubscribe();
    };
  }, [bannedWords]); 

  useEffect(() => {
    filteredPosts.forEach((post) => {
      fetchUserDetails(post.userId);
    });
  }, [filteredPosts]);

  useEffect(() => {
    const fetchWarnings = async () => {
      try {
        const warningsRef = collection(firestore, 'warnings');
        const q = query(warningsRef, where('userId', '==', currentUserId), orderBy('timestamp', 'asc'));
        const querySnapshot = await getDocs(q);
  
        const fetchedWarnings = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Warning[]; // Cast to Warning[] to match the state type
  
        setWarnings(fetchedWarnings);
      } catch (error) {
        console.error('Error fetching warnings:', error);
      }
    };
  
    if (currentUserId) {
      fetchWarnings();
    }
  }, [currentUserId, firestore]);
  
  const handleOpenWarningsModal = () => {
    setShowWarningsModal(true);
  };
  
  const handleCloseWarningsModal = () => {
    setShowWarningsModal(false);
  };

  const fetchUserDetails = async (userId: string): Promise<void> => {
    if (userDetails.has(userId)) return; // Avoid redundant fetches
  
    try {
      const userDoc = await getDoc(doc(firestore, "users", userId));
      if (userDoc.exists()) {
        setUserDetails((prev) => new Map(prev).set(userId, userDoc.data()));
      } else {
        console.error("No such user document!");
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };
  
  const filterBannedWords = (message: string): string => {
    if (!bannedWords || bannedWords.length === 0) return message; 
  
    let filteredMessage = message;
    
    bannedWords.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi'); 
      const replacement = '*'.repeat(word.length); 
      filteredMessage = filteredMessage.replace(regex, replacement); 
    });
    
    return filteredMessage;
  };

  
  const filterPosts = (postsData: Post[]) => {
      setFilteredPosts(postsData);
  };

  useEffect(() => {
    const auth = getAuth();

    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserId(user.uid); 
      } else {
        setCurrentUserId(null); 
      }
    });

    
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!id || Array.isArray(id)) return; 
  
    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(firestore, 'users', id)); 
        if (userDoc.exists()) {
          const data = userDoc.data() as User;
  
          
          setIsProfilePublic(data.visibility === 'public'); 
  
          
          let filteredBio = data.bio || "";
          let filteredContact = data.contactNumber || "";
  
          bannedWords.forEach((word) => {
            const regex = new RegExp(`\\b${word}\\b`, "gi"); 
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
      }
    };
  
    fetchUserData();
  }, [id, bannedWords]);

  if (bannedWordsLoading) {
    return (
      <Layout>
        <div>
          <p className="text-center text-white mt-10">Loading profile...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <p className="text-center text-white mt-10">User Not Found</p>
      </Layout>
    );
  }

  if (!userData) {
    return null; 
  }

  const handleEditProfile = () => {
    
    if (currentUserId === id) {
      router.push('/profile-manage'); 
    }
  };

  const fetchUserPhoto = async (userId: string) => {
    if (!userId) return null;
  
    const cachedPhoto = userPhotos.get(userId);
    if (cachedPhoto) return cachedPhoto;
  
    try {
      const userRef = doc(firestore, 'users', userId);
      const userDoc = await getDoc(userRef);
  
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const profilePhoto = userData?.profilePhoto || '/placeholder.jpg';
        
        
        setUserPhotos((prev) => new Map(prev).set(userId, profilePhoto));
        return profilePhoto;
      }
    } catch (error) {
      console.error(`Failed to fetch user photo for userId: ${userId}`, error);
    }
  
    return '/placeholder.jpg';
  };

  const formatTimestamp = (timestamp: any) => {
    
    return timestamp && timestamp.seconds
      ? formatDistanceToNow(new Date(timestamp.seconds * 1000), { addSuffix: true })
      : 'Invalid date';
  };

  
  const handleBookmarkPost = async (postId: string) => {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) return; 

    const postRef = doc(firestore, 'posts', postId); 
    const postDoc = await getDoc(postRef);

    if (postDoc.exists()) {
      const postData = postDoc.data();
      const bookmarks = postData.bookmarks || []; 

      
      const existingBookmarkIndex = bookmarks.findIndex((bookmark: { userId: string }) => bookmark.userId === currentUserId);

      if (existingBookmarkIndex !== -1) {
        
        bookmarks.splice(existingBookmarkIndex, 1); 
        
        setNotification("Removed Post Bookmark");
      } else {
        
        bookmarks.push({
          userId: currentUserId,
          bookmarkCreatedAt: new Date(), 
        });
        
        setNotification("Post bookmarked");
      }

      
      await updateDoc(postRef, {
        bookmarks: bookmarks,
      });

      
      setTimeout(() => {
        setNotification(null);
      }, 2000); 
    }
  };

  const handleUpdatePost = (postId: string) => {
    const postToEdit = posts.find((post) => post.id === postId);
    if (postToEdit) {
      setEditingPostId(postId); 
      setEditContentPost(postToEdit.message); 
      setEditCurrentImageUrl(postToEdit.imageUrl); 
      setIsEditingPost(true); 
    }
  };
  
  const handleSavePost = async () => {
    if (!editingPostId) return; 
  
    const userId = auth.currentUser?.uid;
    if (!userId) return; 
  
    setIsSaving(true); 
  
    try {
      let imageUrl = editCurrentImageUrl; 
  
      
      if (editImageFile) {
        const formData = new FormData();
        formData.append('file', editImageFile);
        formData.append('upload_preset', 'post-image-upload'); 
  
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
          {
            method: 'POST',
            body: formData,
          }
        );
  
        if (!res.ok) {
          throw new Error('Image upload failed');
        }
  
        const data = await res.json();
        imageUrl = data.secure_url; 
      }
  
      
      if (!editImageFile && !editCurrentImageUrl) {
        imageUrl = null;
      }
  
      
      const postRef = doc(firestore, 'posts', editingPostId);
      await updateDoc(postRef, {
        message: editContentPost, 
        ...(imageUrl === null ? { imageUrl: deleteField() } : { imageUrl }), 
        updatedAt: new Date(), 
      });
  
      
      setIsEditingPost(false);
      setEditContentPost('');
      setEditingPostId(null);
      setEditImageFile(null); 
      setEditCurrentImageUrl(null); 
    } catch (error) {
      console.error('Error updating post:', error);
    } finally {
      setIsSaving(false); 
    }
  };

  
  const handleDeletePost = async (postId: string) => {
    setPostIdToDelete(postId);
    setDeletePostPrompt(true); 
  };

  
  const deletePost = async (postId: string) => {
    try {
      const postRef = doc(firestore, 'posts', postId);
      await deleteDoc(postRef);
      console.log("Post deleted successfully.");
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };

  const handleLike = async (postId: string) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const postRef = doc(firestore, 'posts', postId);
    const postDoc = await getDoc(postRef);

    if (postDoc.exists()) {
      const postData = postDoc.data() as Post; 
      const likedBy = postData.likedBy || [];
      const dislikedBy = postData.dislikedBy || [];

      
      if (dislikedBy.includes(userId)) {
        const updatedDislikedBy = dislikedBy.filter((id: string) => id !== userId);
        const updatedLikedBy = [...likedBy, userId];
        await updateDoc(postRef, {
          dislikedBy: updatedDislikedBy,
          likedBy: updatedLikedBy,
          likes: increment(1),
          dislikes: increment(-1),
        });
      } else {
        const updatedLikedBy = likedBy.includes(userId)
          ? likedBy.filter((id: string) => id !== userId) 
          : [...likedBy, userId];

        await updateDoc(postRef, {
          likedBy: updatedLikedBy,
          likes: increment(likedBy.includes(userId) ? -1 : 1), 
        });
      }
    }
  };

  const handleDislike = async (postId: string) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const postRef = doc(firestore, 'posts', postId);
    const postDoc = await getDoc(postRef);

    if (postDoc.exists()) {
      const postData = postDoc.data() as Post; 
      const likedBy = postData.likedBy || [];
      const dislikedBy = postData.dislikedBy || [];

      
      if (likedBy.includes(userId)) {
        const updatedLikedBy = likedBy.filter((id: string) => id !== userId);
        const updatedDislikedBy = [...dislikedBy, userId];
        await updateDoc(postRef, {
          likedBy: updatedLikedBy,
          dislikedBy: updatedDislikedBy,
          likes: increment(-1),
          dislikes: increment(1),
        });
      } else {
        const updatedDislikedBy = dislikedBy.includes(userId)
          ? dislikedBy.filter((id: string) => id !== userId) 
          : [...dislikedBy, userId];

        await updateDoc(postRef, {
          dislikedBy: updatedDislikedBy,
          dislikes: increment(dislikedBy.includes(userId) ? -1 : 1), 
        });
      }
    }
  };

  const toggleProfileVisibility = async () => {
    try {
      
      setIsProfilePublic((prevState) => {
        const newState = !prevState; 
        updateProfileVisibilityInDatabase(newState); 
        return newState;
      });
    } catch (error) {
      console.error("Error toggling profile visibility: ", error);
    }
  };

  const updateProfileVisibilityInDatabase = async (newState: boolean) => {
    try {
      
      if (typeof id !== 'string') {
        console.error("Invalid user ID");
        return;
      }
  
      const userRef = doc(firestore, 'users', id); 
      await updateDoc(userRef, {
        visibility: newState ? 'public' : 'private', 
      });
    } catch (error) {
      console.error("Error updating profile visibility in Firestore: ", error);
    }
  };

  const formatNumberIntl = (num: number) => {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: 1,
    }).format(num);
  };

  const renderLink = (match: string, key: number) => (
    <a
      href={match}
      key={key}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-500 underline hover:text-yellow-500"
    >
      {match}
    </a>
  );

  const urlRegex = /(https?:\/\/[^\s]+)/g; 

  return (
    <Layout>
      <div className="max-w-7xl mx-40 mt-10 p-8 bg-[#383434] rounded-lg relative flex flex-col">
        <section>
          {/* Container for Edit Button, Visibility Toggle, and Warning List Button */}
          {currentUserId === id && (
            <div className="absolute top-3 right-4 flex space-x-2">
              {/* Visibility Toggle Button with Dropdown Indicator */}
              <label className="text-xs text-white text-opacity-60 mt-2">Set Privacy:</label>
              <div className="relative group">
                <button
                  onClick={toggleProfileVisibility}
                  className="p-2 bg-[#2c2c2c] rounded-full text-white hover:bg-yellow-500 text-xs flex items-center space-x-2"
                >
                  <span>{isProfilePublic ? 'Public' : 'Private'}</span>
                </button>

                {/* Tooltip for Visibility Toggle */}
                <div className="absolute bottom-full mt-2 -right-9 transform -translate-y-0 translate-x-0 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
                  {isProfilePublic ? 'Set Profile to Private' : 'Set Profile to Public'}
                </div>
              </div>

              {/* Warning List Button */}
              {warnings.length > 0 && (
                <button
                  onClick={handleOpenWarningsModal}
                  className="p-2 bg-[#2c2c2c] text-red-500 rounded-full hover:bg-yellow-500 hover:text-white text-xs"
                >
                  {warnings.length} {warnings.length === 1 ? 'Warning' : 'Warnings'}
                </button>
              )}

              {/* Edit Button */}
              <div className="relative group">
                <button
                  onClick={handleEditProfile}
                  className="p-2 bg-[#2c2c2c] rounded-full text-white hover:bg-yellow-500"
                >
                  <FaEdit />
                </button>

                {/* Tooltip for Edit Button */}
                <div className="absolute bottom-full mt-2 -right-6 transform -translate-y-0 translate-x-0 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
                  Edit Profile
                </div>
              </div>
            </div>
          )}

          {showWarningsModal && (
            <div className="fixed inset-0 bg-[#484242] bg-opacity-10 flex items-center justify-center z-40 pt-20 pb-10">
              <div className="bg-[#2c2c2c] p-6 rounded-lg w-8/12 max-h-[74vh] overflow-y-auto relative">
                {/* Close Button */}
                <button
                  onClick={handleCloseWarningsModal}
                  className="absolute top-2 right-2 bg-[#2c2c2c] hover:bg-yellow-500 text-white p-2 rounded-full"
                >
                  <FaTimes className="h-5 w-5" />
                </button>

                <h2 className="text-white font-bold mb-4">Warnings</h2>

                {/* List of Warnings */}
                {warnings.length > 0 ? (
                  <div className="space-y-4 p-2 max-h-72 overflow-y-auto">
                    {warnings.map((warning) => (
                      <div key={warning.id} className="relative p-4 bg-[#424242] rounded-lg">
                        {/* Appeal Button (Icon) */}
                        <div className="relative group">
                          <button
                            onClick={() =>
                              window.open(
                                `https://mail.google.com/mail/?view=cm&fs=1&to=tabernaconcur.support@gmail.com&su=Appeal Warning&body=Dear TabernaConcur Support,%0D%0AI would like to appeal the following warning:%0D%0AWarning ID: ${warning.id}%0D%0AWarning Message: ${warning.message}%0D%0AAppeal Explanation:%0D%0A[Explain]%0D%0A%0D%0AThank you.`,
                                "_blank"
                              )
                            }
                            className="p-2 bg-[#2c2c2c] rounded-full text-white hover:bg-yellow-500 absolute top-2 right-2"
                            title="Appeal Warning"
                          >
                            <FaRegEnvelope className="h-5 w-5" />
                          </button>

                          {/* Tooltip for Appeal Button */}
                          <div className="absolute bottom-full mt-2 right-0 transform translate-y-1 translate-x-6 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
                            Appeal Warning
                          </div>
                        </div>

                        {/* Warning Details */}
                        <p className="text-gray-300">
                          <span className="font-bold">Category:</span> {warning.category}
                        </p>
                        <p className="text-gray-300">
                          <span className="font-bold">Message:</span> {warning.message}
                        </p>
                        <p className="text-gray-300">
                          <span className="font-bold">Created:</span> {new Date(warning.timestamp).toLocaleString()}
                        </p>

                        {/* Warning URL (clickable) */}
                        {warning.link && (
                          <p className="text-gray-300">
                            <span className="font-bold">URL:</span>{" "}
                            <a
                              href={`${window.location.origin}${warning.link}`}
                              onClick={(e) => {
                                e.preventDefault();
                                window.location.href = `${window.location.origin}${warning.link}`;
                              }}
                              className="text-yellow-500 hover:text-yellow-600"
                            >
                              View {warning.category} link
                            </a>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">No warnings found.</p>
                )}
              </div>
            </div>
          )}
    
          <div className="mt-6 flex items-start space-x-8">
            {/* Left Section: Profile Image and Username */}
            <div className="flex flex-col items-center w-1/3">
              <img
                src={userData.profilePhoto || '/placeholder.jpg'}
                alt="Profile"
                className="w-48 h-48 rounded-full mb-4"
              />
              <h1 className="text-2xl text-white font-bold">{userData.username}</h1>
            </div>

            {/* Right Section: Role, Bio, and Contact Number */}
            <div className="flex flex-col w-2/3">

              {/* Role and NCII Labels */}
              <div className="flex space-x-4 mb-4">
                {/* Admin Label */}
                {userData.role === "admin" && (
                  <div className="bg-red-500 text-white text-sm font-semibold px-4 py-2 rounded-md">
                    Admin
                  </div>
                )}
                {/* NCII Label */}
                {userData.isNCIIHolder && (
                  <div className="bg-yellow-500 text-white text-sm font-semibold px-4 py-2 rounded-md">
                    NCII
                  </div>
                )}
              </div>

              {/* Bio */}
              <div className="bg-[#424242] p-4 rounded-lg mb-4 max-h-60 overflow-auto">
                <p className="text-gray-300 whitespace-pre-wrap">
                  <span className="font-bold text-white">Bio: </span><br />
                  {currentUserId === id || isProfilePublic ? (
                    userData.bio || 'No bio available'
                  ) : (
                    'Profile set to private'
                  )}
                </p>
              </div>

              {/* Contact Number */}
              <div className="bg-[#424242] p-4 rounded-lg">
                <p className="text-gray-300">
                  <span className="font-bold text-white">Contact: </span><br />
                  {currentUserId === id || isProfilePublic ? (
                    userData.contactNumber || 'Not provided'
                  ) : (
                    'Profile set to private'
                  )}
                </p>
              </div>
            </div>
          </div>
        </section>
    
        <section>
          {/* Posts Section */}
          <div className="flex flex-col">
            <div className="mt-4 mb-4 w-full mx-auto flex flex-col justify-center items-center border-b-2 border-white pb-2">
              <div>
                <p className="text-white text-xl">Posts</p>
              </div>
            </div>
    
            {/* Contains the Posts and Comments Sections */}
            <div>
              <div className="p-3 w-full bg-[#383434] mx-auto">
                {!isProfilePublic && currentUserId !== id ? (
                  
                  <p className="text-center text-yellow-500 w-full">This post is set to private.</p>
                ) : filteredPosts.length === 0 ? (
                  
                  <p className="text-center text-white w-full">There are no posts matching your search query.</p>
                ) : (
                  filteredPosts.map((post) => (
                    <div key={post.id} className="pt-6 rounded-lg mb-10 w-11/12 mx-auto mt-2 bg-[#424242] p-6">
                      
                      <div className="flex items-center justify-between mb-4">
                        {/* Left Section: Image, Username, and Timestamp */}
                        <div className="flex items-center">
                          <div className="relative group inline-flex items-center">
                            <Link href={`/profile-view/${post.userId}`}>
                              <img
                                src={userPhotos.get(post.userId) || '/placeholder.jpg'}
                                alt="Profile"
                                className="w-12 h-12 rounded-full mr-4 cursor-pointer"
                                onLoad={() => fetchUserPhoto(post.userId)}
                              />
                            </Link>

                            {/* Tooltip for View User's Profile */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
                              View User's Profile
                            </div>
                          </div>

                          <div>
                            <p className="text-xl font-semibold text-white flex items-center space-x-2">
                              <span>{userData.username || "Loading..."}</span>
                              {/* Display Role and NCII */}
                              {userDetails.get(post.userId)?.role === "admin" && (
                                <span className="text-red-500 font-bold text-sm">
                                  Admin
                                </span>
                              )}
                              {userDetails.get(post.userId)?.isNCIIHolder && (
                                <span className="text-yellow-500 font-bold text-sm">
                                  NCII
                                </span>
                              )}
                            </p>

                            <p className="text-sm text-gray-400">
                              {post.updatedAt ? (
                                <>
                                  {formatTimestamp(post.updatedAt)}{" "}
                                  <span className="text-gray-400">(edited)</span>
                                </>
                              ) : (
                                formatTimestamp(post.createdAt)
                              )}
                            </p>
                          </div>
                        </div>
        
                        {/* Right Section: View Post, Bookmark, and More Options */}
                        <div className="flex space-x-2">
                          {/* Container for all buttons */}
                          <div className="bg-[#2c2c2c] rounded-full px-4 py-2 flex items-center space-x-4">
                            {/* View Post Button */}
                            <div className="relative group inline-flex items-center">
                              <Link href={`/post-view/${post.id}`}>
                                <button className="text-white hover:text-yellow-500 mt-2">
                                  <HiDocumentMagnifyingGlass className="w-4 h-4" />
                                </button>
                              </Link>
                              {/* Tooltip for View Post */}
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
                                View Post
                              </div>
                            </div>

                            {/* Bookmark Button */}
                            <div className="relative group inline-flex items-center">
                              <button
                                onClick={() => handleBookmarkPost(post.id)}
                                className={`${
                                  post.bookmarks?.some(
                                    (bookmark: { userId: string }) => bookmark.userId === auth.currentUser?.uid
                                  )
                                    ? "text-yellow-500"
                                    : "text-white"
                                } hover:text-yellow-500`}
                              >
                                <FaBookmark className="w-4 h-4" />
                              </button>
                              {/* Tooltip for Bookmark */}
                              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
                                Bookmark Post
                              </div>
                            </div>

                            {/* More Options Dropdown */}
                            {auth.currentUser?.uid === post.userId && (
                              <div className="relative group inline-flex items-center">
                                <button
                                  onClick={() => setShowMoreOptions((prev) => ({ ...prev, [post.id]: !prev[post.id] }))}
                                  className="text-white hover:text-yellow-500"
                                >
                                  <FaEllipsisV className="w-4 h-4" />
                                </button>

                                {/* Tooltip for More Options */}
                                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
                                  More Options
                                </div>

                                {showMoreOptions[post.id] && (
                                  <div className="absolute top-full -right-3 mt-6 bg-[#2c2c2c] text-white rounded-md shadow-lg z-40">
                                    {/* Triangle Pointer */}
                                    <div className="absolute -top-2 right-3 w-4 h-4 rotate-45 transition-colors bg-[#2c2c2c]"></div>

                                    {/* Edit Button */}
                                    <button
                                      onClick={() => { 
                                        handleUpdatePost(post.id); 
                                        setShowMoreOptions(prev => ({ ...prev, [post.id]: false })); 
                                      }}
                                      className="flex items-center px-4 py-2 w-full hover:bg-[#383838] hover:rounded-md group"
                                    >
                                      <FaEdit className="w-4 h-4 mr-2" />
                                      <span className="whitespace-nowrap">Edit Post</span>
                                    </button>

                                    {/* Delete Button */}
                                    <button
                                      onClick={() => { 
                                        handleDeletePost(post.id);
                                        setShowMoreOptions(prev => ({ ...prev, [post.id]: false })); 
                                      }}
                                      className="flex items-center px-4 py-2 w-full hover:bg-[#383838] hover:rounded-md group text-red-500"
                                    >
                                      <FaTrash className="w-4 h-4 mr-2" />
                                      <span className="whitespace-nowrap">Delete Post</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Delete Confirmation Modal */}
                      {deletePostPrompt && (
                        <div className="fixed inset-0 bg-[#484242] bg-opacity-60 flex items-center justify-center z-50">
                          <div className="bg-[#2c2c2c] p-6 rounded-lg text-white text-center">
                            <p>Are you sure you want to delete this post? This cannot be undone!</p>
                            <div className="mt-4 flex justify-center gap-4">
                              <button
                                onClick={async () => {
                                  if (!postIdToDelete) return;
                                  await deletePost(postIdToDelete);
                                  setDeletePostPrompt(false); 
                                }}
                                className="bg-yellow-500 text-black px-4 py-2 rounded hover:bg-yellow-600"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeletePostPrompt(false)}
                                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="mb-2">
                        <p
                          ref={(el) => { contentRefs.current[post.id] = el; }}  
                          className={`text-lg text-white ${isExpanded[post.id] ? 'line-clamp-none' : 'line-clamp-2'}`}
                          style={{
                            whiteSpace: 'pre-wrap',
                            display: '-webkit-box',
                            WebkitBoxOrient: 'vertical',
                            WebkitLineClamp: isExpanded[post.id] ? 'none' : 2,
                          }}
                        >
                          <LinkIt component={renderLink} regex={urlRegex}>
                            {post.message} {/* Render the message with linkified URLs */}
                          </LinkIt>
                        </p>

                        {/* Show "See more" if the message is truncated and not expanded */}
                        {isTruncated[post.id] && !isExpanded[post.id] && (
                          <button
                            onClick={() => toggleMessage(post.id)}
                            className="text-white cursor-pointer underline hover:text-yellow-500"
                          >
                            See more
                          </button>
                        )}

                        {/* Show "See less" when the message is expanded */}
                        {isExpanded[post.id] && (
                          <button
                            onClick={() => toggleMessage(post.id)}
                            className="text-white cursor-pointer underline hover:text-yellow-500"
                          >
                            See less
                          </button>
                        )}
                      </div>

                      {isEditingPost && (
                        <div className="fixed inset-0 bg-[#484242] bg-opacity-20 flex items-center justify-center z-50">
                          <div className="bg-[#383434] p-6 rounded-lg w-2/4 max-h-[90vh] overflow-y-auto">
                            {/* Textarea for Editing Content */}
                            <textarea
                              value={editContentPost}
                              onChange={(e) => setEditContentPost(e.target.value)}
                              className="w-full p-3 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none text-white bg-[#252323] resize-none"
                              rows={5}
                              placeholder="Edit your post..."
                            />

                            {editCurrentImageUrl && (
                              <div className="mt-4 relative">
                                <p className="text-white">Current Image:</p>
                                <div className="relative">
                                  <img
                                    src={editCurrentImageUrl}
                                    alt="Current Post Image"
                                    className="w-full object-cover rounded-lg mt-2"
                                  />
                                  {/* Close button to remove the image */}
                                  <button
                                    onClick={() => setEditCurrentImageUrl(null)} 
                                    className="absolute top-2 right-2 bg-[#2c2c2c] text-white rounded-full p-1 hover:bg-yellow-500"
                                  >
                                    <AiOutlineClose size={16} />
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Selected Image Preview */}
                            {editImageFile && (
                              <div className="mt-4 relative">
                                <p className="text-white">New Image Preview:</p>
                                <div className="relative">
                                  <img
                                    src={URL.createObjectURL(editImageFile)} 
                                    alt="Selected Image Preview"
                                    className="w-full object-cover rounded-lg mt-2"
                                  />
                                  {/* Close button overlaid on the image */}
                                  <button
                                    onClick={() => setEditImageFile(null)} 
                                    className="absolute top-2 right-2 bg-[#2c2c2c] text-white rounded-full p-1 hover:bg-yellow-500"
                                  >
                                    <AiOutlineClose size={16} />
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Current Image Display */}
                            {editCurrentImageUrl && (
                              <div className="mt-4">
                                <p className="text-white">Select an Image to Change (Optional):</p>
                              </div>
                            )}

                            {/* File Input for Selecting New Image */}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  setEditImageFile(e.target.files[0]); 
                                }
                              }}
                              className="mt-4 text-white"
                            />

                            {/* Buttons */}
                            <div className="mt-4 flex justify-end space-x-2">
                              <button
                                onClick={() => {
                                  setIsEditingPost(false);
                                  setEditImageFile(null); 
                                }}
                                className="bg-[#2c2c2c] text-white px-4 py-2 rounded-lg"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleSavePost}
                                className="bg-yellow-500 text-white px-4 py-2 rounded-lg"
                                disabled={isSaving} 
                              >
                                {isSaving ? "Saving..." : "Save"} {/* Change text based on isSaving */}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {post.imageUrl && (
                        <img
                          src={post.imageUrl}
                          alt="Post image"
                          className="w-full h-full object-cover rounded-lg mb-4"
                        />
                      )}
                      <div className="flex gap-2 mb-4 items-center">
                        {/* Like Button with Tooltip */}
                        <div className="relative group inline-flex items-center">
                          <button
                            onClick={() => handleLike(post.id)}
                            className={`flex items-center justify-between bg-[#2c2c2c] p-2 rounded-full space-x-2 ${userLikes.get(post.id) === 'like' ? 'text-yellow-500' : 'text-gray-400'}`}
                          >
                            <FaThumbsUp className="w-4 h-4" />
                            <span>{formatNumberIntl(post.likes)}</span> {/* Format the likes */}
                          </button>
                          {/* Tooltip for Like Button */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
                            Like Post
                          </div>
                        </div>

                        {/* Dislike Button with Tooltip */}
                        <div className="relative group inline-flex items-center">
                          <button
                            onClick={() => handleDislike(post.id)}
                            className={`flex items-center justify-between bg-[#2c2c2c] p-2 rounded-full space-x-2 ${userLikes.get(post.id) === 'dislike' ? 'text-yellow-500' : 'text-gray-400'}`}
                          >
                            <FaThumbsDown className="w-4 h-4" />
                            <span>{formatNumberIntl(post.dislikes)}</span> {/* Format the dislikes */}
                          </button>
                          {/* Tooltip for Dislike Button */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
                            Dislike Post
                          </div>
                        </div>

                        {/* Comment Button with Tooltip (View Post to Comment and Navigate to Post) */}
                        <button
                          onClick={() => {
                            router.push(`/post-view/${post.id}`); 
                          }}
                          className="relative group flex items-center justify-between bg-[#2c2c2c] p-2 rounded-full space-x-2 ml-auto text-gray-400"
                        >
                          <FaComment className="w-4 h-4" />
                          <span>{formatNumberIntl(post.comments.length)}</span> {/* Format the comments */}

                          {/* Tooltip for "View Post to Comment" */}
                          <div
                            className="absolute bottom-full left-1/2 transform -translate-x-1/2 p-1 bg-[#2c2c2c] text-white text-xs rounded-md whitespace-nowrap hidden group-hover:block"
                          >
                            View Post to Comment
                          </div>
                        </button>

                        {/* Share Button */}
                        <div className="relative group inline-flex items-center">
                          <button
                            onClick={() => handleShare(post.id)}
                            className="flex items-center justify-between bg-[#2c2c2c] p-2 rounded-full space-x-2 text-gray-400 hover:text-yellow-500"
                          >
                            <FaShare className="w-4 h-4" />
                            <span>Share</span>
                          </button>
                          {/* Tooltip for Share Button */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
                            Share Post
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
        {/* Notification */}
        {notification && (
          <div
            className="fixed bottom-4 left-4 bg-[#2c2c2c] text-white text-lg p-4 rounded-md shadow-lg max-w-xs"
            style={{ transition: 'opacity 0.3s ease-in-out' }}
          >
            {notification}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ProfileViewPage;
