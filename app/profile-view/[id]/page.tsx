// app/profile-view/[id]/page.tsx (Profile View Page)
'use client';
import Layout from '../../../components/root/Layout'; // Layout component
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation'; // For dynamic route params
import { collection, query, orderBy, onSnapshot, updateDoc, doc, increment, getDoc, deleteDoc, where, deleteField } from 'firebase/firestore';
import { firestore } from '../../firebase/config'; // Import Firestore instance
import { getAuth, onAuthStateChanged } from 'firebase/auth'; // For getting the current logged-in user's UID
import useBannedWords from '../../../components/forum/hooks/useBannedWords';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns'; // Import the function from date-fns
import { FaThumbsUp, FaThumbsDown, FaTrash, FaEdit, FaBookmark, FaComment, FaEllipsisV, FaShare } from 'react-icons/fa'; // Importing React Icons
import { HiDocumentMagnifyingGlass } from "react-icons/hi2";
import { AiOutlineClose } from 'react-icons/ai'; // Import the close icon
import { LinkIt } from 'react-linkify-it';

interface User {
  profilePhoto: string;
  username: string;
  bio: string;
  contactNumber: string;
  visibility: 'public' | 'private';
  role: 'admin' | 'user';
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
    userId: string; // Add userId to the comment object
    likes: number; // Add likes field for comments
    dislikes: number; // Add dislikes field for comments
    likedBy: string[]; // Track users who liked the comment
    dislikedBy: string[]; // Track users who disliked the comment
    updatedAt?: any;
  }[]; 
  likedBy: string[];
  dislikedBy: string[];
  bookmarks: { 
    userId: string;  // User who bookmarked the post
    bookmarkCreatedAt: any;  // Timestamp when the post was bookmarked
  }[]; // Array of bookmarks
}

