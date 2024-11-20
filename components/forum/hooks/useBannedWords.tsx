// src/hooks/useBannedWords.ts
import { useEffect, useState } from "react";
import { firestore } from "../../../app/firebase/config"; // Import firestore instance
import { doc, getDoc } from "firebase/firestore";
import { filterText } from "../utils/filterText"; // Import the filterText utility

const useBannedWords = () => {
  const [bannedWords, setBannedWords] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchBannedWords = async () => {
      try {
        const docRef = doc(firestore, "settings", "bannedWords"); // Specify the document path
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setBannedWords(docSnap.data()?.words || []); // Get the words array from the document
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
