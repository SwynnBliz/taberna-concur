// components/root/RightSidebar.tsx
'use client';
import { useState, useEffect, useMemo } from "react";
import { firestore } from "../../app/firebase/config";
import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import Link from "next/link";
import useBannedWords from "../forum/hooks/useBannedWords";
import { formatDistanceToNow } from 'date-fns'; // Import the function from date-fns

const RightSidebar = () => {
  const [bookmarkedPosts, setBookmarkedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { currentUser } = getAuth();
  const { bannedWords, loading: bannedWordsLoading } = useBannedWords();

  // Memoize bannedWords for stable reference
  const bannedWordsMemo = useMemo(() => bannedWords, [bannedWords]);

  useEffect(() => {
    if (currentUser?.uid && !bannedWordsLoading) {
      fetchBookmarkedPosts(currentUser.uid);
    }
  }, [currentUser, bannedWordsMemo, bannedWordsLoading]);

  const fetchBookmarkedPosts = (userId: string) => {
    setLoading(true);
    try {
      const postsRef = collection(firestore, "posts");
  
      const unsubscribe = onSnapshot(postsRef, (querySnapshot) => {
        const posts = querySnapshot.docs
          .map((doc) => {
            const data = doc.data();
            const bookmarks = data.bookmarks || [];
  
            const userBookmark = bookmarks.find((bookmark: { userId: string }) => bookmark.userId === userId);
            
            if (userBookmark) {
              let message = data.message || "";
              
              bannedWordsMemo.forEach((word) => {
                const regex = new RegExp(`\\b${word}\\b`, "gi");
                message = message.replace(regex, "*".repeat(word.length));
              });
  
              return {
                ...data,
                id: doc.id,
                message,
                bookmarkCreatedAt: userBookmark.bookmarkCreatedAt,
                userId: data.userId,
              };
            }
            return null;
          })
          .filter((post) => post !== null);
  
        const postsWithUserDataPromises = posts.map(async (post) => {
          const userDocRef = doc(firestore, "users", post.userId);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            return {
              ...post,
              username: userData.username || "Unknown",
              profilePhoto: userData.profilePhoto || "https://via.placeholder.com/150",
            };
          }
          return post;
        });

        Promise.all(postsWithUserDataPromises).then((postsWithUserData) => {
          const sortedPosts = postsWithUserData.sort((a, b) => b.bookmarkCreatedAt - a.bookmarkCreatedAt);
          setBookmarkedPosts(sortedPosts);
        });
      });
  
      return () => unsubscribe();
    } catch (error) {
      console.error("Error fetching bookmarked posts: ", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: any) => {
    // Handle if timestamp is valid or missing
    return timestamp && timestamp.seconds
      ? formatDistanceToNow(new Date(timestamp.seconds * 1000), { addSuffix: true })
      : 'Invalid date';
  };

  return (
    <div className="w-60 bg-[#484242] p-4 border-l-2 border-white h-[calc(100vh-64px)] overflow-y-auto fixed top-16 right-0 z-10">
      <h3 className="pl-5 mt-3 -mb-2 text-sm text-white">
        Bookmarked Posts
      </h3>
      {/* Separator Line */}
      <hr className="my-4 border-white w-5/6 mx-auto mb-0" />
      {loading || bannedWordsLoading ? (
        <p className="text-white pt-2 pl-5 text-xs">Loading bookmarked posts...</p>
      ) : bookmarkedPosts.length === 0 ? (
        <p className="text-white pt-2 pl-5 text-xs">No bookmarked posts yet.</p>
      ) : (
        <ul className="pt-1">
          {bookmarkedPosts.map((post, index) => (
            <li key={index} className="text-white p-4 rounded-lg">
              {/* User Photo and Username */}
              <div className="flex items-center space-x-4">
                <img
                  src={post.profilePhoto || 'https://via.placeholder.com/150'}
                  alt="User Profile"
                  className="w-12 h-12 rounded-full"
                />
                <div className="flex flex-col">
                  <span className="text-sm">{post.username || 'Loading...'}</span>
                  {/* Check if updatedAt exists */}
                  <p className="text-xs mb-2 text-gray-400">
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

              <p className="text-sm mt-1 text-gray-300 line-clamp-2">{post.message}</p>

              {/* Post Image Preview */}
              {post.imageUrl && (
                <div className="mt-2 relative">
                  <img
                    src={post.imageUrl}
                    alt="Post Image"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <div className="absolute top-0 left-0 w-full h-full bg-black opacity-20 rounded-lg transition-all" />
                </div>
              )}

              {/* "View Original Post" Button */}
              <div className="mt-2 flex items-center justify-between">
                <Link href={`/post-view/${post.id}`} passHref>
                  <button 
                    className="text-white text-xs hover:text-yellow-400 underline"
                  >
                    View Original Post
                  </button>
                </Link>
              </div>

              {/* Separator Line */}
              <hr className="my-4 border-white mb-0" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RightSidebar;
