// app/forum/[id]/page.tsx (Forum View Page)
'use client';
import Layout from '../../../components/root/Layout'; 
import { useState, useEffect, useRef } from 'react';
import { documentId, getFirestore, collection, query, orderBy, onSnapshot, updateDoc, doc, increment, getDoc, deleteDoc, where, deleteField } from 'firebase/firestore';
import { app } from '../../firebase/config'; 
import { formatDistanceToNow } from 'date-fns'; 
import { getAuth } from 'firebase/auth';
import { FaThumbsUp, FaThumbsDown, FaTrash, FaEdit, FaBookmark, FaComment, FaEllipsisV, FaShare } from 'react-icons/fa'; 
import Link from 'next/link';
import useBannedWords from '../../../components/forum/hooks/useBannedWords';
import { useParams } from 'next/navigation'; 
import React from 'react'; 
import { HiDocumentMagnifyingGlass } from "react-icons/hi2";
import { IoMdCloseCircleOutline } from "react-icons/io";
import { AiOutlineClose } from 'react-icons/ai'; 
import { LinkIt } from 'react-linkify-it';
import PostMediaCarousel from '../../../components/forum/ui/PostMediaCarousel';

interface Post {
  id: string;
  userId: string;
  message: string;
  imageUrl: string | null;
  videoUrl?: string | null;
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

const ForumViewPage = () => {
  const { id } = useParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const firestore = getFirestore(app);
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
  const [hideComments, setHideComments] = useState<{ [key: string]: boolean }>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null); 
  const [editImageFile, setEditImageFile] = useState<File | null>(null); 
  const [editCurrentImageUrl, setEditCurrentImageUrl] = useState<string | null>(null); 
  const [editCurrentVideoUrl, setEditCurrentVideoUrl] = useState<string | null>(null);
  const [editVideoFile, setEditVideoFile] = useState<File | null>(null);
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
  const [deletePostPrompt, setDeletePostPrompt] = useState(false);
  const [postIdToDelete, setPostIdToDelete] = useState<string | null>(null);
  const [deleteCommentPrompt, setDeleteCommentPrompt] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<{ postId: string; commentIndex: number } | null>(null);
  const [deleteReplyPrompt, setDeleteReplyPrompt] = useState(false);
  const [replyToDelete, setReplyToDelete] = useState<{ postId: string, commentIndex: number, replyIndex: number } | null>(null);
  const [userDetails, setUserDetails] = useState(new Map());
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  
  useEffect(() => {

    if (!id || Array.isArray(id)) return; 
  
    const postsQuery = query(
      collection(firestore, 'posts'),
      where(documentId(), "==", id), 
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
      where(documentId(), "==", id), 
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
  }, [bannedWords, id]); 

  useEffect(() => {
    filteredPosts.forEach((post) => {
      fetchUserDetails(post.userId);
    });
  }, [filteredPosts]);

  const fetchUserDetails = async (userId: string): Promise<void> => {
    if (userDetails.has(userId)) return;
  
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
    const user = auth.currentUser;
    if (user) {
      setCurrentUserId(user.uid); 
    }
  }, []);

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
  
      console.log("Sending notification...");
  
      const postCreatorId = postData.userId;
      if (postCreatorId !== userId) {
        try {
          const response = await fetch("/api/notifications", {
            method: "POST",
            body: JSON.stringify({
              postId,
              comment,
              commentUserId: userId,
              commentUsername: username,
            }),
            headers: {
              "Content-Type": "application/json",
            },
          });
  
          if (!response.ok) {
            console.error("Failed to send notification");
          } else {
            console.log("Notification sent!");
          }
        } catch (error) {
          console.error("Error while sending notification:", error);
        }
      }
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

