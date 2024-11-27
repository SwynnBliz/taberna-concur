// app/post-view/page.tsx (Post View Page)
'use client';
import Layout from '../../../components/root/Layout'; // Layout component
import { useState, useEffect, useRef } from 'react';
import { documentId, getFirestore, collection, query, orderBy, onSnapshot, updateDoc, doc, increment, getDoc, deleteDoc, where, deleteField } from 'firebase/firestore';
import { app } from '../../firebase/config'; // Import Firestore instance
import { formatDistanceToNow } from 'date-fns'; // Import the function from date-fns
import { getAuth } from 'firebase/auth';
import { FaThumbsUp, FaThumbsDown, FaTrash, FaEdit, FaBookmark, FaComment, FaEllipsisV, FaShare } from 'react-icons/fa'; // Importing React Icons
import Link from 'next/link';
import useBannedWords from '../../../components/forum/hooks/useBannedWords';
import { useParams } from 'next/navigation'; // For dynamic route params
import React from 'react'; // Import React
import { HiDocumentMagnifyingGlass } from "react-icons/hi2";
import { AiOutlineClose } from 'react-icons/ai'; // Import the close icon
import { LinkIt } from 'react-linkify-it';

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
    replies: {
      reply: string;
      createdAt: any;
      userId: string;
      likes: number;
      dislikes: number;
      likedBy: string[];
      dislikedBy: string[];
      updatedAt?: any;
      repliedToUserId?: string;  // New field to store the userId of the user being replied to
    }[];
  }[];
  likedBy: string[];
  dislikedBy: string[];
  bookmarks: {
    userId: string;
    bookmarkCreatedAt: any;
  }[];
}

