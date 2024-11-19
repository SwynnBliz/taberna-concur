// components/root/RightSidebar.tsx
'use client';
import { useState, useEffect } from "react";
import { firestore } from "../../app/firebase/config";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { FaBookmark } from "react-icons/fa";

const RightSidebar = () => {
  const [bookmarkedPosts, setBookmarkedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { currentUser } = getAuth();

  useEffect(() => {
    if (currentUser?.uid) {
      fetchBookmarkedPosts(currentUser.uid);
    }
  }, [currentUser]);

  const fetchBookmarkedPosts = (userId: string) => {
    setLoading(true);
    try {
      const postsRef = collection(firestore, "posts");
  
      const unsubscribe = onSnapshot(postsRef, (querySnapshot) => {
        const posts = querySnapshot.docs
          .map((doc) => {
            const data = doc.data();
            const bookmarks = data.bookmarks || [];
  
            // Find the bookmark by the current user
            const userBookmark = bookmarks.find((bookmark: { userId: string }) => bookmark.userId === userId);
            
            if (userBookmark) {
              return {
                ...data,
                bookmarkCreatedAt: userBookmark.bookmarkCreatedAt, // Add bookmarkCreatedAt to post data
              };
            }
            return null;
          })
          .filter((post) => post !== null); // Remove null values
  
        // Sort posts by bookmarkCreatedAt in descending order
        const sortedPosts = posts.sort((a, b) => b.bookmarkCreatedAt - a.bookmarkCreatedAt);
  
        setBookmarkedPosts(sortedPosts);
      });
  
      return () => unsubscribe();
    } catch (error) {
      console.error("Error fetching bookmarked posts: ", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-60 bg-[#484242] p-4 border-l-2 border-white h-full right-0">
      <h3 className="font-semibold text-white border-b-2 border-white pb-2">
        Bookmarked Posts
      </h3>
      {loading ? (
        <p className="text-white pt-2">Loading bookmarked posts...</p>
      ) : bookmarkedPosts.length === 0 ? (
        <p className="text-white pt-2">No bookmarked posts yet.</p>
      ) : (
        <ul className="pt-2 space-y-4">
          {bookmarkedPosts.map((post, index) => (
            <li key={index} className="text-white">
              <div className="flex items-center space-x-2">
                <FaBookmark className="text-yellow-500 w-5 h-5" />
                <p>{post.message}</p> {/* Replace 'message' with the appropriate field */}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RightSidebar;
