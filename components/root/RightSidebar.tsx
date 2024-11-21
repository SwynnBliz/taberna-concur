// components/root/RightSidebar.tsx
'use client';
import { useState, useEffect, useMemo } from "react";
import { firestore } from "../../app/firebase/config";
import { collection, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { FaBookmark } from "react-icons/fa";
import useBannedWords from "../forum/hooks/useBannedWords";

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
  }, [currentUser, bannedWordsMemo, bannedWordsLoading]); // Use memoized bannedWords

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
              let message = data.message || ""; // Default to empty string if no message
              
              // Replace banned words in the message
              bannedWordsMemo.forEach((word) => {
                const regex = new RegExp(`\\b${word}\\b`, "gi"); // Match full words, case insensitive
                message = message.replace(regex, "*".repeat(word.length));
              });

              return {
                ...data,
                message, // Use the filtered message
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
    <div className="w-60 bg-[#484242] p-4 border-l-2 border-white h-[calc(100vh-64px)] overflow-y-auto fixed top-16 right-0 z-10">
      <h3 className="font-semibold text-white border-b-2 border-white pb-2">
        Bookmarked Posts
      </h3>
      {loading || bannedWordsLoading ? (
        <p className="text-white pt-2">Loading bookmarked posts...</p>
      ) : bookmarkedPosts.length === 0 ? (
        <p className="text-white pt-2">No bookmarked posts yet.</p>
      ) : (
        <ul className="pt-2 space-y-4">
          {bookmarkedPosts.map((post, index) => (
            <li key={index} className="text-white">
              <div className="flex items-center space-x-2">
                <FaBookmark className="text-yellow-500 w-5 h-5" />
                <p>{post.message}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RightSidebar;