  const handleUpdatePost = (postId: string) => {
    const postToEdit = posts.find((post) => post.id === postId);
    if (postToEdit) {
      setEditingPostId(postId);
      setEditContentPost(postToEdit.message);
      setEditCurrentImageUrl(postToEdit.imageUrl);
      setEditCurrentVideoUrl(postToEdit.videoUrl ?? null);
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
      let videoUrl = editCurrentVideoUrl;
  
      // Handle image upload
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
  
      // Handle video upload
      if (editVideoFile) {
        const formData = new FormData();
        formData.append('file', editVideoFile);
        formData.append('upload_preset', 'post-video-upload');
  
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload`,
          {
            method: 'POST',
            body: formData,
          }
        );
  
        if (!res.ok) {
          throw new Error('Video upload failed');
        }
  
        const data = await res.json();
        videoUrl = data.secure_url;
      }
  
      // Remove image or video if not replaced
      if (!editImageFile && !editCurrentImageUrl) {
        imageUrl = null;
      }
      if (!editVideoFile && !editCurrentVideoUrl) {
        videoUrl = null;
      }
  
      // Update the post in Firestore
      const postRef = doc(firestore, 'posts', editingPostId);
      await updateDoc(postRef, {
        message: editContentPost,
        ...(imageUrl === null ? { imageUrl: deleteField() } : { imageUrl }),
        ...(videoUrl === null ? { videoUrl: deleteField() } : { videoUrl }),
        updatedAt: new Date(),
      });
  
      // Reset state
      setIsEditingPost(false);
      setEditContentPost('');
      setEditingPostId(null);
      setEditImageFile(null);
      setEditVideoFile(null);
      setEditCurrentImageUrl(null);
      setEditCurrentVideoUrl(null);
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

    const postRef = doc(firestore, 'posts', editingPostId);
    const postToUpdate = await getDoc(postRef);
    const postData = postToUpdate.data() as Post;

    
    const commentToUpdate = postData.comments[editingCommentIndex];

    
    postData.comments[editingCommentIndex] = {
      ...commentToUpdate,
      comment: editContentComment,
      updatedAt: new Date(),
    };

    
    try {
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
  
        const replyContent = replyToEdit.reply;
        const regex = /(@[a-zA-Z0-9._-]+)/;
        const match = replyContent.match(regex);
        const userName = match ? match[0] : "";
        const content = replyContent.replace(userName, "");
  
        setEditContentReply(content);
        setRepliedToUserId(userName);
        setIsEditingReply(true);
      }
    }
  };
  
  const handleSaveReply = async () => {
    if (editingPostId === null || editingCommentIndex === null || editingReplyIndex === null) return;
  
    setIsSaving(true);
  
    const userId = auth.currentUser?.uid;
    if (!userId) return;
  
    const postRef = doc(firestore, 'posts', editingPostId);
    const postToUpdate = await getDoc(postRef);
    const postData = postToUpdate.data() as Post;
  
    const commentToUpdate = postData.comments[editingCommentIndex];
    const replyToUpdate = commentToUpdate.replies?.[editingReplyIndex];
  
    if (replyToUpdate) {
      const finalReply = repliedToUserId + ' ' + editContentReply;
      postData.comments[editingCommentIndex].replies[editingReplyIndex] = {
        ...replyToUpdate,
        reply: finalReply,
        updatedAt: new Date(),
      };
  
      try {
        await updateDoc(postRef, {
          comments: postData.comments,
        });
  
        setIsEditingReply(false);
        setEditContentReply('');
        setEditingPostId(null);
        setEditingCommentIndex(null);
        setEditingReplyIndex(null);
      } catch (error) {
        console.error("Error saving reply:", error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleAddReply = async (
    postId: string,
    commentIndex: number,
    reply: string,
    repliedToUserId: string | null
  ) => {
    const userId = auth.currentUser?.uid;
    if (!userId || !reply.trim()) return;
  
    const userRef = doc(firestore, "users", userId);
    const userDoc = await getDoc(userRef);
  
    if (!userDoc.exists()) {
      console.error("User not found in Firestore");
      return;
    }
  
    const userData = userDoc.data();
    const username = userData?.username || "Anonymous";
  
    const postRef = doc(firestore, "posts", postId);
    const postDoc = await getDoc(postRef);
  
    if (!postDoc.exists()) {
      console.error("Post does not exist.");
      return;
    }
  
    const postData = postDoc.data() as Post;
  
    // Get the original comment creator's ID
    const commentCreatorId = postData.comments[commentIndex]?.userId || null;
  
    console.log("Original comment creator ID:", commentCreatorId);
  
    // Handle the reply logic: you only notify if repliedToUserId is not null
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
              repliedToUserId,  // Only set if it was a reply to someone
            },
          ],
        };
      }
      return comment;
    });
  
    await updateDoc(postRef, { comments: updatedComments });
  
    try {
      const response = await fetch("/api/notifications-reply", {
        method: "POST",
        body: JSON.stringify({
          postId,
          reply,
          replyUserId: userId,
          replyUsername: username,
          commentCreatorId,
          repliedToUserId,  // Pass the actual user ID for notification
        }),
        headers: { "Content-Type": "application/json" },
      });
  
      if (!response.ok) {
        console.error("Failed to send reply notification");
      } else {
        console.log("Reply notification sent!");
      }
    } catch (error) {
      console.error("Error while sending reply notification:", error);
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

  const renderReplyText = (text: string, userId: string | null) => {
    const regex = /@([a-zA-Z0-9._-]+)/g;
    let isFirstMention = true;
    
    return text.split(regex).map((part, index) => {
      if (index % 2 === 1) {
        if (isFirstMention) {
          if (userId) {
            isFirstMention = false;
            return (
              <Link key={index} href={`/profile-view/${userId}`} className="text-blue-500 hover:text-yellow-500">
                @{part}
              </Link>
            );
          }
        }
        return `@${part}`; 
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
    
    const url = `${window.location.origin}/forum/${postId}`;
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

        {/* Posts Section with Title and Divider */}
        <div className="mt-6 w-9/12 mx-auto flex justify-between items-center border-b-2 border-white pb-2 mb-4">
          <div>
            {/* Posts Text with Border */}
            <p className="text-xs | sm:text-xl | text-white">Posts</p>
          </div>
        </div>

        {/* Contains the Posts and Comments Sections*/}
        <div>
          <div className="p-2 w-10/12 mx-auto">
            {filteredPosts.length === 0 ? (
              <p className="text-center text-white w-full">There are no posts matching your search query.</p>
            ) : (
              filteredPosts.map((post) => (
                <div key={post.id} className="pt-6 rounded-lg mb-10 w-11/12 mx-auto mt-2 bg-[#383838] p-6">
                  <div className="flex items-center justify-between mb-4">
                    {/* Left Section: Image, Username, and Timestamp */}
                    <div className="flex flex-row items-center">
                      <div className="relative group inline-flex items-center">
                      <Link href={`/profile-view/${post.userId}`} className="relative">
                        {/* Profile Image */}
                        <img
                          src={userPhotos.get(post.userId) || '/placeholder.jpg'}
                          alt="Profile"
                          className="w-6 h-6 | sm:w-12 sm:h-12 sm:mr-2 | rounded-full cursor-pointer transition-opacity duration-300"
                          onLoad={() => fetchUserPhoto(post.userId)}
                        />
                        
                        {/* Yellow Tint Overlay */}
                        <div className="absolute inset-0 | w-6 h-6 | sm:w-12 sm:h-12 sm:mr-2 | rounded-full bg-yellow-500 opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
                      </Link>

                        {/* Tooltip for View User's Profile */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
                          View User's Profile
                        </div>
                      </div>
                    
                      <div className="ml-1">
                        <p className="space-x-1 | sm:space-x-2 | font-semibold text-white flex items-center">
                          <span className="text-[10px] | sm:text-base sm:max-w-none | truncate max-w-[70px]">{usernames.get(post.userId) || "Loading..."}</span>
                          {/* Display Role and NCII */}
                          {userDetails.get(post.userId)?.role === "admin" && (
                            <span className="hidden | sm:block sm:text-sm | text-red-500 font-bold">
                              Admin
                            </span>
                          )}
                          {userDetails.get(post.userId)?.isNCIIHolder && (
                            <span className="hidden | sm:block sm:text-sm | text-yellow-500 font-bold">
                              NCII
                            </span>
                          )}
                        </p>

                        <p className="text-[6px] | sm:text-sm | text-gray-400">
                          {post.updatedAt ? (
                            <>
                              {formatTimestamp(post.updatedAt)}{" "}
                              <span className="text-[6px] | sm:text-sm | text-gray-400">(edited)</span>
                            </>
                          ) : (
                            formatTimestamp(post.createdAt)
                          )}
                        </p>
                      </div>
                    </div>
    
                    {/* Right Section: View Post, Bookmark, and More Options */}
                    <div className="ml-1 text-[10px] space-x-1 p-1 max-h-6 | sm:ml-0 sm:text-base sm:space-x-4 sm:p-2 sm:max-h-10 | bg-[#2c2c2c] rounded-full flex">
                      {/* View Post Button */}
                      <div className="sm:mt-1 | relative group inline-flex items-center">
                        <Link href={`/forum/${post.id}`}>
                          <button className="text-white hover:text-yellow-500">
                            <HiDocumentMagnifyingGlass/>
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
                          <FaBookmark/>
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
                            <FaEllipsisV/>
                          </button>

                          {/* Tooltip for More Options */}
                          <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
                            More Options
                          </div>

                          {showMoreOptions[post.id] && (
                            <div className="mt-4 -right-3 | sm:mt-6 | absolute top-full bg-[#2c2c2c] text-white rounded-md shadow-lg z-40">
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
                                <FaEdit  className="mr-2"/>
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
                                <FaTrash  className="mr-2"/>
                                <span className="whitespace-nowrap">Delete Post</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Delete Confirmation Modal */}
                  {deletePostPrompt && (
                    <div className="fixed inset-0 bg-[#484848] bg-opacity-40 flex items-center justify-center z-50">
                      <div className="w-10/12 text-xs | sm:w-auto sm:text-base | bg-[#2c2c2c] p-6 rounded-lg text-white text-center">
                        <p>Are you sure you want to delete this post? This cannot be undone!</p>
                        <div className="mt-4 flex justify-between gap-4">
                          <button
                            onClick={async () => {
                              if (!postIdToDelete) return;
                              await deletePost(postIdToDelete);
                              setDeletePostPrompt(false); 
                            }}
                            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
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
                      className={`text-xs | sm:text-lg | text-white ${isExpanded[post.id] ? 'line-clamp-none' : 'line-clamp-2'}`}
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
                    </p>

                    {/* Show "See more" if the message is truncated and not expanded */}
                    {isTruncated[post.id] && !isExpanded[post.id] && (
                      <button
                        onClick={() => toggleMessage(post.id)}
                        className="text-xs | sm:text-lg | text-white cursor-pointer underline hover:text-yellow-500"
                      >
                        See more
                      </button>
                    )}

                    {/* Show "See less" when the message is expanded */}
                    {isExpanded[post.id] && (
                      <button
                        onClick={() => toggleMessage(post.id)}
                        className="text-xs | sm:text-lg | text-white cursor-pointer underline hover:text-yellow-500"
                      >
                        See less
                      </button>
                    )}
                  </div>

                  {isEditingPost && (
                    <div className="fixed inset-0 bg-[#484848] bg-opacity-40 flex items-center justify-center z-50">
                      <div className="w-10/12 text-xs | sm:w-3/4 sm:text-base | bg-[#383838] p-6 rounded-lg max-h-[90vh] overflow-y-auto">
                        {/* Textarea for Editing Content */}
                        <textarea
                          value={editContentPost}
                          onChange={(e) => setEditContentPost(e.target.value)}
                          className="w-full p-3 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none text-white bg-[#2c2c2c] resize-none"
                          rows={5}
                          placeholder="Edit your post..."
                        />

                        {/* Image Section */}
                        <h2 className="text-white font-semibold mt-4">Image</h2>

                        {/* Current Image Preview */}
                        {editCurrentImageUrl && (
                          <div className="mt-4 relative">
                            <p className="text-white font-semibold">Current Image:</p>
                            <div className="relative">
                              <img
                                src={editCurrentImageUrl}
                                alt="Current Post Image"
                                className="w-full | h-[150px] | sm:h-[450px] | object-cover rounded-lg mt-2"
                              />
                              {/* Remove Image Button */}
                              <button
                                onClick={() => setEditCurrentImageUrl(null)}
                                className="absolute top-2 right-2 bg-[#2c2c2c] text-white rounded-full p-1 hover:bg-yellow-500"
                              >
                                <AiOutlineClose />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* New Image Preview */}
                        {editImageFile && (
                          <div className="mt-4 relative">
                            <p className="text-white font-semibold">New Image Preview:</p>
                            <div className="relative">
                              <img
                                src={URL.createObjectURL(editImageFile)}
                                alt="Selected Image Preview"
                                className="w-full | h-[150px] | sm:h-[450px] | object-cover rounded-lg mt-2"
                              />
                              {/* Remove New Image Button */}
                              <button
                                onClick={() => setEditImageFile(null)}
                                className="absolute top-2 right-2 bg-[#2c2c2c] text-white rounded-full p-1 hover:bg-yellow-500"
                              >
                                <AiOutlineClose />
                              </button>
                            </div>
                          </div>
                        )}

                        <h2 className="text-white  mt-3">Select an Image to Change (Optional):</h2>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setEditImageFile(e.target.files[0]);
                            }
                          }}
                          className="mt-2 text-white bg-[#2c2c2c] outline-none focus:ring-2 focus:ring-yellow-500 rounded w-full p-2"
                        />

                        {/* Video Section */}
                        <h2 className="text-white font-semibold mt-6">Video</h2>

                        {/* Current Video Preview */}
                        {editCurrentVideoUrl && (
                          <div className="mt-4 relative">
                            <p className="text-white font-semibold">Current Video:</p>
                            <div className="relative">
                              <video
                                src={editCurrentVideoUrl}
                                controls
                                className="w-full | h-[150px] | sm:h-[450px] | object-cover rounded-lg mt-2"
                              />
                              {/* Remove Video Button */}
                              <button
                                onClick={() => setEditCurrentVideoUrl(null)}
                                className="absolute top-2 right-2 bg-[#2c2c2c] text-white rounded-full p-1 hover:bg-yellow-500"
                              >
                                <AiOutlineClose />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* New Video Preview */}
                        {editVideoFile && (
                          <div className="mt-4 relative">
                            <p className="text-white font-semibold">New Video Preview:</p>
                            <div className="relative">
                              <video
                                src={URL.createObjectURL(editVideoFile)}
                                controls
                                className="w-full | h-[150px] | sm:h-[450px] | object-cover rounded-lg mt-2"
                              />
                              {/* Remove New Video Button */}
                              <button
                                onClick={() => setEditVideoFile(null)}
                                className="absolute top-2 right-2 bg-[#2c2c2c] text-white rounded-full p-1 hover:bg-yellow-500"
                              >
                                <AiOutlineClose />
                              </button>
                            </div>
                          </div>
                        )}

                        <h2 className="text-white  mt-3">Select a Video to Change (Optional):</h2>
                        <input
                          type="file"
                          accept="video/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setEditVideoFile(e.target.files[0]);
                            }
                          }}
                          className="mt-2 text-white bg-[#2c2c2c] outline-none focus:ring-2 focus:ring-yellow-500 rounded w-full p-2"
                        />

                        {/* Buttons */}
                        <div className="mt-4 flex justify-between">
                          <button
                            onClick={() => {
                              setIsEditingPost(false);
                              setEditImageFile(null);
                              setEditVideoFile(null);
                            }}
                            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSavePost}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg"
                            disabled={isSaving}
                          >
                            {isSaving ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Image and Video Display Carousel */}
                  <div className="mb-2">
                    <PostMediaCarousel
                      imageUrl={post.imageUrl ?? undefined}
                      videoUrl={post.videoUrl ?? undefined}
                      onImageClick={() => {
                        if (post.imageUrl) {
                          setSelectedImageUrl(post.imageUrl);
                          setIsImageModalOpen(true);
                        }
                      }}
                    />
                  </div>

                  {/* Modal for Enlarged Image */}
                  {isImageModalOpen && selectedImageUrl && (
                    <div className="fixed inset-0 z-40 flex items-center justify-center">
                      {/* Background Overlay */}
                      <div className="absolute inset-0 bg-[#2c2c2c]"></div>
                      
                      <div className="relative z-30 max-w-full max-h-full flex justify-center items-center">
                        {/* Close Button */}
                        <button
                          onClick={() => setIsImageModalOpen(false)}
                          className="absolute top-16 right-4 text-yellow-500 text-5xl hover:text-yellow-600"
                        >
                          <IoMdCloseCircleOutline />
                        </button>
                        
                        {/* Enlarged Image */}
                        <img
                          src={selectedImageUrl}
                          alt="Enlarged View"
                          className="max-w-full rounded-lg mt-14"
                          style={{ height: 'calc(100vh - 6rem)' }}
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="text-[10px] gap-2 | sm:text-base | flex mb-4 items-center">
                    {/* Like Button with Tooltip */}
                    <div className="relative group inline-flex items-center">
                      <button
                        onClick={() => handleLike(post.id)}
                        className={`flex items-center justify-between bg-[#2c2c2c] p-2 rounded-full space-x-2 hover:text-yellow-500 ${userLikes.get(post.id) === 'like' ? 'text-yellow-500' : 'text-gray-400'}`}
                      >
                        <FaThumbsUp/>
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
                        className={`flex items-center justify-between bg-[#2c2c2c] p-2 rounded-full space-x-2 hover:text-yellow-500 ${userLikes.get(post.id) === 'dislike' ? 'text-yellow-500' : 'text-gray-400'}`}
                      >
                        <FaThumbsDown/>
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
                        setHideComments((prevState) => ({
                          ...prevState,
                          [post.id]: !prevState[post.id], 
                        }))
                      }
                      className={`relative group flex items-center justify-between bg-[#2c2c2c] p-2 rounded-full space-x-2 ml-auto hover:text-yellow-500 ${!hideComments[post.id] ? 'text-yellow-500' : 'text-gray-400'}`}
                    >
                      <FaComment/>
                      <span>{formatNumberIntl(post.comments.length)}</span>

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
                        <FaShare/>
                        <span className="hidden | sm:block">Copy Link</span>
                      </button>
                      {/* Tooltip for Share Button */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
                        Copy Link
                      </div>
                    </div>
                  </div>

                  {!hideComments[post.id] && (
                    <div className="comments-section w-full">
                      <div className="text-white">
                        {Array.isArray(post.comments) && post.comments.length > 0 ? (
                          post.comments.map((comment, index) => (
                            <div key={index} className="flex items-start mb-3">
                              <Link href={`/profile-view/${comment.userId}`} className="relative inline-block">
                                {/* Profile Image */}
                                <img
                                  src={userPhotos.get(comment.userId) || "/placeholder.jpg"}
                                  alt="Commenter profile"
                                  className="w-6 h-6 mt-2 | sm:w-8 sm:h-8 sm:mt-0 sm:mr-2 | rounded-full cursor-pointer transition-opacity duration-300"
                                  onLoad={() => fetchUserPhoto(comment.userId)}
                                />
                                
                                {/* Yellow Tint Overlay */}
                                <div className="absolute inset-0 | w-6 h-6 mt-2 | sm:w-8 sm:h-8 sm:mt-0 sm:mr-2 | rounded-full bg-yellow-500 opacity-0 hover:opacity-50 transition-opacity duration-300"></div>
                              </Link>

                              <div className="w-10/12 | sm:w-full | flex flex-col ml-1">
                                <div className="flex flex-row justify-between">
                                  <div>
                                    <p className="font-semibold text-white flex flex-row">
                                    <span className="text-[10px] | sm:text-base sm:max-w-none | truncate max-w-[60px]">{usernames.get(comment.userId) || "Loading..."}</span>

                                      {/* Check if the comment user is the post creator */}
                                      {comment.userId === post.userId && (
                                         <span className="ml-1 text-[6px] px-1 py-1 | sm:ml-2 sm:text-xs sm:px-2 | bg-yellow-500 text-black rounded-md">
                                          Creator
                                        </span>
                                      )}
                                      {/* Add Admin and NCII text */}
                                      {userDetails.get(comment.userId)?.role === "admin" && (
                                        <span className="hidden | sm:block sm:ml-2 sm:text-xs sm:mt-1 | text-red-500 font-bold">Admin</span>
                                      )}
                                      {userDetails.get(comment.userId)?.isNCIIHolder && (
                                        <span className="hidden | sm:block sm:ml-2 sm:text-xs sm:mt-1 | text-yellow-500 font-bold">NCII</span>
                                      )}
                                    </p>
                                    <p className="text-[8px] | sm:text-sm text-gray-400">
                                      {comment.updatedAt ? (
                                        <>
                                          {formatTimestamp(comment.updatedAt)}{" "}
                                          <span className="text-[8px] | sm:text-base | text-gray-400">(edited)</span>
                                        </>
                                      ) : (
                                        formatTimestamp(comment.createdAt)
                                      )}
                                    </p>
                                  </div>
                                  
                                  {auth.currentUser?.uid === comment.userId && (
                                    <div className="text-[10px] -mt-2 | sm:text-base sm:mt-0 | bg-[#2c2c2c] max-h-8 rounded-full px-2 py-1 flex items-center space-x-2">
                                      {/* Update Button with Tooltip */}
                                      <div className="relative group inline-flex items-center">
                                        <button
                                          onClick={() => handleUpdateComment(post.id, index)}
                                          className="hover:text-yellow-500"
                                        >
                                          <FaEdit/>
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
                                          <FaTrash/>
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
                                  <div className="fixed inset-0 bg-[#484848] bg-opacity-40 flex items-center justify-center z-50">
                                    <div className="w-10/12 text-xs | sm:w-auto sm:text-base | bg-[#2c2c2c] p-6 rounded-lg text-white text-center">
                                      <p>Are you sure you want to delete this comment? This cannot be undone!</p>
                                      <div className="mt-4 flex justify-between gap-4">
                                        <button
                                          onClick={async () => {
                                            if (!commentToDelete) return;
                                            const { postId, commentIndex } = commentToDelete;
                                            await deleteComment(postId, commentIndex); 
                                            setDeleteCommentPrompt(false); 
                                          }}
                                          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                                        >
                                          Confirm
                                        </button>
                                        <button
                                          onClick={() => setDeleteCommentPrompt(false)}
                                          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {isEditingComment && (
                                  <div className="fixed inset-0 bg-[#484848] bg-opacity-40 flex items-center justify-center z-50">
                                    <div className="w-10/12 text-xs | sm:w-2/4 sm:text-base | bg-[#383838] p-6 rounded-lg max-h-[90vh] overflow-y-auto">
                                      <textarea
                                        value={editContentComment}
                                        onChange={(e) => setEditContentComment(e.target.value)}
                                        className="w-full p-3 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none text-white bg-[#2c2c2c] resize-none"
                                        rows={5}
                                      />
                                      <div className="mt-4 flex justify-between space-x-2">
                                        <button
                                          onClick={() => setIsEditingComment(false)}
                                          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          onClick={handleSaveComment}
                                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg"
                                          disabled={isSaving} 
                                        >
                                          {isSaving ? "Saving..." : "Save"}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                <LinkIt component={renderLink} regex={urlRegex}>
                                  <p className="text-xs | sm:text-base">{filterBannedWords(comment.comment)}</p>
                                </LinkIt>

                              <div className="flex gap-2 mt-2">
                                {/* Like Button (Comment) with Tooltip */}
                                <div className="relative group inline-flex items-center">
                                  <button
                                    onClick={() => handleLikeComment(post.id, index)}
                                    className={`text-[11px] | sm:text-base | flex items-center justify-between bg-[#2c2c2c] p-1 rounded-full space-x-1 hover:text-yellow-500 ${
                                      comment.likedBy?.includes(auth.currentUser?.uid || "")
                                        ? "text-yellow-500"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    <FaThumbsUp/>
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
                                    className={`text-[11px] | sm:text-base | flex items-center justify-between bg-[#2c2c2c] p-1 rounded-full space-x-1 hover:text-yellow-500 ${
                                      comment.dislikedBy.includes(auth.currentUser?.uid || "")
                                        ? "text-yellow-500"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    <FaThumbsDown/>
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
                                  className="text-[10px] | sm:text-sm | text-gray-400 hover:text-yellow-500 text-left w-fit"
                                >
                                  {showReplies[post.id]?.[index] ? "Hide Replies" : "Show Replies"} ({comment.replies?.length || 0})
                                </button>

                                {showReplies[post.id]?.[index] && (
                                  <div className="ml-1 mt-2 | sm:ml-6 sm:mt-4">
                                    {comment.replies && comment.replies.length > 0 ? (
                                      comment.replies.map((reply, replyIndex) => (
                                        <div key={replyIndex} className="flex items-start mb-2">
                                          <Link href={`/profile-view/${reply.userId}`} className="relative inline-block">
                                            {/* Profile Image */}
                                            <img
                                              src={userPhotos.get(reply.userId) || "/placeholder.jpg"}
                                              alt="Reply User"
                                              className="w-4 h-4 mt-2 | sm:w-6 sm:h-6 sm:mr-2 sm:mt-0 | rounded-full cursor-pointer transition-opacity duration-300"
                                              onLoad={() => fetchUserPhoto(reply.userId)}
                                            />

                                            {/* Yellow Tint Overlay */}
                                            <div className="absolute inset-0 | w-4 h-4 mt-2 | sm:w-6 sm:h-6 sm:mr-2 sm:mt-0 | rounded-full bg-yellow-500 opacity-0 hover:opacity-50 transition-opacity duration-300"></div>
                                          </Link>

                                          <div className="flex flex-col w-full ml-1">
                                            <div className="flex flex-row justify-between">
                                              <div>
                                                <p className="font-semibold text-white flex flex-row">
                                                  <span className="text-[10px] | sm:text-base sm:max-w-none | truncate max-w-[50px]">{usernames.get(reply.userId) || "Loading..."}</span>
                                                  {/* Check if the reply user is the post creator */}
                                                  {reply.userId === post.userId && (
                                                    <span className="ml-1 text-[5px] px-1 py-1 | sm:ml-2 sm:text-xs sm:px-2 | bg-yellow-500 text-black rounded-md">
                                                      Creator
                                                    </span>
                                                  )}
                                                  {/* Add Admin and NCII text */}
                                                  {userDetails.get(reply.userId)?.role === "admin" && (
                                                    <span className="hidden | sm:block sm:ml-2 sm:text-xs sm:mt-1 | text-red-500 font-bold">Admin</span>
                                                  )}
                                                  {userDetails.get(reply.userId)?.isNCIIHolder && (
                                                    <span className="hidden | sm:block sm:ml-2 sm:text-xs sm:mt-1 | text-yellow-500 font-bold">NCII</span>
                                                  )}
                                                </p>
                                                <p className="text-[7px] | sm:text-sm | text-gray-400">
                                                  {reply.updatedAt ? (
                                                    <>
                                                      {formatTimestamp(reply.updatedAt)}{" "}
                                                      <span className="text-[7px] | sm:text-sm | text-gray-400">(edited)</span>
                                                    </>
                                                  ) : (
                                                    formatTimestamp(reply.createdAt)
                                                  )}
                                                </p>
                                              </div>

                                              {/* Only show edit and delete buttons for the current user's replies */}
                                              {auth.currentUser?.uid === reply.userId && (
                                                <div className="text-[10px] -mt-2 ml-1 px-1 py-1 | sm:text-base sm:mt-0 sm:ml-0 sm:px-2 | bg-[#2c2c2c] max-h-8 rounded-full flex items-center space-x-2">
                                                  {/* Update Button for Reply */}
                                                  <div className="relative group inline-flex items-center">
                                                    <button
                                                      onClick={() => handleUpdateReply(post.id, index, replyIndex)}
                                                      className="hover:text-yellow-500"
                                                    >
                                                      <FaEdit/>
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
                                                      <FaTrash/>
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
                                              <div className="fixed inset-0 bg-[#484848] bg-opacity-40 flex items-center justify-center z-50">
                                                <div className="w-10/12 text-xs | sm:w-auto sm:text-base | bg-[#2c2c2c] p-6 rounded-lg text-white text-center">
                                                  <p>Are you sure you want to delete this reply? This cannot be undone!</p>
                                                  <div className="mt-4 flex justify-between gap-4">
                                                    <button
                                                      onClick={async () => {
                                                        if (!replyToDelete) return;
                                                        const { postId, commentIndex, replyIndex } = replyToDelete;
                                                        await deleteReply(postId, commentIndex, replyIndex); 
                                                        setDeleteReplyPrompt(false); 
                                                      }}
                                                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                                                    >
                                                      Confirm
                                                    </button>
                                                    <button
                                                      onClick={() => setDeleteReplyPrompt(false)}
                                                      className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                                                    >
                                                      Cancel
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>
                                            )}

                                            {isEditingReply && (
                                              <div className="fixed inset-0 bg-[#484848] bg-opacity-40 flex items-center justify-center z-50">
                                                <div className="w-10/12 text-xs | sm:w-2/4 sm:text-base | bg-[#383838] p-6 rounded-lg max-h-[90vh] overflow-y-auto">
                                                  {/* Display @name separately, uneditable */}
                                                  {repliedToUserId && (
                                                    <div className="text-xs | sm:text-sm | text-blue-500 mb-4">
                                                      Replied to: {repliedToUserId}
                                                    </div>
                                                  )}

                                                  {/* Editable text area for the reply */}
                                                  <textarea
                                                    value={editContentReply}
                                                    onChange={(e) => setEditContentReply(e.target.value)}
                                                    className="w-full p-3 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none text-white bg-[#2c2c2c] resize-none"
                                                    rows={5}
                                                  />

                                                  <div className="mt-4 flex justify-between">
                                                    <button
                                                      onClick={() => setIsEditingReply(false)}
                                                      className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                                                    >
                                                      Cancel
                                                    </button>
                                                    <button
                                                      onClick={handleSaveReply}
                                                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg"
                                                      disabled={isSaving}
                                                    >
                                                      {isSaving ? "Saving..." : "Save"}
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>
                                            )}

                                            <LinkIt component={renderLink} regex={urlRegex}>
                                              <p className="text-[12px] | sm:text-base">{renderReplyText(filterBannedWords(reply.reply), reply.repliedToUserId ?? '')}</p>
                                            </LinkIt>

                                            <div className="flex gap-2 mt-2">
                                              {/* Like Button (Reply) */}
                                              <div className="relative group inline-flex items-center">
                                                <button
                                                  onClick={() => handleLikeReply(post.id, index, replyIndex)}
                                                  className={`text-[10px] | sm:text-sm | flex items-center justify-between bg-[#2c2c2c] p-1 rounded-full space-x-1 hover:text-yellow-500 ${
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
                                                  className={`text-[10px] | sm:text-sm | flex items-center justify-between bg-[#2c2c2c] p-1 rounded-full space-x-1 hover:text-yellow-500 ${
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
                                                  className="text-[10px] | sm:text-sm | hover:text-yellow-500 text-gray-400"
                                                >
                                                  Reply
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-[10px] | sm:text-sm | text-gray-400">No replies yet</p>
                                    )}

                                    {/* Input Field for Adding Reply */}
                                    <input
                                      type="text"
                                      placeholder={"Add a reply..."}
                                      className="text-[10px] | sm:text-base | text-white w-full p-2 rounded-md bg-[#2c2c2c] focus:ring-2 focus:ring-yellow-500 outline-none mt-2"
                                      value={replyText}
                                      onChange={(e) => {
                                        const newText = e.target.value;
                                        setReplyText(newText);

                                        if (!newText.startsWith('@')) {
                                          setRepliedToUserId(null);
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Backspace" && replyText.startsWith('@')) {
                                          const usernamePart = replyText.slice(1).split(" ")[0];
                                          const usernameLength = usernamePart.length;
                                          const inputElement = e.target as HTMLInputElement;
                                          const caretPosition = inputElement.selectionStart;

                                          if (caretPosition !== null && caretPosition <= usernameLength + 2) { 
                                            setReplyText(replyText.slice(0, 1));
                                          }
                                        }

                                        if (e.key === "Enter" && replyText.trim()) {
                                          handleAddReply(post.id, index, replyText, repliedToUserId || null);
                                          setReplyText('');
                                          setRepliedToUserId(null);
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
                        <p className="text-xs | sm:text-base | pl-2 mb-2">No comments yet</p>
                      )}
                    </div>
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Add a comment..."
                  className="text-xs p-1 | sm:text-base sm:p-2 | ml-1 text-white w-full rounded-md bg-[#2c2c2c] focus:ring-2 focus:ring-yellow-500 outline-none"
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
            className="text-xs p-2 | sm:text-lg sm:p-4  | fixed bottom-4 left-4 bg-[#2c2c2c] text-white rounded-md shadow-lg max-w-xs"
            style={{ transition: 'opacity 0.3s ease-in-out' }}
          >
            {notification}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ForumViewPage;
