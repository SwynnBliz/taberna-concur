// components/forum/Forum.tsx
'use client';
import { useState, useEffect } from 'react';
import { getFirestore, collection, query, orderBy, getDocs, updateDoc, doc, arrayUnion, increment } from 'firebase/firestore';
import { app } from '../../app/firebase/config'; // Firebase config import
import PostForm from './PostForum';

const Forum = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const firestore = getFirestore(app);

  useEffect(() => {
    const fetchPosts = async () => {
      const postsQuery = query(collection(firestore, 'posts'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(postsQuery);
      const postsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPosts(postsData);
    };

    fetchPosts();
  }, []);

  const handleLike = async (postId: string) => {
    const postRef = doc(firestore, 'posts', postId);
    await updateDoc(postRef, {
      likes: increment(1),
    });
  };

  const handleDislike = async (postId: string) => {
    const postRef = doc(firestore, 'posts', postId);
    await updateDoc(postRef, {
      dislikes: increment(1),
    });
  };

  const handleAddComment = async (postId: string, comment: string) => {
    const postRef = doc(firestore, 'posts', postId);
    await updateDoc(postRef, {
      comments: arrayUnion({
        userId: 'commenterId', // Replace with actual commenter ID
        username: 'commenterName', // Replace with commenter name
        comment,
        createdAt: new Date(),
      }),
    });
  };

  return (
    <div>
      <PostForm />
      <p className="mt-2 border-b-2 border-white pb-2 max-w-3xl mx-auto"></p>
      <p className="border-b-2 border-white py-2 max-w-3xl mx-auto text-white text-2xl">Posts</p>
      <div className="mt-2 p-3 max-w-4xl bg-[#484242]">
        {posts.map((post) => (
          <div key={post.id} className="p-16 rounded-lg mb-6 max-w-4xl">
            <div className="flex items-center mb-4">
              <img
                src={post.profilePhoto || 'https://via.placeholder.com/150'}
                alt="Profile"
                className="w-12 h-12 rounded-full mr-4"
              />
              <div>
                <p className="text-xl font-semibold text-white">{post.username}</p>
                <p className="text-sm text-white">{post.userEmail}</p>
              </div>
            </div>
            <p className="text-lg text-white mb-4">{post.message}</p>
            {post.imageUrl && (
              <img
                src={post.imageUrl}
                alt="Post image"
                className="w-full max-h-64 object-cover rounded-lg mb-4"
              />
            )}
            <div className="flex gap-4 mb-4">
              <button onClick={() => handleLike(post.id)} className="text-white">Like</button>
              <button onClick={() => handleDislike(post.id)} className="text-white">Dislike</button>
            </div>
            <div>
              <input
                type="text"
                placeholder="Add a comment..."
                className="w-full p-2 mb-4 rounded-md"
                onBlur={(e) => handleAddComment(post.id, e.target.value)}
              />
            </div>
            <div>
              {post.comments?.map((comment: any, index: number) => (
                <div key={index} className="bg-gray-700 p-2 rounded-md mb-2">
                  <p className="text-white font-semibold">{comment.username}:</p>
                  <p className="text-white border-b-2 border-white pb-2">{comment.comment}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Forum;