const ProfileViewPage = () => {
  const { id } = useParams(); // Get the `id` from the dynamic route
  const auth = getAuth();
  const [userData, setUserData] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null); // To store current logged-in user's UID
  const router = useRouter();
  const { bannedWords, loading: bannedWordsLoading } = useBannedWords();
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [userPhotos, setUserPhotos] = useState<Map<string, string>>(new Map());
  const [posts, setPosts] = useState<Post[]>([]);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [isEditingPost, setIsEditingPost] = useState(false); // State to toggle editing mode
  const [editContentPost, setEditContentPost] = useState(''); // Store the new post content
  const [editCurrentImageUrl, setEditCurrentImageUrl] = useState<string | null>(null); // Store the current image URL
  const [isSaving, setIsSaving] = useState<boolean>(false); // Loading state for saving post
  const [editImageFile, setEditImageFile] = useState<File | null>(null); // Store selected image file
  const [userLikes, setUserLikes] = useState<Map<string, string>>(new Map()); // Track user's like/dislike status
  const [showMoreOptions, setShowMoreOptions] = useState<{ [postId: string]: boolean }>({});
  const [isExpanded, setIsExpanded] = useState<{ [postId: string]: boolean }>({});
  const [isTruncated, setIsTruncated] = useState<{ [postId: string]: boolean }>({});
  const contentRefs = useRef<{ [key: string]: HTMLParagraphElement | null }>({});
  const [notification, setNotification] = useState<string | null>(null);
  const [isProfilePublic, setIsProfilePublic] = useState(true); // Default to public until we fetch the correct data

  // Function to toggle the message display
  const toggleMessage = (postId: string) => {
    setIsExpanded((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  // Check if the content is truncated
  const checkTruncation = (postId: string) => {
    const element = contentRefs.current[postId];
    if (element) {
      // Compare scrollHeight and clientHeight to detect truncation
      setIsTruncated((prev) => ({
        ...prev,
        [postId]: element.scrollHeight > element.clientHeight,
      }));
    }
  };

  // Run the truncation check after the component is rendered and the content is available
  useEffect(() => {
    posts.forEach((post) => checkTruncation(post.id));
  }, [posts]);

  const handleShare = (postId: string) => {
    // Copy the URL of the post to the clipboard
    const url = `${window.location.origin}/post-view/${postId}`;
    navigator.clipboard.writeText(url)
      .then(() => {
        setNotification('Link copied!');
        setTimeout(() => {
          setNotification(null); // Hide notification after 3 seconds
        }, 2000);
      })
      .catch((err) => {
        console.error('Failed to copy the URL', err);
        setNotification('Failed to copy the link!');
        setTimeout(() => {
          setNotification(null); // Hide notification after 3 seconds
        }, 2000);
      });
  };

  // Handles the like and dislike tracking
  useEffect(() => {

    if (!id || Array.isArray(id)) return; // Ensure `id` is valid before proceeding
  
    const postsQuery = query(
      collection(firestore, 'posts'),
      where("userId", "==", id), // Filter posts by the userId of the user whose profile is being viewed
      orderBy("createdAt", "desc") // Order posts by creation date (descending)
    );

    // Real-time listener
    const unsubscribe = onSnapshot(postsQuery, (querySnapshot) => {
      const postsData: Post[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Post[]; // Cast to Post[] for correct typing
      setPosts(postsData); // Update posts when there's a change
      // Track likes/dislikes of current user
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
        setUserLikes(userLikesMap); // Store in state
      }
    });

    return () => {
      // Clean up the listener when the component unmounts
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!id || Array.isArray(id)) return; // Ensure `id` is valid before proceeding
  
    const postsQuery = query(
      collection(firestore, 'posts'),
      where("userId", "==", id), // Filter posts by the userId of the user whose profile is being viewed
      orderBy("createdAt", "desc") // Order posts by creation date (descending)
    );
  
    // Real-time listener to fetch posts from Firestore
    const unsubscribe = onSnapshot(postsQuery, (querySnapshot) => {
      const postsData: Post[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Post[];
  
      // Apply the banned word filtering to each post
      const filteredPostsData = postsData.map((post) => ({
        ...post,
        message: filterBannedWords(post.message) // Filter banned words in message
      }));
  
      setPosts(filteredPostsData); // Set all posts after filtering
  
      // Apply filtering logic based on search query
      filterPosts(filteredPostsData); // Filter posts whenever data changes
    });
  
    return () => {
      // Clean up the listener when the component unmounts
      unsubscribe();
    };
  }, [bannedWords]); // Runs when bannedWords changes

  
  const filterBannedWords = (message: string): string => {
    if (!bannedWords || bannedWords.length === 0) return message; // No banned words to filter
  
    let filteredMessage = message;
    
    bannedWords.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi'); // Case-insensitive word match
      const replacement = '*'.repeat(word.length); // Generate a string of asterisks matching the length of the word
      filteredMessage = filteredMessage.replace(regex, replacement); // Replace with asterisks
    });
    
    return filteredMessage;
  };

  // Function to filter posts
  const filterPosts = (postsData: Post[]) => {
      setFilteredPosts(postsData);
  };

  useEffect(() => {
    const auth = getAuth();

    // Set up the listener to track authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserId(user.uid); // Store the current user's ID
      } else {
        setCurrentUserId(null); // No user logged in
      }
    });

    // Clean up the listener when the component unmounts
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!id || Array.isArray(id)) return; // Ensure `id` is a single string before proceeding
  
    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(firestore, 'users', id)); // Fetch the data for the user whose profile is being viewed
        if (userDoc.exists()) {
          const data = userDoc.data() as User;
  
          // Set the profile's visibility status here
          setIsProfilePublic(data.visibility === 'public'); // Set the profile visibility for the viewed profile
  
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

  const fetchUserPhoto = async (userId: string) => {
    if (!userId) return null;
  
    const cachedPhoto = userPhotos.get(userId);
    if (cachedPhoto) return cachedPhoto;
  
    try {
      const userRef = doc(firestore, 'users', userId);
      const userDoc = await getDoc(userRef);
  
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const profilePhoto = userData?.profilePhoto || 'https://via.placeholder.com/150';
        
        // Cache the photo for future use
        setUserPhotos((prev) => new Map(prev).set(userId, profilePhoto));
        return profilePhoto;
      }
    } catch (error) {
      console.error(`Failed to fetch user photo for userId: ${userId}`, error);
    }
  
    return 'https://via.placeholder.com/150'; // Default placeholder image
  };

  const formatTimestamp = (timestamp: any) => {
    // Handle if timestamp is valid or missing
    return timestamp && timestamp.seconds
      ? formatDistanceToNow(new Date(timestamp.seconds * 1000), { addSuffix: true })
      : 'Invalid date';
  };

  // Handle Bookmark Button Click
  const handleBookmarkPost = async (postId: string) => {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) return; // Make sure user is authenticated

    const postRef = doc(firestore, 'posts', postId); // Reference to the post document
    const postDoc = await getDoc(postRef);

    if (postDoc.exists()) {
      const postData = postDoc.data();
      const bookmarks = postData.bookmarks || []; // Default to an empty array if undefined

      // Check if the current user has already bookmarked the post
      const existingBookmarkIndex = bookmarks.findIndex((bookmark: { userId: string }) => bookmark.userId === currentUserId);

      if (existingBookmarkIndex !== -1) {
        // Remove bookmark (user is unbookmarking the post)
        bookmarks.splice(existingBookmarkIndex, 1); // Remove the bookmark for that user
        // Set notification message for removed bookmark
        setNotification("Removed Post Bookmark");
      } else {
        // Add bookmark (user is bookmarking the post)
        bookmarks.push({
          userId: currentUserId,
          bookmarkCreatedAt: new Date(), // Using Firestore Timestamp is preferable
        });
        // Set notification message for added bookmark
        setNotification("Post bookmarked");
      }

      // Update the post document with the modified bookmarks array
      await updateDoc(postRef, {
        bookmarks: bookmarks,
      });

      // Remove notification after 3 seconds
      setTimeout(() => {
        setNotification(null);
      }, 2000); // Adjust the time (in ms) as needed
    }
  };

  const handleUpdatePost = (postId: string) => {
    const postToEdit = posts.find((post) => post.id === postId);
    if (postToEdit) {
      setEditingPostId(postId); // Track the post being edited
      setEditContentPost(postToEdit.message); // Pre-fill the content
      setEditCurrentImageUrl(postToEdit.imageUrl); // Pre-fill the current image URL
      setIsEditingPost(true); // Enable editing mode
    }
  };
  
  const handleSavePost = async () => {
    if (!editingPostId) return; // Ensure we have a post to edit
  
    const userId = auth.currentUser?.uid;
    if (!userId) return; // Ensure the user is authenticated
  
    setIsSaving(true); // Set loading state when saving
  
    try {
      let imageUrl = null;
  
      // If a new image file is selected, upload it to Cloudinary
      if (editImageFile) {
        const formData = new FormData();
        formData.append('file', editImageFile);
        formData.append('upload_preset', 'post-image-upload'); // Your Cloudinary upload preset
  
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
        imageUrl = data.secure_url; // Get the URL of the uploaded image
      }
  
      // Reference the post to update in Firestore
      const postRef = doc(firestore, 'posts', editingPostId);
      await updateDoc(postRef, {
        message: editContentPost, // Update the content of the post
        ...(imageUrl === null ? { imageUrl: deleteField() } : { imageUrl }), // Delete imageUrl if it's null
        updatedAt: new Date(), // Set the updated timestamp
      });
  
      // Reset editing states
      setIsEditingPost(false);
      setEditContentPost('');
      setEditingPostId(null);
      setEditImageFile(null); // Reset the selected file
    } catch (error) {
      console.error('Error updating post:', error);
    } finally {
      setIsSaving(false); // Reset loading state after operation
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      // Prompt the user to confirm post deletion
      const confirmDelete = window.confirm("Are you sure you want to delete this post? This cannot be undone!");
      if (!confirmDelete) return; // If user cancels, exit the function
  
      console.log("Attempting to delete post with ID:", postId);
      const userId = auth.currentUser?.uid;
  
      if (!userId) {
        console.error("You must be logged in to delete posts.");
        return;
      }
  
      const postRef = doc(firestore, 'posts', postId);
      const postDoc = await getDoc(postRef);
  
      if (postDoc.exists()) {
        const postData = postDoc.data() as Post;
  
        if (postData.userId !== userId) {
          console.error("You can only delete your own posts.");
          return;
        }
  
        // Uncomment for soft delete:
        // await updateDoc(postRef, { deleted: true });
  
        // For hard delete:
        await deleteDoc(postRef);
        console.log("Post deleted successfully.");
      } else {
        console.error("Post does not exist.");
      }
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
      const postData = postDoc.data() as Post; // Cast to Post type
      const likedBy = postData.likedBy || [];
      const dislikedBy = postData.dislikedBy || [];

      // If the user disliked, switch to like
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
          ? likedBy.filter((id: string) => id !== userId) // Unlike if already liked
          : [...likedBy, userId];

        await updateDoc(postRef, {
          likedBy: updatedLikedBy,
          likes: increment(likedBy.includes(userId) ? -1 : 1), // Increment or decrement the likes count
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
      const postData = postDoc.data() as Post; // Cast to Post type
      const likedBy = postData.likedBy || [];
      const dislikedBy = postData.dislikedBy || [];

      // If the user liked, switch to dislike
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
          ? dislikedBy.filter((id: string) => id !== userId) // Undislike if already disliked
          : [...dislikedBy, userId];

        await updateDoc(postRef, {
          dislikedBy: updatedDislikedBy,
          dislikes: increment(dislikedBy.includes(userId) ? -1 : 1), // Increment or decrement the dislikes count
        });
      }
    }
  };

  const toggleProfileVisibility = async () => {
    try {
      // Toggle the visibility in local state
      setIsProfilePublic((prevState) => {
        const newState = !prevState; // This will toggle between true and false
        updateProfileVisibilityInDatabase(newState); // Update Firestore
        return newState;
      });
    } catch (error) {
      console.error("Error toggling profile visibility: ", error);
    }
  };

  const updateProfileVisibilityInDatabase = async (newState: boolean) => {
    try {
      // Ensure `id` is a valid string before proceeding
      if (typeof id !== 'string') {
        console.error("Invalid user ID");
        return;
      }
  
      const userRef = doc(firestore, 'users', id); // Create reference to the user document
      await updateDoc(userRef, {
        visibility: newState ? 'public' : 'private', // Update visibility
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

  const urlRegex = /(https?:\/\/[^\s]+)/g; // Regular expression to match URLs

  return (
    <Layout>
      <div className="max-w-7xl mx-40 mt-10 p-8 bg-[#383434] rounded-lg relative flex flex-col">
        <section>
          {/* Container for Edit Button and Visibility Toggle */}
          {currentUserId === id && (
            <div className="absolute top-3 right-4 flex space-x-2">
              <label className="text-xs text-white text-opacity-60 mt-2">Set Privacy:</label>
              {/* Visibility Toggle Button with Dropdown Indicator */}
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
    
          <div className="mt-6 flex items-start space-x-8">
            {/* Left Section: Profile Image and Username */}
            <div className="flex flex-col items-center w-1/3">
              <img
                src={userData.profilePhoto || 'https://via.placeholder.com/150'}
                alt="Profile"
                className="w-52 h-52 rounded-full mb-4"
              />
              <h1 className="text-2xl text-white font-bold">{userData.username}</h1>
            </div>
    
            {/* Right Section: Bio and Contact Number */}
            <div className="flex flex-col w-2/3">
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
                  // If the profile is private and the current user is not the owner, show a private post message
                  <p className="text-center text-yellow-500 w-full">This post is set to private.</p>
                ) : filteredPosts.length === 0 ? (
                  // If no posts match the search query, show this message
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
                                src={userPhotos.get(post.userId) || 'https://via.placeholder.com/150'}
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
                            <p className="text-xl font-semibold text-white">
                              {userData.username || "Loading..."}
                            </p>

                            {/* Check if updatedAt exists */}
                            <p className="text-sm text-gray-400">
                              {post.updatedAt ? (
                                <>
                                  {formatTimestamp(post.updatedAt)} <span className="text-gray-400">(edited)</span>
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
                                  <div className="absolute top-full -right-3 mt-6 bg-[#2c2c2c] text-white rounded-md shadow-lg z-50">
                                    {/* Triangle Pointer */}
                                    <div className="absolute -top-2 right-3 w-4 h-4 rotate-45 transition-colors bg-[#2c2c2c]"></div>

                                    {/* Edit Button */}
                                    <button
                                      onClick={() => handleUpdatePost(post.id)}
                                      className="flex items-center px-4 py-2 w-full hover:bg-[#383838] hover:rounded-md group"
                                    >
                                      <FaEdit className="w-4 h-4 mr-2" />
                                      <span className="whitespace-nowrap">Edit Post</span>
                                    </button>

                                    {/* Delete Button */}
                                    <button
                                      onClick={() => handleDeletePost(post.id)}
                                      className="flex items-center px-4 py-2 w-full hover:bg-[#383838] hover:rounded-md group"
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
                      
                      <div className="mb-2">
                        <p
                          ref={(el) => { contentRefs.current[post.id] = el; }}  // Assign ref to each paragraph element
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
                                    onClick={() => {
                                      console.log("Removing image");
                                      setEditCurrentImageUrl(null); // Remove the current image
                                    }} 
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
                                    src={URL.createObjectURL(editImageFile)} // Preview selected image
                                    alt="Selected Image Preview"
                                    className="w-full object-cover rounded-lg mt-2"
                                  />
                                  {/* Close button overlaid on the image */}
                                  <button
                                    onClick={() => setEditImageFile(null)} // Remove selected image
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
                                  setEditImageFile(e.target.files[0]); // Capture the selected image
                                }
                              }}
                              className="mt-4 text-white"
                            />

                            {/* Buttons */}
                            <div className="mt-4 flex justify-end space-x-2">
                              <button
                                onClick={() => {
                                  setIsEditingPost(false);
                                  setEditImageFile(null); // Clear selected image when canceling
                                }}
                                className="bg-[#2c2c2c] text-white px-4 py-2 rounded-lg"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleSavePost}
                                className="bg-yellow-500 text-white px-4 py-2 rounded-lg"
                                disabled={isSaving} // Disable button while saving
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
                            router.push(`/post-view/${post.id}`); // Navigate to the post
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
