// forum/hooks/useBannedWords.tsx
import { useEffect, useState } from "react";
import { firestore } from "../../../app/firebase/config"; 
import { doc, getDoc } from "firebase/firestore";

const useBannedWords = () => {
  const [bannedWords, setBannedWords] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchBannedWords = async () => {
      try {
        const docRef = doc(firestore, "settings", "bannedWords"); 
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setBannedWords(docSnap.data()?.words || []); 
        }
      } catch (error) {
        console.error("Error fetching banned words:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBannedWords();
  }, []);

  return { bannedWords, loading };
};

export default useBannedWords;
