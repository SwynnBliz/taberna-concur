// components/forum/Forum.tsx
'use client';
import { useState, useEffect } from 'react';
import { getFirestore, collection, query, orderBy, onSnapshot, updateDoc, doc, arrayUnion, increment, getDoc, DocumentData } from 'firebase/firestore';
import { app } from '../../app/firebase/config'; // Firebase config import
import PostForum from './PostForum';
import { formatDistanceToNow } from 'date-fns'; // Import the function from date-fns
import { getAuth } from 'firebase/auth';
import { FaThumbsUp, FaThumbsDown } from 'react-icons/fa'; // Importing React Icons

interface Post {
  id: string;
  username: string;
  profilePhoto: string;
  message: string;
  imageUrl: string | null;
  createdAt: any;
  likes: number;
  dislikes: number;
  comments: { 
    username: string;
    comment: string;
    createdAt: any;
    profilePhoto: string;
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
    const profilePhoto = userData?.profilePhoto || 'https://via.placeholder.com/150'; // Default placeholder if not found
    
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
          profilePhoto, // Use profilePhoto from Firestore user data
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
                <div className="flex items-center mb-4">
                  <img
                    src={post.profilePhoto || 'https://via.placeholder.com/150'}
                    alt="Profile"
                    className="w-12 h-12 rounded-full mr-4"
                  />
                  <div>
                    <p className="text-xl font-semibold text-white">{post.username}</p>
                    <p className="text-sm text-gray-400">
                      {formatTimestamp(post.createdAt)}
                    </p>
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
                          <img
                            src={comment.profilePhoto}
                            alt="Commenter profile"
                            className="w-8 h-8 rounded-full mr-2"
                          />
                          <div>
                            <p className="font-semibold">{comment.username}</p>
                            <p>{comment.comment}</p>
                            <p className="text-sm text-gray-500">{formatTimestamp(comment.createdAt)}</p>
                            
                            {/* Like/Dislike buttons for comments */}
                            <div className="flex gap-4 mt-2">
                              <button
                                onClick={() => handleLikeComment(post.id, index)}
                                className={`${comment.likedBy?.includes(auth.currentUser?.uid || '') ? 'text-blue-500' : 'text-gray-400'}`}
                              >
                                <FaThumbsUp className="w-4 h-4" />
                                {comment.likes}
                              </button>
                              <button
                                onClick={() => handleDislikeComment(post.id, index)}
                                className={`${comment.dislikedBy.includes(auth.currentUser?.uid || '') ? 'text-red-500' : 'text-gray-400'}`}
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