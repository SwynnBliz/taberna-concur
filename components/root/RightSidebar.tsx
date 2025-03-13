// components/root/RightSidebar.tsx (Rightside Bar Component)
'use client';
import { useState, useEffect, useMemo } from "react";
import { firestore } from "../../app/firebase/config";
import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import Link from "next/link";
import useBannedWords from "../forum/hooks/useBannedWords";
import { formatDistanceToNow } from 'date-fns';
import PostMediaCarousel from '../forum/ui/PostMediaCarousel';

const RightSidebar = () => {
  const [bookmarkedPosts, setBookmarkedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { currentUser } = getAuth();
  const { bannedWords, loading: bannedWordsLoading } = useBannedWords();
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
              profilePhoto: userData.profilePhoto || "/placeholder.jpg",
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
    
    return timestamp && timestamp.seconds
      ? formatDistanceToNow(new Date(timestamp.seconds * 1000), { addSuffix: true })
      : 'Invalid date';
  };

  return (
    <div className="w-40 | sm:w-60 | right-sidebar bg-[#484848] p-4 border-l-2 border-white h-full overflow-y-auto fixed right-0 z-10">
      <h3 className="text-[12px] pl-3 | sm:text-sm sm:pl-5 | mt-3 -mb-2 text-white">
        Bookmarked Posts
      </h3>
      {/* Separator Line */}
      <hr className="my-4 border-white w-5/6 mx-auto mb-0" />
      {loading || bannedWordsLoading ? (
        <p className="text-white pt-2 pl-3 text-[10px] | sm:pl-5 sm:text-xs |">Loading bookmarked posts...</p>
      ) : bookmarkedPosts.length === 0 ? (
        <p className="text-white pt-2 pl-3 text-[10px] | sm:pl-5 sm:text-xs |">No bookmarked posts yet.</p>
      ) : (
        <ul className="pt-1">
          {bookmarkedPosts.map((post, index) => (
            <li key={index} className="text-white p-4 rounded-lg">
              {/* User Photo and Username */}
              <div className="space-x-1 | sm:space-x-4 | flex items-center">
                <img
                  src={post.profilePhoto || '/placeholder.jpg'}
                  alt="User Profile"
                  className="w-8 h-8 | sm:w-12 sm:h-12 | rounded-full"
                />
                <div className="flex flex-col">
                  <span className="text-[10px] | sm:text-sm sm:max-w-none | truncate max-w-[50px]">{post.username || 'Loading...'}</span>
                  {/* Check if updatedAt exists */}
                  <p className="text-[8px] | sm:text-xs | mb-2 text-gray-400">
                    {post.updatedAt ? (
                      <>
                        {formatTimestamp(post.updatedAt)} <span className="text-[8px] | sm:text-xs | text-gray-400">(edited)</span>
                      </>
                    ) : (
                      formatTimestamp(post.createdAt)
                    )}
                  </p>
                </div>
              </div>

              <p className="text-[10px] | sm:text-sm | mt-1 text-gray-300 line-clamp-2">{post.message}</p>

              {/* Post Media Carousel for Sidebar */}
              <div className="mt-2 relative">
                <PostMediaCarousel imageUrl={post.imageUrl} videoUrl={post.videoUrl} className="h-32" />

                {/* Tint Overlay */}
                <div className="absolute top-0 left-0 w-full h-full bg-[#2c2c2c] opacity-20 rounded-lg pointer-events-none" />
              </div>

              {/* "View Original Post" Button */}
              <div className="mt-2 flex items-center justify-between">
                <Link href={`/forum/${post.id}`} passHref>
                  <button 
                    className="text-[8px] | sm:text-xs | text-white hover:text-yellow-500 underline"
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
