// app/admin-forum/page.tsx (Admin Forum Page)
'use client'; // Render page in client side
import Layout from '../../components/root/Layout';
import { useState, useEffect, useRef } from 'react'; 
import { getFirestore, collection, query, orderBy, onSnapshot, updateDoc, doc, increment, getDoc, deleteDoc, deleteField } from 'firebase/firestore';
import { app } from '../firebase/config';
import PostForum from '../../components/forum/PostForum';
import { formatDistanceToNow } from 'date-fns';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { FaThumbsUp, FaThumbsDown, FaTrash, FaEdit, FaBookmark, FaSearch, FaPlus, FaComment, FaEllipsisV, FaShare } from 'react-icons/fa'; 
import Link from 'next/link';
import useBannedWords from '../../components/forum/hooks/useBannedWords';
import { HiDocumentMagnifyingGlass } from "react-icons/hi2";
import { AiOutlineClose } from 'react-icons/ai';
import { LinkIt } from 'react-linkify-it';
import React from 'react';
import { useRouter } from 'next/navigation';

interface User {
    id: string;
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
      repliedToUserId?: string;
    }[];
  }[];
  likedBy: string[];
  dislikedBy: string[];
  bookmarks: {
    userId: string;
    bookmarkCreatedAt: any;
  }[];
}

