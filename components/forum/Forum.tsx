// components/forum/Forum.tsx
'use client';
import { useState, useEffect } from 'react';
import { getFirestore, collection, query, orderBy, onSnapshot, updateDoc, doc, increment, getDoc, deleteDoc, where } from 'firebase/firestore';
import { app } from '../../app/firebase/config'; // Firebase config import
import PostForum from './PostForum';
import { formatDistanceToNow } from 'date-fns'; // Import the function from date-fns
import { getAuth } from 'firebase/auth';
import { FaThumbsUp, FaThumbsDown, FaTrash, FaEdit, FaBookmark, FaSearch, FaPlus } from 'react-icons/fa'; // Importing React Icons
import Link from 'next/link';
import useBannedWords from "./hooks/useBannedWords"; // Import custom hook

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

const Forum = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const firestore = getFirestore(app);
  const auth = getAuth();
  const [userLikes, setUserLikes] = useState<Map<string, string>>(new Map()); // Track user's like/dislike status
  const [userPhotos, setUserPhotos] = useState<Map<string, string>>(new Map());
  const [usernames, setUsernames] = useState<Map<string, string>>(new Map());
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [isEditingPost, setIsEditingPost] = useState(false); // State to toggle editing mode
  const [editContentPost, setEditContentPost] = useState(''); // Store the new post content
  const [editingCommentIndex, setEditingCommentIndex] = useState<number | null>(null); // Define state for comment index
  const [isEditingComment, setIsEditingComment] = useState(false); // State to toggle editing mode
  const [editContentComment, setEditContentComment] = useState(''); // Store the new comment content
  const [showComments, setShowComments] = useState<{ [key: string]: boolean }>({});
  const [searchQuery, setSearchQuery] = useState(''); // State for search query
  const [isPostForumVisible, setIsPostForumVisible] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [editImageFile, setEditImageFile] = useState<File | null>(null); // Store selected image file
  const [editCurrentImageUrl, setEditCurrentImageUrl] = useState<string | null>(null); // Store the current image URL
  const { bannedWords } = useBannedWords(); // Get banned words from Firestore
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]); // Store posts after filtering
  const [isSaving, setIsSaving] = useState<boolean>(false); // Loading state for saving post

  // Handles the like and dislike tracking
  useEffect(() => {
    const postsQuery = query(collection(firestore, 'posts'), orderBy('createdAt', 'desc'));

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

  // Function to filter posts based on the search query
  const filterPosts = (postsData: Post[]) => {
    if (searchQuery.trim() === "") {
      setFilteredPosts(postsData); // If search is empty, show all posts
    } else {
      const filtered = postsData.filter((post) =>
        post.message.toLowerCase().includes(searchQuery.toLowerCase()) // Filter by message content
      );
      setFilteredPosts(filtered); // Update filtered posts
    }
  };

  useEffect(() => {
    const postsQuery = query(collection(firestore, 'posts'), orderBy('createdAt', 'desc'));
  
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

  useEffect(() => {
    filterPosts(posts); // Filter posts whenever the searchQuery state changes
  }, [searchQuery, posts]); // Trigger when either posts or searchQuery change

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

  const handleLikeComment = async (postId: string, commentIndex: number) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
  
    const postRef = doc(firestore, 'posts', postId);
    const postDoc = await getDoc(postRef);
  
    if (postDoc.exists()) {
      const postData = postDoc.data() as Post;
      const comments = postData.comments || [];
      const comment = comments[commentIndex];
      const likedBy = comment.likedBy || [];
      const dislikedBy = comment.dislikedBy || [];
      const likes = comment.likes || 0; // Initialize likes to 0 if not present
      const dislikes = comment.dislikes || 0; // Initialize dislikes to 0 if not present
  
      // If the user disliked, switch to like
      if (dislikedBy.includes(userId)) {
        const updatedDislikedBy = dislikedBy.filter((id: string) => id !== userId);
        const updatedLikedBy = likedBy.includes(userId)
          ? likedBy
          : [...likedBy, userId];
  
        comment.likedBy = updatedLikedBy;
        comment.dislikedBy = updatedDislikedBy;
        comment.likes = likes + 1;
        comment.dislikes = dislikes - 1;
  
      } else {
        // Toggle like status
        const updatedLikedBy = likedBy.includes(userId)
          ? likedBy.filter((id: string) => id !== userId)
          : [...likedBy, userId];
  
        comment.likedBy = updatedLikedBy;
        comment.likes = likedBy.includes(userId) ? likes - 1 : likes + 1;
      }
  
      comments[commentIndex] = comment;
  
      await updateDoc(postRef, {
        comments: comments, // Update the entire comments array
      });
    }
  };
  
  const handleDislikeComment = async (postId: string, commentIndex: number) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
  
    const postRef = doc(firestore, 'posts', postId);
    const postDoc = await getDoc(postRef);
  
    if (postDoc.exists()) {
      const postData = postDoc.data() as Post;
      const comments = postData.comments || [];
      const comment = comments[commentIndex];
      const likedBy = comment.likedBy || [];
      const dislikedBy = comment.dislikedBy || [];
      const likes = comment.likes || 0; // Initialize likes to 0 if not present
      const dislikes = comment.dislikes || 0; // Initialize dislikes to 0 if not present
  
      // If the user liked, switch to dislike
      if (likedBy.includes(userId)) {
        const updatedLikedBy = likedBy.filter((id: string) => id !== userId);
        const updatedDislikedBy = dislikedBy.includes(userId)
          ? dislikedBy
          : [...dislikedBy, userId];
  
        comment.likedBy = updatedLikedBy;
        comment.dislikedBy = updatedDislikedBy;
        comment.likes = likes - 1;
        comment.dislikes = dislikes + 1;
      } else {
        // Toggle dislike status
        const updatedDislikedBy = dislikedBy.includes(userId)
          ? dislikedBy.filter((id: string) => id !== userId)
          : [...dislikedBy, userId];
  
        comment.dislikedBy = updatedDislikedBy;
        comment.dislikes = dislikedBy.includes(userId) ? dislikes - 1 : dislikes + 1;
      }
  
      comments[commentIndex] = comment;
  
      await updateDoc(postRef, {
        comments: comments, // Update the entire comments array
      });
    }
  };
  

  const handleAddComment = async (postId: string, comment: string) => {
    const userId = auth.currentUser?.uid;
    
    if (!userId || !comment.trim()) return;
    
    // Get user data from Firestore
    const userRef = doc(firestore, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error('User not found in Firestore');
      return;
    }
    
    const userData = userDoc.data();
    const username = userData?.username || 'Anonymous';
    const postRef = doc(firestore, 'posts', postId);
    const postDoc = await getDoc(postRef);
    
    if (postDoc.exists()) {
      const postData = postDoc.data() as Post; // Cast to Post type
    
      const updatedComments = [
        ...postData.comments,
        {
          username, 
          comment, 
          createdAt: new Date(), 
          userId, // Add the userId to the comment
          likedBy: [], // Initialize as empty array
          dislikedBy: [], // Initialize as empty array
          likes: 0, // Initialize liked count to 0
          dislikes: 0, // Initialize disliked count to 0
        },
      ];
    
      await updateDoc(postRef, {
        comments: updatedComments,
      });
    }
  };

  const formatTimestamp = (timestamp: any) => {
    // Handle if timestamp is valid or missing
    return timestamp && timestamp.seconds
      ? formatDistanceToNow(new Date(timestamp.seconds * 1000), { addSuffix: true })
      : 'Invalid date';
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

  const handleDeleteComment = async (postId: string, commentIndex: number) => {
    try {
      // Prompt the user to confirm comment deletion
      const confirmDelete = window.confirm("Are you sure you want to delete this comment? This cannot be undone!");
      if (!confirmDelete) return; // If user cancels, exit the function
  
      const userId = auth.currentUser?.uid;
      if (!userId) {
        console.error("You must be logged in to delete comments.");
        return;
      }
  
      const postRef = doc(firestore, 'posts', postId);
      const postDoc = await getDoc(postRef);
  
      if (postDoc.exists()) {
        const postData = postDoc.data() as Post;
  
        // Ensure that the comment belongs to the logged-in user
        if (postData.comments[commentIndex].userId !== userId) {
          console.error("You can only delete your own comments.");
          return;
        }
  
        // Remove the comment from the comments array
        const updatedComments = postData.comments.filter((_, index) => index !== commentIndex);
  
        await updateDoc(postRef, {
          comments: updatedComments,
        });
  
        console.log("Comment deleted successfully.");
      } else {
        console.error("Post does not exist.");
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };  

  const getUsernameFromDatabase = async (userId: string): Promise<string> => {
    try {
      const userRef = doc(firestore, "users", userId); // Reference to the user's document
      const userDoc = await getDoc(userRef);   // Fetch the document
      return userDoc.exists() ? (userDoc.data()?.username as string) : "Unknown User";
    } catch (error) {
      console.error("Error fetching username:", error);
      return "Unknown User";
    }
  };

  useEffect(() => {
    const fetchUsernames = async () => {
      const updatedUsernames = new Map(usernames);

      // Fetch usernames for posts and comments
      for (const post of posts) {
        if (!updatedUsernames.has(post.userId)) {
          updatedUsernames.set(post.userId, await getUsernameFromDatabase(post.userId));
        }
        for (const comment of post.comments) {
          if (!updatedUsernames.has(comment.userId)) {
            updatedUsernames.set(comment.userId, await getUsernameFromDatabase(comment.userId));
          }
        }
      }

      setUsernames(updatedUsernames);
    };

    fetchUsernames();
  }, [posts]);

  const handleUpdatePost = (postId: string) => {
    const postToEdit = posts.find((post) => post.id === postId);
    if (postToEdit) {
      setEditingPostId(postId); // Track the post being edited
      setEditContentPost(postToEdit.message); // Pre-fill the content
      setEditCurrentImageUrl(postToEdit.imageUrl); // Pre-fill the current image URL
      setIsEditingPost(true); // Enable editing mode
    }
  };
  
  // Handle form submission for updating the post
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
        ...(imageUrl && { imageUrl }), // Update the imageUrl only if a new image was uploaded
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

  const handleUpdateComment = (postId: string, commentIndex: number) => {
    const postToEdit = posts.find(post => post.id === postId);
    if (postToEdit) {
      const commentToEdit = postToEdit.comments[commentIndex];
      if (commentToEdit) {
        setEditingPostId(postId);  // Track the post being edited
        setEditingCommentIndex(commentIndex); // Track the comment being edited by its index
        setEditContentComment(commentToEdit.comment); // Pre-fill the content of the comment
        setIsEditingComment(true); // Enable editing mode for comments
      }
    }
  };
  
  const handleSaveComment = async () => {
    if (editingPostId === null || editingCommentIndex === null) return;

    setIsSaving(true); // Set loading state when saving

    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const postRef = doc(firestore, 'posts', editingPostId);
    const postToUpdate = await getDoc(postRef);
    const postData = postToUpdate.data() as Post;

    // Get the comment to update using its index
    const commentToUpdate = postData.comments[editingCommentIndex];

    // Update the comment's content
    postData.comments[editingCommentIndex] = {
      ...commentToUpdate,
      comment: editContentComment,
      updatedAt: new Date(),
    };

    // Save the updated post
    try {
      await updateDoc(postRef, {
        comments: postData.comments,
      });
      // Reset editing states
      setIsEditingComment(false);
      setEditContentComment('');
      setEditingPostId(null);
      setEditingCommentIndex(null); // Reset the index after saving
    } catch (error) {
      console.error("Error saving comment:", error);
    } finally {
      setIsSaving(false); // Reset loading state after saving
    }
  };

  // Assuming `handleBookmarkPost` is the function handling the bookmark toggle
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
      } else {
        // Add bookmark (user is bookmarking the post)
        bookmarks.push({
          userId: currentUserId,
          bookmarkCreatedAt: new Date(), // Using Firestore Timestamp is preferable
        });
      }

      // Update the post document with the modified bookmarks array
      await updateDoc(postRef, {
        bookmarks: bookmarks,
      });
    }
  };

  // Function to toggle PostForum visibility
  const togglePostForum = () => {
    setIsPostForumVisible((prevState) => !prevState);
  };

  // Function to toggle Search input visibility
  const toggleSearch = () => {
    setIsSearchVisible((prevState) => !prevState);
  };

  // Utility function to censor words in a text
  const censorText = (text: string, bannedWords: string[]): string => {
    let censoredText = text;
    
    bannedWords.forEach((word) => {
      // Replace the word with asterisks (*) matching the word length
      const regex = new RegExp(`\\b${word}\\b`, 'gi'); // Match whole word, case insensitive
      censoredText = censoredText.replace(regex, (match) => '*'.repeat(match.length));
    });
    
    return censoredText;
  };


  return (
    <div className="flex flex-col">
      {/* Conditionally show Search Input */}
      {isSearchVisible && (
        <div className="w-8/12 mx-auto mt-4">
          <input
            type="text"
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} // Update searchQuery on input change
            className="w-full p-2 bg-[#383434] text-white rounded-md focus:ring-2 focus:ring-yellow-500 outline-none"
          />
        </div>
      )}

      {/* Posts Section with Title and Divider */}
       <div className="mt-4 w-8/12 mx-auto flex justify-between items-center border-b-2 border-white pb-2 mb-4">
        <div>
          {/* Posts Text with Border */}
          <p className="text-white text-xl">Posts</p>
        </div>
        
        {/* Buttons aligned to the right */}
        <div className="flex space-x-4">
          {/* Create Post Button with Tooltip */}
          <div className="relative group inline-flex items-center">
            <button
              onClick={togglePostForum}
              className={`text-white ${isPostForumVisible ? 'text-yellow-500' : 'hover:text-yellow-500'}`}
            >
              <FaPlus className="w-6 h-6" />
            </button>

            {/* Tooltip */}
            <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
              Create Post
            </div>
          </div>

          {/* Search Button with Tooltip */}
          <div className="relative group inline-flex items-center">
            <button
              onClick={toggleSearch}
              className={`text-white ${isSearchVisible ? 'text-yellow-500' : 'hover:text-yellow-500'}`}
            >
              <FaSearch className="w-6 h-6" />
            </button>

            {/* Tooltip */}
            <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
              Search Posts
            </div>
          </div>
        </div>
      </div>

      {/* Conditionally show Post Forum */}
      {isPostForumVisible && (
        <div className="w-10/12 mx-auto">
          <PostForum /> {/* Your PostForum Component */}
        </div>
      )}

      {/* Contains the Posts and Comments Sections*/}
      <div>
        <div className="p-3 w-9/12 bg-[#484242] mx-auto">
          {filteredPosts.length === 0 ? (
            <p className="text-center text-white w-full">There are no posts matching your search query.</p>
          ) : (
            filteredPosts.map((post) => (
              <div key={post.id} className="pt-6 rounded-lg mb-10 w-11/12 mx-auto mt-2 bg-[#383434] p-6">
                <div className="flex items-center justify-between mb-4">
                  {/* Left Section: Image, Username, and Timestamp */}
                  <div className="flex items-center">
                    <Link href={`/profile-view/${post.userId}`}>
                      <img
                        src={userPhotos.get(post.userId) || 'https://via.placeholder.com/150'}
                        alt="Profile"
                        className="w-12 h-12 rounded-full mr-4 cursor-pointer"
                        onLoad={() => fetchUserPhoto(post.userId)}
                      />
                    </Link>
                    <div>
                      <p className="text-xl font-semibold text-white">
                        {usernames.get(post.userId) || "Loading..."}
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
  
                  {/* Right Section: Update, Delete, and Bookmark Buttons */}
                  <div className="flex space-x-2">
                    {/* Container for all buttons */}
                    <div className="bg-[#2c2c2c] rounded-full px-4 py-2 flex items-center space-x-4">
                      {/* Bookmark Button - Always visible */}
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
                          <FaBookmark className="w-5 h-5" />
                        </button>

                        {/* Tooltip for Bookmark */}
                        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
                          Bookmark Post
                        </div>
                      </div>

                      {/* Conditionally rendered Update and Delete Buttons */}
                      {auth.currentUser?.uid === post.userId && !isEditingPost && (
                        <>
                          {/* Edit Button with Tooltip */}
                          <div className="relative group inline-flex items-center">
                            <button
                              onClick={() => handleUpdatePost(post.id)}
                              className="text-white hover:text-yellow-500"
                            >
                              <FaEdit className="w-5 h-5" />
                            </button>

                            {/* Tooltip for Edit Button */}
                            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
                              Update Post
                            </div>
                          </div>

                          {/* Delete Button with Tooltip */}
                          <div className="relative group inline-flex items-center">
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="text-white hover:text-yellow-500"
                            >
                              <FaTrash className="w-5 h-5" />
                            </button>
                            {/* Tooltip for Delete Button */}
                            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
                              Delete Post
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-lg text-white mb-4" style={{ whiteSpace: 'pre-wrap' }}>
                  {post.message}
                </p>

                {isEditingPost && (
                  <div className="fixed inset-0 bg-[#484242] bg-opacity-80 flex items-center justify-center z-50">
                    <div className="bg-[#383434] p-6 rounded-lg w-2/4 max-h-[90vh] overflow-y-auto">
                      {/* Textarea for Editing Content */}
                      <textarea
                        value={editContentPost}
                        onChange={(e) => setEditContentPost(e.target.value)}
                        className="w-full p-3 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none text-white bg-[#252323] resize-none"
                        rows={5}
                        placeholder="Edit your post..."
                      />

                      {/* Current Image Display */}
                      {editCurrentImageUrl && (
                        <div className="mt-4">
                          <p className="text-white">Current Image:</p>
                          <img
                            src={editCurrentImageUrl}
                            alt="Current Post Image"
                            className="w-full object-cover rounded-lg mt-2"
                          />
                        </div>
                      )}

                      {/* Selected Image Preview */}
                      {editImageFile && (
                        <div className="mt-4">
                          <p className="text-white">New Image Preview:</p>
                          <img
                            src={URL.createObjectURL(editImageFile)} // Preview selected image
                            alt="Selected Image Preview"
                            className="w-full object-cover rounded-lg mt-2"
                          />
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
                <div className="flex gap-4 mb-4">
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`${userLikes.get(post.id) === 'like' ? 'text-yellow-500' : 'text-gray-400'}`}
                  >
                    <FaThumbsUp className="w-4 h-4" />
                    {post.likes}
                  </button>
                  <button
                    onClick={() => handleDislike(post.id)}
                    className={`${userLikes.get(post.id) === 'dislike' ? 'text-yellow-500' : 'text-gray-400'}`}
                  >
                    <FaThumbsDown className="w-4 h-4" />
                    {post.dislikes}
                  </button>
                </div>
                <p className="border-b-2 border-white py-2 w-auto text-white text-xl p-2 ml-2 mb-2">
                  Comments ({post.comments.length})
                </p>

                {/* Toggle Comments Button */}
                <button
                  onClick={() =>
                    setShowComments((prevState) => ({
                      ...prevState,
                      [post.id]: !prevState[post.id], // Toggle visibility for the current post
                    }))
                  }
                  className={`ml-1 mb-4 text-white px-4 py-2 rounded-md ${
                    showComments[post.id] ? 'bg-yellow-500' : 'bg-[#2c2c2c] hover:bg-yellow-500'
                  }`}
                >
                  {showComments[post.id] ? "Hide Comments" : "Show Comments"}
                </button>

                {/* Comments Section */}
                {showComments[post.id] && (
                  <div className="comments-section ml-2">
                    <div className="text-white">
                      {Array.isArray(post.comments) && post.comments.length > 0 ? (
                        post.comments.map((comment, index) => (
                          <div key={index} className="flex items-start mb-3">
                            <Link href={`/profile-view/${comment.userId}`}>
                              <img
                                src={
                                  userPhotos.get(comment.userId) || "https://via.placeholder.com/150"
                                }
                                alt="Commenter profile"
                                className="w-8 h-8 rounded-full mr-2 cursor-pointer"
                                onLoad={() => fetchUserPhoto(comment.userId)}
                              />
                            </Link>
                            <div className="flex flex-col w-full">
                              <div className="flex flex-row justify-between">
                                <div>
                                  <p className="font-semibold text-white">
                                    {usernames.get(comment.userId) || "Loading..."}
                                  </p>
                                  <p className="text-sm text-gray-400">
                                    {comment.updatedAt ? (
                                      <>
                                        {formatTimestamp(comment.updatedAt)}{" "}
                                        <span className="text-gray-400">(edited)</span>
                                      </>
                                    ) : (
                                      formatTimestamp(comment.createdAt)
                                    )}
                                  </p>
                                </div>
                                {auth.currentUser?.uid === comment.userId && (
                                  <div className="bg-[#2c2c2c] rounded-full px-4 py-2 flex items-center space-x-4">
                                    {/* Update Button with Tooltip */}
                                    <div className="relative group inline-flex items-center">
                                      <button
                                        onClick={() => handleUpdateComment(post.id, index)}
                                        className="hover:text-yellow-500"
                                      >
                                        <FaEdit className="w-5 h-5" />
                                      </button>

                                      {/* Tooltip */}
                                      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
                                          Update Comment
                                      </div>
                                    </div>
                                    {/* Delete Button with Tooltip */}
                                    <div className="relative group inline-flex items-center">
                                      <button
                                        onClick={() => handleDeleteComment(post.id, index)}
                                        className="hover:text-yellow-500"
                                      >
                                        <FaTrash className="w-5 h-5" />
                                      </button>

                                      {/* Tooltip */}
                                      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
                                          Delete Comment
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {isEditingComment && (
                                <div className="fixed inset-0 bg-[#484242] bg-opacity-80 flex items-center justify-center z-50">
                                  <div className="bg-[#383434] p-6 rounded-lg w-2/4 max-h-[90vh] overflow-y-auto">
                                    <textarea
                                      value={editContentComment}
                                      onChange={(e) => setEditContentComment(e.target.value)}
                                      className="w-full p-3 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none text-white bg-[#252323] resize-none"
                                      rows={5}
                                    />
                                    <div className="mt-4 flex justify-end space-x-2">
                                      <button
                                        onClick={() => setIsEditingComment(false)}
                                        className="bg-[#2c2c2c] text-white px-4 py-2 rounded-lg"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={handleSaveComment}
                                        className="bg-yellow-500 text-white px-4 py-2 rounded-lg"
                                        disabled={isSaving} // Disable button while saving
                                      >
                                        {isSaving ? "Saving..." : "Save"} {/* Change text based on isSaving */}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              <p>{filterBannedWords(comment.comment)}</p>

                              <div className="flex gap-4 mt-2">
                                <button
                                  onClick={() => handleLikeComment(post.id, index)}
                                  className={`${
                                    comment.likedBy?.includes(auth.currentUser?.uid || "")
                                      ? "text-yellow-500"
                                      : "text-gray-400"
                                  }`}
                                >
                                  <FaThumbsUp className="w-4 h-4" />
                                  {comment.likes}
                                </button>
                                <button
                                  onClick={() => handleDislikeComment(post.id, index)}
                                  className={`${
                                    comment.dislikedBy.includes(auth.currentUser?.uid || "")
                                      ? "text-yellow-500"
                                      : "text-gray-400"
                                  }`}
                                >
                                  <FaThumbsDown className="w-4 h-4" />
                                  {comment.dislikes}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="pl-2 mb-2">No comments yet</p>
                      )}
                    </div>
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Add a comment..."
                  className="ml-1 text-white w-full p-2 rounded-md bg-[#292626] focus:ring-2 focus:ring-yellow-500 outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddComment(post.id, e.currentTarget.value);
                      e.currentTarget.value = "";
                    }
                  }}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Forum;