const PostViewPage = () => {
  const { id } = useParams();
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
  const [hideComments, setHideComments] = useState<{ [key: string]: boolean }>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null); // To store current logged-in user's UID
  const [editImageFile, setEditImageFile] = useState<File | null>(null); // Store selected image file
  const [editCurrentImageUrl, setEditCurrentImageUrl] = useState<string | null>(null); // Store the current image URL
  const { bannedWords } = useBannedWords(); // Get banned words from Firestore
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]); // Store posts after filtering
  const [isSaving, setIsSaving] = useState<boolean>(false); // Loading state for saving post
  const [showMoreOptions, setShowMoreOptions] = useState<{ [postId: string]: boolean }>({});
  const [isExpanded, setIsExpanded] = useState<{ [postId: string]: boolean }>({});
  const [isTruncated, setIsTruncated] = useState<{ [postId: string]: boolean }>({});
  const contentRefs = useRef<{ [key: string]: HTMLParagraphElement | null }>({});
  const [notification, setNotification] = useState<string | null>(null);
  const [showReplies, setShowReplies] = useState<{ [postId: string]: { [commentIndex: number]: boolean } }>({});
  const [isEditingReply, setIsEditingReply] = useState(false);
  const [editContentReply, setEditContentReply] = useState("");
  const [editingReplyIndex, setEditingReplyIndex] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');  // To track the reply text
  const [repliedToUserId, setRepliedToUserId] = useState<string | null>(null);
  const [deletePostPrompt, setDeletePostPrompt] = useState(false);
  const [postIdToDelete, setPostIdToDelete] = useState<string | null>(null);
  const [deleteCommentPrompt, setDeleteCommentPrompt] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<{ postId: string; commentIndex: number } | null>(null);
  const [deleteReplyPrompt, setDeleteReplyPrompt] = useState(false);
  const [replyToDelete, setReplyToDelete] = useState<{ postId: string, commentIndex: number, replyIndex: number } | null>(null);

  // Handles the like and dislike tracking
  useEffect(() => {

    if (!id || Array.isArray(id)) return; // Ensure `id` is valid before proceeding
  
    const postsQuery = query(
      collection(firestore, 'posts'),
      where(documentId(), "==", id), // Filter posts by the id of the post being viewed
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
      where(documentId(), "==", id), // Filter posts by the id of the post being viewed
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
    // Get the current user's ID from Firebase Authentication
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      setCurrentUserId(user.uid); // Store the UID of the logged-in user
    }
  }, []);

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

  const handleLikeReply = async (postId: string, commentIndex: number, replyIndex: number) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
  
    const postRef = doc(firestore, 'posts', postId);
    const postDoc = await getDoc(postRef);
  
    if (postDoc.exists()) {
      const postData = postDoc.data() as Post;
      const comments = postData.comments || [];
      const comment = comments[commentIndex];
      const reply = comment.replies?.[replyIndex];
      if (!reply) return; // Ensure the reply exists
  
      const likedBy = reply.likedBy || [];
      const dislikedBy = reply.dislikedBy || [];
      const likes = reply.likes || 0;
      const dislikes = reply.dislikes || 0;
  
      // If the user disliked, switch to like
      if (dislikedBy.includes(userId)) {
        const updatedDislikedBy = dislikedBy.filter((id: string) => id !== userId);
        const updatedLikedBy = likedBy.includes(userId)
          ? likedBy
          : [...likedBy, userId];
  
        reply.likedBy = updatedLikedBy;
        reply.dislikedBy = updatedDislikedBy;
        reply.likes = likes + 1;
        reply.dislikes = dislikes - 1;
  
      } else {
        // Toggle like status
        const updatedLikedBy = likedBy.includes(userId)
          ? likedBy.filter((id: string) => id !== userId)
          : [...likedBy, userId];
  
        reply.likedBy = updatedLikedBy;
        reply.likes = likedBy.includes(userId) ? likes - 1 : likes + 1;
      }
  
      comments[commentIndex] = comment;
  
      await updateDoc(postRef, {
        comments: comments, // Update the entire comments array
      });
    }
  };

  const handleDislikeReply = async (postId: string, commentIndex: number, replyIndex: number) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
  
    const postRef = doc(firestore, 'posts', postId);
    const postDoc = await getDoc(postRef);
  
    if (postDoc.exists()) {
      const postData = postDoc.data() as Post;
      const comments = postData.comments || [];
      const comment = comments[commentIndex];
      const reply = comment.replies?.[replyIndex];
      if (!reply) return; // Ensure the reply exists
  
      const likedBy = reply.likedBy || [];
      const dislikedBy = reply.dislikedBy || [];
      const likes = reply.likes || 0;
      const dislikes = reply.dislikes || 0;
  
      // If the user liked, switch to dislike
      if (likedBy.includes(userId)) {
        const updatedLikedBy = likedBy.filter((id: string) => id !== userId);
        const updatedDislikedBy = dislikedBy.includes(userId)
          ? dislikedBy
          : [...dislikedBy, userId];
  
        reply.likedBy = updatedLikedBy;
        reply.dislikedBy = updatedDislikedBy;
        reply.likes = likes - 1;
        reply.dislikes = dislikes + 1;
      } else {
        // Toggle dislike status
        const updatedDislikedBy = dislikedBy.includes(userId)
          ? dislikedBy.filter((id: string) => id !== userId)
          : [...dislikedBy, userId];
  
        reply.dislikedBy = updatedDislikedBy;
        reply.dislikes = dislikedBy.includes(userId) ? dislikes - 1 : dislikes + 1;
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
          replies: [], // Initialize replies as an empty array
        },
      ];
  
      await updateDoc(postRef, {
        comments: updatedComments,
      });
  
      console.log('Comment added successfully');
    } else {
      console.error('Post does not exist.');
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

  // Handle delete post
  const handleDeletePost = async (postId: string) => {
    setPostIdToDelete(postId);
    setDeletePostPrompt(true); // Open the confirmation modal
  };

  // Delete post from Firestore
  const deletePost = async (postId: string) => {
    try {
      const postRef = doc(firestore, 'posts', postId);
      await deleteDoc(postRef);
      console.log("Post deleted successfully.");
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };

  // Handle delete comment
  const handleDeleteComment = (postId: string, commentIndex: number) => {
    setCommentToDelete({ postId, commentIndex });
    setDeleteCommentPrompt(true); // Open the confirmation modal
  };

  // Delete comment from Firestore
  const deleteComment = async (postId: string, commentIndex: number) => {
    try {
      const postRef = doc(firestore, 'posts', postId);
      const postDoc = await getDoc(postRef);

      if (postDoc.exists()) {
        const postData = postDoc.data() as Post;
        
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
  
      // Collect all unique userIds from posts, comments, and replies
      const userIds = new Set<string>();
  
      // Loop through posts and comments to collect userIds
      posts.forEach(post => {
        userIds.add(post.userId);  // Add the post creator's userId
  
        post.comments.forEach(comment => {
          userIds.add(comment.userId);  // Add the comment creator's userId
          comment.replies?.forEach(reply => {
            userIds.add(reply.userId);  // Add the reply creator's userId
          });
        });
      });
  
      // Now fetch usernames for all collected userIds
      for (const userId of userIds) {
        if (!updatedUsernames.has(userId)) {
          const username = await getUsernameFromDatabase(userId); // Fetch the username
          updatedUsernames.set(userId, username); // Store it in the map
        }
      }
  
      // After fetching all usernames, update the state
      setUsernames(updatedUsernames);
    };
  
    fetchUsernames();
  }, [posts]);  // Re-run the effect when the posts array changes

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
      let imageUrl = editCurrentImageUrl; // Start with the current image URL
  
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
        imageUrl = data.secure_url; // Update imageUrl to the new uploaded image URL
      }
  
      // If the current image is explicitly removed, clear imageUrl
      if (!editImageFile && !editCurrentImageUrl) {
        imageUrl = null;
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
      setEditCurrentImageUrl(null); // Clear the current image URL
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

  const handleUpdateReply = (postId: string, commentIndex: number, replyIndex: number) => {
    const postToEdit = posts.find(post => post.id === postId);
    if (postToEdit) {
      const commentToEdit = postToEdit.comments[commentIndex];
      const replyToEdit = commentToEdit.replies?.[replyIndex];
      if (replyToEdit) {
        setEditingPostId(postId); // Track the post being edited
        setEditingCommentIndex(commentIndex); // Track the comment being edited
        setEditingReplyIndex(replyIndex); // Track the reply being edited
        setEditContentReply(replyToEdit.reply); // Pre-fill the content of the reply
        setIsEditingReply(true); // Enable editing mode for replies
      }
    }
  };
  
  const handleSaveReply = async () => {
    if (editingPostId === null || editingCommentIndex === null || editingReplyIndex === null) return;
  
    setIsSaving(true); // Set loading state when saving
  
    const userId = auth.currentUser?.uid;
    if (!userId) return;
  
    const postRef = doc(firestore, 'posts', editingPostId);
    const postToUpdate = await getDoc(postRef);
    const postData = postToUpdate.data() as Post;
  
    // Get the reply to update using its index
    const commentToUpdate = postData.comments[editingCommentIndex];
    const replyToUpdate = commentToUpdate.replies?.[editingReplyIndex];
  
    if (replyToUpdate) {
      // Update the reply content
      postData.comments[editingCommentIndex].replies[editingReplyIndex] = {
        ...replyToUpdate,
        reply: editContentReply,  // Save the updated reply with @mentions
        updatedAt: new Date(),
      };
  
      // Save the updated post
      try {
        await updateDoc(postRef, {
          comments: postData.comments,
        });
        // Reset editing states
        setIsEditingReply(false);
        setEditContentReply('');
        setEditingPostId(null);
        setEditingCommentIndex(null);
        setEditingReplyIndex(null); // Reset the reply index after saving
      } catch (error) {
        console.error("Error saving reply:", error);
      } finally {
        setIsSaving(false); // Reset loading state after saving
      }
    }
  };

  const handleAddReply = async (postId: string, commentIndex: number, reply: string, repliedToUserId: string | null) => {
    const userId = auth.currentUser?.uid;
    if (!userId || !reply.trim()) return;
  
    // Get user data from Firestore
    const userRef = doc(firestore, 'users', userId);
    const userDoc = await getDoc(userRef);
  
    if (!userDoc.exists()) {
      console.error('User not found in Firestore');
      return;
    }
  
    const userData = userDoc.data();
    const username = userData?.username || 'Anonymous'; // Default to 'Anonymous' if username not found
  
    // Reference to the post
    const postRef = doc(firestore, 'posts', postId);
    const postDoc = await getDoc(postRef);
  
    if (postDoc.exists()) {
      const postData = postDoc.data() as Post; // Cast to Post type
  
      // Update the comments with the new reply
      const updatedComments = postData.comments.map((comment, index) => {
        if (index === commentIndex) {
          return {
            ...comment,
            replies: [
              ...comment.replies,
              {
                reply,
                createdAt: new Date(),
                userId,
                username, // Add the username
                likedBy: [],
                dislikedBy: [],
                likes: 0,
                dislikes: 0,
                repliedToUserId: repliedToUserId, // Store the user you're replying to (can be null if no user is replied to)
              }
            ],
          };
        }
        return comment;
      });
  
      // Update the post in Firestore with the new replies array
      await updateDoc(postRef, {
        comments: updatedComments,
      });
    }
  };  

  // Handle reply delete modal trigger
  const handleDeleteReply = (postId: string, commentIndex: number, replyIndex: number) => {
    setReplyToDelete({ postId, commentIndex, replyIndex });
    setDeleteReplyPrompt(true); // Open the confirmation modal
  };

  // Delete reply from Firestore
  const deleteReply = async (postId: string, commentIndex: number, replyIndex: number) => {
    try {
      const postRef = doc(firestore, 'posts', postId);
      const postDoc = await getDoc(postRef);

      if (postDoc.exists()) {
        const postData = postDoc.data() as Post;

        // Remove the reply from the replies array
        const updatedComments = postData.comments.map((comment, cIndex) => {
          if (cIndex === commentIndex) {
            return {
              ...comment,
              replies: comment.replies.filter((_, rIndex) => rIndex !== replyIndex),
            };
          }
          return comment;
        });

        // Update the post in Firestore
        await updateDoc(postRef, {
          comments: updatedComments,
        });

        console.log("Reply deleted successfully.");
      } else {
        console.error("Post does not exist.");
      }
    } catch (error) {
      console.error("Error deleting reply:", error);
    }
  };

  // Function to render the reply text with @username as a link
  const renderReplyText = (text: string, userId: string) => {
    const regex = /@([a-zA-Z0-9._-]+)/g; // Regex to find @mentions with dashes, underscores, and periods
    
    return text.split(regex).map((part, index) => {
      if (index % 2 === 1) {
        // If this is a username match, create a Link
        return (
          <Link key={index} href={`/profile-view/${userId}`} className="text-blue-500 hover:text-yellow-500">
            @{part}
          </Link>
        );
      }
      return part; // Return regular text
    });
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

  const formatNumberIntl = (num: number) => {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: 1,
    }).format(num);
  };

  const toggleRepliesVisibility = (postId: string, commentIndex: number) => {
    setShowReplies((prevState) => ({
      ...prevState,
      [postId]: {
        ...prevState[postId],
        [commentIndex]: !prevState[postId]?.[commentIndex],
      },
    }));
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
      <div className="flex flex-col">

        {/* Posts Section with Title and Divider */}
        <div className="mt-6 w-8/12 mx-auto flex justify-between items-center border-b-2 border-white pb-2 mb-4">
          <div>
            {/* Posts Text with Border */}
            <p className="text-white text-xl">Posts</p>
          </div>
        </div>

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
                                onClick={() => setShowMoreOptions(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
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
                                      setShowMoreOptions(prev => ({ ...prev, [post.id]: false })); // Close dropdown after Edit
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
                                      setShowMoreOptions(prev => ({ ...prev, [post.id]: false })); // Close dropdown after Delete
                                    }}
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
                              setDeletePostPrompt(false); // Close the modal
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
                                onClick={() => setEditCurrentImageUrl(null)} // Remove the current image
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

                    {/* Comment Button with Tooltip (Show/Hide Comments with Counter) */}
                    <button
                      onClick={() =>
                        setHideComments((prevState) => ({
                          ...prevState,
                          [post.id]: !prevState[post.id], // Toggle visibility for the current post
                        }))
                      }
                      className={`relative group flex items-center justify-between bg-[#2c2c2c] p-2 rounded-full space-x-2 ml-auto ${!hideComments[post.id] ? 'text-yellow-500' : 'text-gray-400'}`}
                    >
                      <FaComment className="w-4 h-4" />
                      <span>{formatNumberIntl(post.comments.length)}</span> {/* Format the comments */}

                      {/* Tooltip for Show Comments */}
                      <div
                        className={`absolute bottom-full left-4 transform -translate-x-1/2 p-1 bg-[#2c2c2c] text-white text-xs rounded-md whitespace-nowrap ${
                          !hideComments[post.id] ? 'hidden group-hover:block' : 'hidden'
                        }`}
                      >
                        Hide Comments
                      </div>

                      {/* Tooltip for Hide Comments */}
                      <div
                        className={`absolute bottom-full left-4 transform -translate-x-1/2 p-1 bg-[#2c2c2c] text-white text-xs rounded-md whitespace-nowrap ${
                          hideComments[post.id] ? 'hidden group-hover:block' : 'hidden'
                        }`}
                      >
                        Show Comments
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

                  {!hideComments[post.id] && (
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
                                    <div className="bg-[#2c2c2c] max-h-8 rounded-full px-2 py-1 flex items-center space-x-2">
                                      {/* Update Button with Tooltip */}
                                      <div className="relative group inline-flex items-center">
                                        <button
                                          onClick={() => handleUpdateComment(post.id, index)}
                                          className="hover:text-yellow-500"
                                        >
                                          <FaEdit className="w-3 h-3" />
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
                                          <FaTrash className="w-3 h-3" />
                                        </button>

                                        {/* Tooltip */}
                                        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
                                            Delete Comment
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Delete Comment Confirmation Modal */}
                                {deleteCommentPrompt && (
                                  <div className="fixed inset-0 bg-[#484242] bg-opacity-60 flex items-center justify-center z-50">
                                    <div className="bg-[#2c2c2c] p-6 rounded-lg text-white text-center">
                                      <p>Are you sure you want to delete this comment? This cannot be undone!</p>
                                      <div className="mt-4 flex justify-center gap-4">
                                        <button
                                          onClick={async () => {
                                            if (!commentToDelete) return;
                                            const { postId, commentIndex } = commentToDelete;
                                            await deleteComment(postId, commentIndex); // Delete the comment
                                            setDeleteCommentPrompt(false); // Close the modal
                                          }}
                                          className="bg-yellow-500 text-black px-4 py-2 rounded"
                                        >
                                          Confirm
                                        </button>
                                        <button
                                          onClick={() => setDeleteCommentPrompt(false)}
                                          className="bg-gray-500 text-white px-4 py-2 rounded"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {isEditingComment && (
                                  <div className="fixed inset-0 bg-[#484242] bg-opacity-70 flex items-center justify-center z-50">
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

                                <LinkIt component={renderLink} regex={urlRegex}>
                                  <p>{filterBannedWords(comment.comment)}</p>
                                </LinkIt>

                                <div className="flex gap-2 mt-2">
                                {/* Like Button (Comment) with Tooltip */}
                                <div className="relative group inline-flex items-center">
                                  <button
                                    onClick={() => handleLikeComment(post.id, index)}
                                    className={`flex items-center justify-between min-w-9 bg-[#2c2c2c] p-1 rounded-full space-x-0 text-sm ${
                                      comment.likedBy?.includes(auth.currentUser?.uid || "")
                                        ? "text-yellow-500"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    <FaThumbsUp className="w-3 h-3" />
                                    <span>{formatNumberIntl(comment.likes)}</span> {/* Format the likes */}
                                  </button>
                                  {/* Tooltip for Like Button (Comment) */}
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
                                    Like Comment
                                  </div>
                                </div>
                                {/* Dislike Button (Comment) with Tooltip */}
                                <div className="relative group inline-flex items-center">
                                  <button
                                    onClick={() => handleDislikeComment(post.id, index)}
                                    className={`flex items-center justify-between min-w-9 bg-[#2c2c2c] p-1 rounded-full space-x-0 text-sm ${
                                      comment.dislikedBy.includes(auth.currentUser?.uid || "")
                                        ? "text-yellow-500"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    <FaThumbsDown className="w-3 h-3" />
                                    <span>{formatNumberIntl(comment.dislikes)}</span> {/* Format the dislikes */}
                                  </button>
                                  {/* Tooltip for Dislike Button (Comment) */}
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
                                    Dislike Comment
                                  </div>
                                </div>
                              </div>

                              {/* Replies Section */}
                              <div className="flex flex-col">
                                <button
                                  onClick={() => toggleRepliesVisibility(post.id, index)} // Pass post.id and comment index to toggle
                                  className="text-sm text-gray-400 hover:text-yellow-500 text-left w-fit"
                                >
                                  {showReplies[post.id]?.[index] ? "Hide Replies" : "Show Replies"} ({comment.replies?.length || 0})
                                </button>

                                {showReplies[post.id]?.[index] && (
                                  <div className="ml-6 mt-4">
                                    {comment.replies && comment.replies.length > 0 ? (
                                      comment.replies.map((reply, replyIndex) => (
                                        <div key={replyIndex} className="flex items-start mb-2">
                                          <Link href={`/profile-view/${reply.userId}`}>
                                            <img
                                              src={userPhotos.get(reply.userId) || "https://via.placeholder.com/150"}
                                              alt="Reply User"
                                              className="w-6 h-6 rounded-full mr-2 cursor-pointer"
                                              onLoad={() => fetchUserPhoto(reply.userId)}
                                            />
                                          </Link>
                                          <div className="flex flex-col w-full">
                                            <div className="flex flex-row justify-between">
                                              <div>
                                                <p className="font-semibold text-white">
                                                  {usernames.get(reply.userId) || "Loading..."}
                                                </p>
                                                <p className="text-sm text-gray-400">
                                                  {reply.updatedAt ? (
                                                    <>
                                                      {formatTimestamp(reply.updatedAt)} <span className="text-sm text-gray-400">(edited)</span>
                                                    </>
                                                  ) : (
                                                    formatTimestamp(reply.createdAt)
                                                  )}
                                                </p>
                                              </div>

                                              {/* Only show edit and delete buttons for the current user's replies */}
                                              {auth.currentUser?.uid === reply.userId && (
                                                <div className="bg-[#2c2c2c] max-h-8 rounded-full px-2 py-1 flex items-center space-x-2">
                                                  {/* Update Button for Reply */}
                                                  <div className="relative group inline-flex items-center">
                                                    <button
                                                      onClick={() => handleUpdateReply(post.id, index, replyIndex)}
                                                      className="hover:text-yellow-500"
                                                    >
                                                      <FaEdit className="w-3 h-3" />
                                                    </button>
                                                    {/* Tooltip */}
                                                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
                                                      Update Reply
                                                    </div>
                                                  </div>
                                                  {/* Delete Button for Reply */}
                                                  <div className="relative group inline-flex items-center">
                                                    <button
                                                      onClick={() => handleDeleteReply(post.id, index, replyIndex)}
                                                      className="hover:text-yellow-500"
                                                    >
                                                      <FaTrash className="w-3 h-3" />
                                                    </button>
                                                    {/* Tooltip */}
                                                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
                                                      Delete Reply
                                                    </div>
                                                  </div>
                                                </div>
                                              )}
                                            </div>

                                            {/* Delete Reply Confirmation Modal */}
                                            {deleteReplyPrompt && (
                                              <div className="fixed inset-0 bg-[#484242] bg-opacity-60 flex items-center justify-center z-50">
                                                <div className="bg-[#2c2c2c] p-6 rounded-lg text-white text-center">
                                                  <p>Are you sure you want to delete this reply? This cannot be undone!</p>
                                                  <div className="mt-4 flex justify-center gap-4">
                                                    <button
                                                      onClick={async () => {
                                                        if (!replyToDelete) return;
                                                        const { postId, commentIndex, replyIndex } = replyToDelete;
                                                        await deleteReply(postId, commentIndex, replyIndex); // Delete the reply
                                                        setDeleteReplyPrompt(false); // Close the modal
                                                      }}
                                                      className="bg-yellow-500 text-black px-4 py-2 rounded"
                                                    >
                                                      Confirm
                                                    </button>
                                                    <button
                                                      onClick={() => setDeleteReplyPrompt(false)}
                                                      className="bg-gray-500 text-white px-4 py-2 rounded"
                                                    >
                                                      Cancel
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>
                                            )}

                                            {isEditingReply && (
                                              <div className="fixed inset-0 bg-[#484242] bg-opacity-60 flex items-center justify-center z-50">
                                                <div className="bg-[#383434] p-6 rounded-lg w-2/4 max-h-[90vh] overflow-y-auto">
                                                  <textarea
                                                    value={editContentReply}
                                                    onChange={(e) => setEditContentReply(e.target.value)}
                                                    className="w-full p-3 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none text-white bg-[#252323] resize-none"
                                                    rows={5}
                                                  />
                                                  <div className="mt-4 flex justify-end space-x-2">
                                                    <button
                                                      onClick={() => setIsEditingReply(false)}
                                                      className="bg-[#2c2c2c] text-white px-4 py-2 rounded-lg"
                                                    >
                                                      Cancel
                                                    </button>
                                                    <button
                                                      onClick={handleSaveReply}
                                                      className="bg-yellow-500 text-white px-4 py-2 rounded-lg"
                                                      disabled={isSaving} // Disable button while saving
                                                    >
                                                      {isSaving ? "Saving..." : "Save"} {/* Change text based on isSaving */}
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>
                                            )}

                                            <LinkIt component={renderLink} regex={urlRegex}>
                                              <p>{renderReplyText(filterBannedWords(reply.reply), reply.repliedToUserId ?? '')}</p>
                                            </LinkIt>

                                            <div className="flex gap-2 mt-2">
                                              {/* Like Button (Reply) */}
                                              <div className="relative group inline-flex items-center">
                                                <button
                                                  onClick={() => handleLikeReply(post.id, index, replyIndex)}
                                                  className={`flex items-center justify-between min-w-9 bg-[#2c2c2c] p-1 rounded-full space-x-0 text-sm ${
                                                    reply.likedBy?.includes(auth.currentUser?.uid || "")
                                                      ? "text-yellow-500"
                                                      : "text-gray-400"
                                                  }`}
                                                >
                                                  <FaThumbsUp className="w-3 h-3" />
                                                  <span>{formatNumberIntl(reply.likes)}</span>
                                                </button>
                                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
                                                  Like Reply
                                                </div>
                                              </div>
                                              {/* Dislike Button (Reply) */}
                                              <div className="relative group inline-flex items-center">
                                                <button
                                                  onClick={() => handleDislikeReply(post.id, index, replyIndex)}
                                                  className={`flex items-center justify-between min-w-9 bg-[#2c2c2c] p-1 rounded-full space-x-0 text-sm ${
                                                    reply.dislikedBy.includes(auth.currentUser?.uid || "")
                                                      ? "text-yellow-500"
                                                      : "text-gray-400"
                                                  }`}
                                                >
                                                  <FaThumbsDown className="w-3 h-3" />
                                                  <span>{formatNumberIntl(reply.dislikes)}</span>
                                                </button>
                                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
                                                  Dislike Reply
                                                </div>
                                              </div>

                                              {/* Add Username Reply Button */}
                                              <div className="relative group inline-flex items-center">
                                                <button
                                                  onClick={() => {
                                                    const usernameWithSpaces = usernames.get(reply.userId);
                                                    const usernameWithDashes = usernameWithSpaces?.replace(/ /g, "-"); // Replace spaces with dashes
                                                    setReplyText(`@${usernameWithDashes} `); // Pre-fill the reply input with @username
                                                    setRepliedToUserId(reply.userId);
                                                  }}
                                                  className="hover:text-yellow-500 text-sm text-gray-400"
                                                >
                                                  Reply
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-sm text-gray-400">No replies yet</p>
                                    )}

                                    {/* Input Field for Adding Reply */}
                                    <input
                                      type="text"
                                      placeholder={"Add a reply..."}
                                      className="ml-1 text-white w-full p-2 rounded-md bg-[#292626] focus:ring-2 focus:ring-yellow-500 outline-none mt-2"
                                      value={replyText} // Bind the value of the reply input
                                      onChange={(e) => setReplyText(e.target.value)} // Update the reply text as user types
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" && replyText.trim()) {
                                          handleAddReply(post.id, index, replyText, repliedToUserId || null); 
                                          setReplyText(''); // Clear the input after submission
                                        }
                                      }}
                                    />
                                  </div>
                                )}
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

export default PostViewPage;
