// app/admin-filter/page.tsx (Admin Filter Page)
'use client';
import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { firestore } from '../firebase/config';
import Layout from '../../components/root/Layout'; 
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { BsDatabaseAdd, BsDatabaseX } from "react-icons/bs";
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  profilePhoto: string;
  username: string;
  bio: string;
  contactNumber: string;
  visibility: 'public' | 'private';
  role: 'admin' | 'user';
}

const AdminFilterPage: React.FC = () => {
  const auth = getAuth();
  const router = useRouter();
  const [newWord, setNewWord] = useState('');
  const [bannedWords, setBannedWords] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [duplicateError, setDuplicateError] = useState(false); 
  const [successMessage, setSuccessMessage] = useState('');
  const [deletePrompt, setDeletePrompt] = useState(false); 
  const [searchQuery, setSearchQuery] = useState(''); 

  useEffect(() => {
    const checkAdminRole = async (authUser: FirebaseUser | null) => {
      if (!authUser) {
        router.push('/sign-in');
        return;
      }

      try {
        const userDocRef = doc(firestore, 'users', authUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;

          if (userData.role !== 'admin') {
            router.push('/forum');
          }
        } else {
          router.push('/sign-in');
        }
      } catch (error) {
        console.error('Error checking user role: ', error);
        router.push('/sign-in');
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        checkAdminRole(user);
      } else {
        router.push('/sign-in');
      }
    });

    return () => unsubscribe();
  }, [auth, firestore, router]);
  
  const fetchBannedWords = async () => {
    try {
      const bannedWordsDocRef = doc(firestore, 'settings', 'bannedWords');
      const bannedWordsDoc = await getDoc(bannedWordsDocRef);
      if (bannedWordsDoc.exists()) {
        setBannedWords(bannedWordsDoc.data()?.words || []);
      }
    } catch (error) {
      console.error("Error fetching banned words:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBannedWords();
  }, []);

  
  const handleAddWord = async () => {
    if (!newWord.trim()) return; 

    
    if (bannedWords.includes(newWord.trim().toLowerCase())) {
      setDuplicateError(true);
      return;
    }

    try {
      const bannedWordsDocRef = doc(firestore, 'settings', 'bannedWords');
      await updateDoc(bannedWordsDocRef, {
        words: arrayUnion(newWord.trim())
      });
      setNewWord('');
      setDuplicateError(false); 
      setSuccessMessage('Word added successfully!');
      fetchBannedWords(); 
    } catch (error) {
      console.error("Error adding word:", error);
    }
  };

  
  const handleDeleteSelectedWords = async () => {
    if (!deletePrompt) return;

    try {
      const bannedWordsDocRef = doc(firestore, 'settings', 'bannedWords');
      await updateDoc(bannedWordsDocRef, {
        words: bannedWords.filter((word) => !selectedWords.includes(word))
      });
      setSelectedWords([]);
      setDeletePrompt(false);
      setSuccessMessage('Words deleted successfully!');
      fetchBannedWords(); 
    } catch (error) {
      console.error("Error deleting words:", error);
    }
  };

  const toggleSelectWord = (word: string) => {
    setSelectedWords((prevSelected) =>
      prevSelected.includes(word)
        ? prevSelected.filter((w) => w !== word)
        : [...prevSelected, word]
    );
  };

  const filteredWords = bannedWords.filter(word =>
    word.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
  <div className="admin-filter-page max-w-7xl mx-auto mt-10 p-6 bg-[#383838] rounded-lg relative flex flex-col">
    <h1 className="text-xl text-white border-b-2 border-white pb-2 mb-4">Manage Filter</h1>

    {/* Add New Banned Word Section */}
    <div className="mb-4 flex flex-col sm:flex-row items-center gap-4">
      {/* Search Input */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="bg-[#2c2c2c] outline-none focus:ring-2 focus:ring-yellow-500 p-2 rounded text-white w-full sm:w-auto sm:min-w-56"
        placeholder="Search for a banned word"
      />

      <input
        type="text"
        value={newWord}
        onChange={(e) => setNewWord(e.target.value)}
        className="bg-[#2c2c2c] outline-none focus:ring-2 focus:ring-yellow-500 p-2 rounded text-white w-full sm:w-auto sm:min-w-56"
        placeholder="Enter a new banned word"
      />

      {/* Add Word Button */}
      <div className="relative group">
        <button
          onClick={handleAddWord}
          className="bg-[#2c2c2c] text-white p-2 rounded hover:bg-yellow-500"
        >
          <BsDatabaseAdd className="h-6 w-6"/>
        </button>
      </div>

      {/* Bulk Delete Button */}
      {selectedWords.length > 0 && (
        <div className="relative group">
          <button
            onClick={() => setDeletePrompt(true)} 
            className="bg-[#2c2c2c] text-red-500 p-2 rounded hover:bg-yellow-500"
          >
            <BsDatabaseX className="h-6 w-6"/>
          </button>
        </div>
      )}
    </div>

    {/* Error and Success Messages */}
    {duplicateError && <p className="text-red-500 text-sm mt-2">This word is already in the banned list.</p>}
    {successMessage && <p className="text-green-500 text-sm mt-2">{successMessage}</p>}

    {/* Delete Confirmation Modal */}
    {deletePrompt && (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-10 px-4">
        <div className="bg-[#2c2c2c] p-6 rounded-lg text-white text-center w-full max-w-md">
          <p>Are you sure you want to delete the selected words?</p>
          <div className="mt-4 flex justify-between">
            <button
              onClick={handleDeleteSelectedWords}
              className="bg-yellow-500 text-black px-4 py-2 rounded hover:bg-yellow-600 w-1/2"
            >
              Confirm
            </button>
            <button
              onClick={() => setDeletePrompt(false)}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 w-1/2"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Banned Words List */}
    {isLoading ? (
      <p className="text-white">Loading banned words...</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto border-collapse bg-[#2c2c2c] text-white text-center">
          <thead>
            <tr>
              <th className="border px-4 py-2 border-white">Select</th>
              <th className="border px-4 py-2 border-white">Banned Word</th>
            </tr>
          </thead>
          <tbody>
            {filteredWords.sort().map((word) => (
              <tr key={word}>
                <td className="border px-4 py-2 border-white">
                  <input
                    type="checkbox"
                    checked={selectedWords.includes(word)}
                    onChange={() => toggleSelectWord(word)}
                    className="form-checkbox"
                  />
                </td>
                <td className="border px-4 py-2 border-white">{word}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
</Layout>

  );
};

export default AdminFilterPage;