const AdminForumPage = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const firestore = getFirestore(app);
  const router = useRouter();
  const auth = getAuth();
  const [userLikes, setUserLikes] = useState<Map<string, string>>(new Map()); 
  const [userPhotos, setUserPhotos] = useState<Map<string, string>>(new Map());
  const [usernames, setUsernames] = useState<Map<string, string>>(new Map());
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [isEditingPost, setIsEditingPost] = useState(false); 
  const [editContentPost, setEditContentPost] = useState(''); 
  const [editingCommentIndex, setEditingCommentIndex] = useState<number | null>(null); 
  const [isEditingComment, setIsEditingComment] = useState(false); 
  const [editContentComment, setEditContentComment] = useState(''); 
  const [showComments, setShowComments] = useState<{ [key: string]: boolean }>({});
  const [searchQuery, setSearchQuery] = useState(''); 
  const [isPostForumVisible, setIsPostForumVisible] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [editImageFile, setEditImageFile] = useState<File | null>(null); 
  const [editCurrentImageUrl, setEditCurrentImageUrl] = useState<string | null>(null); 
  const { bannedWords } = useBannedWords(); 
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]); 
  const [isSaving, setIsSaving] = useState<boolean>(false); 
  const [showMoreOptions, setShowMoreOptions] = useState<{ [postId: string]: boolean }>({});
  const [isExpanded, setIsExpanded] = useState<{ [postId: string]: boolean }>({});
  const [isTruncated, setIsTruncated] = useState<{ [postId: string]: boolean }>({});
  const contentRefs = useRef<{ [key: string]: HTMLParagraphElement | null }>({});
  const [notification, setNotification] = useState<string | null>(null);
  const [showReplies, setShowReplies] = useState<{ [postId: string]: { [commentIndex: number]: boolean } }>({});
  const [isEditingReply, setIsEditingReply] = useState(false);
  const [editContentReply, setEditContentReply] = useState("");
  const [editingReplyIndex, setEditingReplyIndex] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');  
  const [repliedToUserId, setRepliedToUserId] = useState<string | null>(null);
  const [sortMethod, setSortMethod] = useState<'latest' | 'popular'>('latest'); 
  const [deletePostPrompt, setDeletePostPrompt] = useState(false);
  const [postIdToDelete, setPostIdToDelete] = useState<string | null>(null);
  const [deleteCommentPrompt, setDeleteCommentPrompt] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<{ postId: string; commentIndex: number } | null>(null);
  const [deleteReplyPrompt, setDeleteReplyPrompt] = useState(false);
  const [replyToDelete, setReplyToDelete] = useState<{ postId: string, commentIndex: number, replyIndex: number } | null>(null);
  const [userDetails, setUserDetails] = useState(new Map());

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
    const postsQuery = query(collection(firestore, 'posts'), orderBy('createdAt', 'desc'));

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
    filteredPosts.forEach((post) => {
      fetchUserDetails(post.userId);
    });
  }, [filteredPosts]);

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

    return bannedWords.reduce((acc, word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      return acc.replace(regex, (match) => `(**${match}**)`);
    }, message);
  };

  const filterPosts = (postsData: Post[], method: 'latest' | 'popular' = sortMethod) => {
    let filtered = postsData;
  
    if (searchQuery.trim() !== "") {
      filtered = filtered.filter((post) =>
        post.message.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
  
    if (method === 'popular') {
      filtered = filtered.sort((a, b) => b.likes - a.likes);
    } else {
      filtered = filtered.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    }
  
    setFilteredPosts(filtered);
  };

  useEffect(() => {
    const postsQuery = query(collection(firestore, 'posts'), orderBy('createdAt', 'desc'));
  
    const unsubscribe = onSnapshot(postsQuery, (querySnapshot) => {
      const postsData: Post[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Post[];
  
      const filteredPostsData = postsData.map((post) => ({
        ...post,
        message: filterBannedWords(post.message),
      }));
  
      setPosts(filteredPostsData);
      filterPosts(filteredPostsData);
    });
  
    return () => unsubscribe();
  }, [bannedWords]);

  useEffect(() => {
    filterPosts(posts);
  }, [sortMethod, searchQuery, posts]);

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
      const likes = comment.likes || 0;
      const dislikes = comment.dislikes || 0;
  
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
        const updatedLikedBy = likedBy.includes(userId)
          ? likedBy.filter((id: string) => id !== userId)
          : [...likedBy, userId];
  
        comment.likedBy = updatedLikedBy;
        comment.likes = likedBy.includes(userId) ? likes - 1 : likes + 1;
      }
  
      comments[commentIndex] = comment;
  
      await updateDoc(postRef, {
        comments: comments,
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
      const likes = comment.likes || 0;
      const dislikes = comment.dislikes || 0;
  
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
        const updatedDislikedBy = dislikedBy.includes(userId)
          ? dislikedBy.filter((id: string) => id !== userId)
          : [...dislikedBy, userId];
  
        comment.dislikedBy = updatedDislikedBy;
        comment.dislikes = dislikedBy.includes(userId) ? dislikes - 1 : dislikes + 1;
      }
  
      comments[commentIndex] = comment;
  
      await updateDoc(postRef, {
        comments: comments,
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
      if (!reply) return;
  
      const likedBy = reply.likedBy || [];
      const dislikedBy = reply.dislikedBy || [];
      const likes = reply.likes || 0;
      const dislikes = reply.dislikes || 0;
  
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
        const updatedLikedBy = likedBy.includes(userId)
          ? likedBy.filter((id: string) => id !== userId)
          : [...likedBy, userId];
  
        reply.likedBy = updatedLikedBy;
        reply.likes = likedBy.includes(userId) ? likes - 1 : likes + 1;
      }
  
      comments[commentIndex] = comment;
  
      await updateDoc(postRef, {
        comments: comments,
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
      if (!reply) return;
  
      const likedBy = reply.likedBy || [];
      const dislikedBy = reply.dislikedBy || [];
      const likes = reply.likes || 0;
      const dislikes = reply.dislikes || 0;
  
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
        const updatedDislikedBy = dislikedBy.includes(userId)
          ? dislikedBy.filter((id: string) => id !== userId)
          : [...dislikedBy, userId];
  
        reply.dislikedBy = updatedDislikedBy;
        reply.dislikes = dislikedBy.includes(userId) ? dislikes - 1 : dislikes + 1;
      }
  
      comments[commentIndex] = comment;
  
      await updateDoc(postRef, {
        comments: comments,
      });
    }
  };  
  
  const handleAddComment = async (postId: string, comment: string) => {
    const userId = auth.currentUser?.uid;
  
    if (!userId || !comment.trim()) return;
  
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
      const postData = postDoc.data() as Post;
  
      const updatedComments = [
        ...postData.comments,
        {
          username, 
          comment, 
          createdAt: new Date(), 
          userId,
          likedBy: [],
          dislikedBy: [],
          likes: 0,
          dislikes: 0,
          replies: [],
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
        const profilePhoto = userData?.profilePhoto || '/placeholder.jpg';
        
        setUserPhotos((prev) => new Map(prev).set(userId, profilePhoto));
        return profilePhoto;
      }
    } catch (error) {
      console.error(`Failed to fetch user photo for userId: ${userId}`, error);
    }
  
    return '/placeholder.jpg';
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

  const handleDeleteComment = (postId: string, commentIndex: number) => {
    setCommentToDelete({ postId, commentIndex });
    setDeleteCommentPrompt(true);
  };

  const deleteComment = async (postId: string, commentIndex: number) => {
    try {
      const postRef = doc(firestore, 'posts', postId);
      const postDoc = await getDoc(postRef);

      if (postDoc.exists()) {
        const postData = postDoc.data() as Post;
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
      const userRef = doc(firestore, "users", userId);
      const userDoc = await getDoc(userRef); 
      return userDoc.exists() ? (userDoc.data()?.username as string) : "Unknown User";
    } catch (error) {
      console.error("Error fetching username:", error);
      return "Unknown User";
    }
  };

  useEffect(() => {
    const fetchUsernames = async () => {
      const updatedUsernames = new Map(usernames);
      const userIds = new Set<string>();
  
      posts.forEach(post => {
        userIds.add(post.userId);
  
        post.comments.forEach(comment => {
          userIds.add(comment.userId);
          comment.replies?.forEach(reply => {
            userIds.add(reply.userId);
          });
        });
      });
  
      for (const userId of userIds) {
        if (!updatedUsernames.has(userId)) {
          const username = await getUsernameFromDatabase(userId);
          updatedUsernames.set(userId, username);
        }
      }

      setUsernames(updatedUsernames);
    };
  
    fetchUsernames();
  }, [posts]);

  const getUserRole = async (userId: string) => {
    const userRef = doc(firestore, "users", userId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData?.role;
    }
    return null;
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

  const handleUpdateComment = (postId: string, commentIndex: number) => {
    const postToEdit = posts.find(post => post.id === postId);
    if (postToEdit) {
      const commentToEdit = postToEdit.comments[commentIndex];
      if (commentToEdit) {
        setEditingPostId(postId);
        setEditingCommentIndex(commentIndex);
        setEditContentComment(commentToEdit.comment);
        setIsEditingComment(true);
      }
    }
  };
  
  const handleSaveComment = async () => {
    if (editingPostId === null || editingCommentIndex === null) return;
  
    setIsSaving(true);
  
    const userId = auth.currentUser?.uid;
    if (!userId) return;
  
    try {
      const userRole = await getUserRole(userId);
      const isAdmin = userRole === 'admin';
      const postRef = doc(firestore, 'posts', editingPostId);
      const postToUpdate = await getDoc(postRef);
      const postData = postToUpdate.data() as Post;
      const commentToUpdate = postData.comments[editingCommentIndex];
  
      postData.comments[editingCommentIndex] = {
        ...commentToUpdate,
        comment: editContentComment,
        updatedAt: new Date(),
        ...(isAdmin && {
          adminUpdatedBy: userId,
          adminUpdatedAt: new Date(),
        }),
      };
  
      await updateDoc(postRef, {
        comments: postData.comments,
      });
  
      setIsEditingComment(false);
      setEditContentComment('');
      setEditingPostId(null);
      setEditingCommentIndex(null);
    } catch (error) {
      console.error("Error saving comment:", error);
    } finally {
      setIsSaving(false);
    }
  };  

  const handleUpdateReply = (postId: string, commentIndex: number, replyIndex: number) => {
    const postToEdit = posts.find(post => post.id === postId);
    if (postToEdit) {
      const commentToEdit = postToEdit.comments[commentIndex];
      const replyToEdit = commentToEdit.replies?.[replyIndex];
      if (replyToEdit) {
        setEditingPostId(postId);
        setEditingCommentIndex(commentIndex);
        setEditingReplyIndex(replyIndex);
        setEditContentReply(replyToEdit.reply);
        setIsEditingReply(true);
      }
    }
  };
  
  const handleSaveReply = async () => {
    if (editingPostId === null || editingCommentIndex === null || editingReplyIndex === null) return;
  
    setIsSaving(true);
  
    const userId = auth.currentUser?.uid;
    if (!userId) return;
  
    try {
      const userRole = await getUserRole(userId);
      const isAdmin = userRole === 'admin';
      const postRef = doc(firestore, 'posts', editingPostId);
      const postToUpdate = await getDoc(postRef);
      const postData = postToUpdate.data() as Post;
      const commentToUpdate = postData.comments[editingCommentIndex];
      const replyToUpdate = commentToUpdate.replies?.[editingReplyIndex];
  
      if (replyToUpdate) {
        postData.comments[editingCommentIndex].replies[editingReplyIndex] = {
          ...replyToUpdate,
          reply: editContentReply,
          updatedAt: new Date(),
          ...(isAdmin && {
            adminUpdatedBy: userId,
            adminUpdatedAt: new Date(),
          }),
        };
  
        await updateDoc(postRef, {
          comments: postData.comments,
        });
  
        setIsEditingReply(false);
        setEditContentReply('');
        setEditingPostId(null);
        setEditingCommentIndex(null);
        setEditingReplyIndex(null);
      }
    } catch (error) {
      console.error("Error saving reply:", error);
    } finally {
      setIsSaving(false);
    }
  };  

  const handleAddReply = async (postId: string, commentIndex: number, reply: string, repliedToUserId: string | null) => {
    const userId = auth.currentUser?.uid;
    if (!userId || !reply.trim()) return;

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
      const postData = postDoc.data() as Post;
  
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
                username,
                likedBy: [],
                dislikedBy: [],
                likes: 0,
                dislikes: 0,
                repliedToUserId: repliedToUserId,
              }
            ],
          };
        }
        return comment;
      });
  
      await updateDoc(postRef, {
        comments: updatedComments,
      });
    }
  };

  const handleDeleteReply = (postId: string, commentIndex: number, replyIndex: number) => {
    setReplyToDelete({ postId, commentIndex, replyIndex });
    setDeleteReplyPrompt(true);
  };

  const deleteReply = async (postId: string, commentIndex: number, replyIndex: number) => {
    try {
      const postRef = doc(firestore, 'posts', postId);
      const postDoc = await getDoc(postRef);

      if (postDoc.exists()) {
        const postData = postDoc.data() as Post;

        const updatedComments = postData.comments.map((comment, cIndex) => {
          if (cIndex === commentIndex) {
            return {
              ...comment,
              replies: comment.replies.filter((_, rIndex) => rIndex !== replyIndex),
            };
          }
          return comment;
        });

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

  const renderReplyText = (text: string, userId: string) => {
    const regex = /@([a-zA-Z0-9._-]+)/g;
    
    return text.split(regex).map((part, index) => {
      if (index % 2 === 1) {
        return (
          <Link key={index} href={`/profile-view/${userId}`} className="text-blue-500 hover:text-yellow-500">
            @{part}
          </Link>
        );
      }
      return part;
    });
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

  const togglePostForum = () => {
    setIsPostForumVisible((prevState) => !prevState);
  };

  const toggleSearch = () => {
    setIsSearchVisible((prevState) => !prevState);
  };

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

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return (
    <Layout>
        <div className="flex flex-col">
            {isSearchVisible && (
                <div className="flex items-center w-8/12 mx-auto mt-4 gap-4">
                <input
                    type="text"
                    placeholder="Search posts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 p-2 bg-[#2c2c2c] text-white rounded-md focus:ring-2 focus:ring-yellow-500 outline-none"
                />
                <select
                    value={sortMethod}
                    onChange={(e) => {
                    const selectedSort = e.target.value as 'latest' | 'popular';
                    setSortMethod(selectedSort);
                    filterPosts(posts, selectedSort);
                    }}
                    className="p-2 bg-[#2c2c2c] text-white rounded-md focus:ring-2 focus:ring-yellow-500 outline-none"
                >
                    <option value="latest">Latest</option>
                    <option value="popular">Popular</option>
                </select>
                </div>
            )}

            {/* Posts Section with Title and Divider */}
            <div className="mt-6 w-8/12 mx-auto flex justify-between items-center border-b-2 border-white pb-2 mb-4">
                <div>
                  {/* Posts Text with Border */}
                  <p className="text-white text-xl">Posts (Admin Mode)</p>
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
                    <div className="absolute bottom-full mt-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
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
                    <div className="absolute bottom-full mt-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
                    Search Posts
                    </div>
                </div>
                </div>
            </div>

            {/* Conditionally show Post Forum */}
            {isPostForumVisible && (
                <div className="w-10/12 mx-auto">
                <PostForum />
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
                              <span>{usernames.get(post.userId) || "Loading..."}</span>
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
                        <div
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
                              {post.message}
                            </LinkIt>
                        </div>

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
                                  {isSaving ? "Saving..." : "Save"}
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
                            <span>{formatNumberIntl(post.likes)}</span>
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
                            <span>{formatNumberIntl(post.dislikes)}</span>
                            </button>
                            {/* Tooltip for Dislike Button */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
                            Dislike Post
                            </div>
                        </div>

                        {/* Comment Button with Tooltip (Show/Hide Comments with Counter) */}
                        <button
                            onClick={() =>
                            setShowComments((prevState) => ({
                                ...prevState,
                                [post.id]: !prevState[post.id],
                            }))
                            }
                            className={`relative group flex items-center justify-between bg-[#2c2c2c] p-2 rounded-full space-x-2 ml-auto ${showComments[post.id] ? 'text-yellow-500' : 'text-gray-400'}`}
                        >
                            <FaComment className="w-4 h-4" />
                            <span>{formatNumberIntl(post.comments.length)}</span>

                            {/* Tooltip for Show Comments */}
                            <div
                            className={`absolute bottom-full left-4 transform -translate-x-1/2 p-1 bg-[#2c2c2c] text-white text-xs rounded-md whitespace-nowrap ${
                                !showComments[post.id] ? 'hidden group-hover:block' : 'hidden'
                            }`}
                            >
                            Show Comments
                            </div>

                            {/* Tooltip for Hide Comments */}
                            <div
                            className={`absolute bottom-full left-4 transform -translate-x-1/2 p-1 bg-[#2c2c2c] text-white text-xs rounded-md whitespace-nowrap ${
                                showComments[post.id] ? 'hidden group-hover:block' : 'hidden'
                            }`}
                            >
                            Hide Comments
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

                        {showComments[post.id] && (
                        <div className="comments-section ml-2">
                            <div className="text-white">
                            {Array.isArray(post.comments) && post.comments.length > 0 ? (
                                post.comments.map((comment, index) => (
                                <div key={index} className="flex items-start mb-3">
                                    <Link href={`/profile-view/${comment.userId}`}>
                                    <img
                                        src={
                                        userPhotos.get(comment.userId) || "/placeholder.jpg"
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
                                            {/* Check if the comment user is the post creator */}
                                            {comment.userId === post.userId && (
                                              <span className="ml-2 text-xs bg-yellow-500 text-black px-2 py-1 rounded-md">
                                                Post Creator
                                              </span>
                                            )}
                                            {/* Add Admin and NCII text */}
                                            {userDetails.get(comment.userId)?.role === "admin" && (
                                              <span className="ml-2 text-xs text-red-500 font-bold">Admin</span>
                                            )}
                                            {userDetails.get(comment.userId)?.isNCIIHolder && (
                                              <span className="ml-2 text-xs text-yellow-500 font-bold">NCII</span>
                                            )}
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
                                                className="text-red-500 hover:text-red-600"
                                            >
                                                <FaTrash className="w-3 h-3" />
                                            </button>

                                            {/* Tooltip */}
                                            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
                                                Delete Comment
                                            </div>
                                            </div>
                                        </div>
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
                                                await deleteComment(postId, commentIndex);
                                                setDeleteCommentPrompt(false);
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
                                        <div className="fixed inset-0 bg-[#484242] bg-opacity-60 flex items-center justify-center z-50">
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
                                                disabled={isSaving}
                                            >
                                                {isSaving ? "Saving..." : "Save"}
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
                                            <span>{formatNumberIntl(comment.likes)}</span>
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
                                            <span>{formatNumberIntl(comment.dislikes)}</span>
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
                                        onClick={() => toggleRepliesVisibility(post.id, index)}
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
                                                    src={userPhotos.get(reply.userId) || "/placeholder.jpg"}
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
                                                          {/* Check if the reply user is the post creator */}
                                                          {reply.userId === post.userId && (
                                                            <span className="ml-2 text-xs bg-yellow-500 text-black px-2 py-1 rounded-md">
                                                              Post Creator
                                                            </span>
                                                          )}
                                                          {/* Add Admin and NCII text */}
                                                          {userDetails.get(reply.userId)?.role === "admin" && (
                                                            <span className="ml-2 text-xs text-red-500 font-bold">Admin</span>
                                                          )}
                                                          {userDetails.get(reply.userId)?.isNCIIHolder && (
                                                            <span className="ml-2 text-xs text-yellow-500 font-bold">NCII</span>
                                                          )}
                                                        </p>
                                                        <p className="text-sm text-gray-400">
                                                          {reply.updatedAt ? (
                                                            <>
                                                              {formatTimestamp(reply.updatedAt)}{" "}
                                                              <span className="text-sm text-gray-400">(edited)</span>
                                                            </>
                                                          ) : (
                                                            formatTimestamp(reply.createdAt)
                                                          )}
                                                        </p>
                                                      </div>

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
                                                                className="text-red-500 hover:text-red-600"
                                                                >
                                                                <FaTrash className="w-3 h-3" />
                                                                </button>
                                                                {/* Tooltip */}
                                                                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
                                                                Delete Reply
                                                                </div>
                                                            </div>
                                                        </div>
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
                                                                await deleteReply(postId, commentIndex, replyIndex);
                                                                setDeleteReplyPrompt(false);
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
                                                            disabled={isSaving}
                                                            >
                                                            {isSaving ? "Saving..." : "Save"}
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
                                                            const usernameWithDashes = usernameWithSpaces?.replace(/ /g, "-");
                                                            setReplyText(`@${usernameWithDashes} `);
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
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && replyText.trim()) {
                                                handleAddReply(post.id, index, replyText, repliedToUserId || null); 
                                                setReplyText('');
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

export default AdminForumPage;
