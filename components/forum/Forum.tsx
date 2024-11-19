// components/forum/Forum.tsx
'use client';
import { useState, useEffect } from 'react';
import { getFirestore, collection, query, orderBy, onSnapshot, updateDoc, doc, increment, getDoc, deleteDoc } from 'firebase/firestore';
import { app } from '../../app/firebase/config'; // Firebase config import
import PostForum from './PostForum';
import { formatDistanceToNow } from 'date-fns'; // Import the function from date-fns
import { getAuth } from 'firebase/auth';
import { FaThumbsUp, FaThumbsDown, FaTrash } from 'react-icons/fa'; // Importing React Icons
import Link from 'next/link';

interface Post {
  id: string;
  userId: string;
  message: string;
  imageUrl: string | null;
  createdAt: any;
  likes: number;
  dislikes: number;
  comments: { 
    comment: string;
    createdAt: any;
    userId: string; // Add userId to the comment object
    likes: number; // Add likes field for comments
    dislikes: number; // Add dislikes field for comments
    likedBy: string[]; // Track users who liked the comment
    dislikedBy: string[]; // Track users who disliked the comment
  }[]; 
  likedBy: string[];
  dislikedBy: string[];
}

const Forum = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const firestore = getFirestore(app);
  const auth = getAuth();
  const [userLikes, setUserLikes] = useState<Map<string, string>>(new Map()); // Track user's like/dislike status
  const [userPhotos, setUserPhotos] = useState<Map<string, string>>(new Map());
  const usernameCache = new Map<string, string>(); // Cache to store fetched usernames
  const [usernames, setUsernames] = useState<Map<string, string>>(new Map());


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

  return (
    <div className="flex flex-col">
      <PostForum />
      <div>
        <p className="mt-2 border-b-2 border-white pb-2 w-8/12 mx-auto"></p>
        <p className="border-b-2 border-white py-2 w-8/12 mx-auto text-white text-xl">Posts</p>
        <div className="p-3 w-9/12 bg-[#484242] mx-auto">
          {posts.length === 0 ? (
            <p className="text-center text-white w-full">There are no posts yet. Be the first to create one!</p>
          ) : (
            posts.map((post) => (
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
                      <p className="text-sm text-gray-400">{formatTimestamp(post.createdAt)}</p>
                    </div>
                  </div>
  
                  {/* Right Section: Delete Button */}
                  <div>
                    {auth.currentUser?.uid === post.userId && (
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FaTrash className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-lg text-white mb-4" style={{ whiteSpace: 'pre-wrap' }}>
                  {post.message}
                </p>
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
                    className={`${userLikes.get(post.id) === 'like' ? 'text-blue-500' : 'text-gray-400'}`}
                  >
                    <FaThumbsUp className="w-4 h-4" />
                    {post.likes}
                  </button>
                  <button
                    onClick={() => handleDislike(post.id)}
                    className={`${userLikes.get(post.id) === 'dislike' ? 'text-red-500' : 'text-gray-400'}`}
                  >
                    <FaThumbsDown className="w-4 h-4" />
                    {post.dislikes}
                  </button>
                </div>
                <p className="border-b-2 border-white py-2 w-auto text-white text-xl p-2 ml-2 mb-2">
                  Comments ({post.comments.length})
                </p>
                <div className="comments-section ml-2">
                  <div className="text-white">
                    {Array.isArray(post.comments) && post.comments.length > 0 ? (
                      post.comments.map((comment, index) => (
                        <div key={index} className="flex items-start mb-3">
                          <Link href={`/profile-view/${comment.userId}`}>
                            <img
                              src={userPhotos.get(comment.userId) || 'https://via.placeholder.com/150'}
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
                                <p className="text-sm text-gray-500">{formatTimestamp(comment.createdAt)}</p>
                              </div>
                              {auth.currentUser?.uid === comment.userId && (
                                <button
                                  onClick={() => handleDeleteComment(post.id, index)}
                                  className="text-red-500 hover:text-red-700 ml-auto"
                                >
                                  <FaTrash className="w-5 h-5" />
                                </button>
                              )}
                            </div>
                            <p>{comment.comment}</p>
  
                            {/* Like/Dislike buttons for comments */}
                            <div className="flex gap-4 mt-2">
                              <button
                                onClick={() => handleLikeComment(post.id, index)}
                                className={`${
                                  comment.likedBy?.includes(auth.currentUser?.uid || '')
                                    ? 'text-blue-500'
                                    : 'text-gray-400'
                                }`}
                              >
                                <FaThumbsUp className="w-4 h-4" />
                                {comment.likes}
                              </button>
                              <button
                                onClick={() => handleDislikeComment(post.id, index)}
                                className={`${
                                  comment.dislikedBy.includes(auth.currentUser?.uid || '')
                                    ? 'text-red-500'
                                    : 'text-gray-400'
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
                      <p className="pl-2 mb-2">No comments yet</p> // Optional: display message if there are no comments
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    className="text-white w-full p-2 rounded-md bg-[#292626] focus:ring-2 focus:ring-yellow-500 outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddComment(post.id, e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Forum;
