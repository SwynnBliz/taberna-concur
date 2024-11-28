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
      <div className="admin-filter-page max-w-7xl mx-40 mt-10 p-6 bg-[#383434] rounded-lg relative flex flex-col">
        <h1 className="text-xl text-white border-b-2 border-white pb-2 mb-4">Filter Banned Words (Admin Mode)</h1>

        {/* Add New Banned Word Section */}
        <div className="mb-4 flex items-center gap-x-4">
          {/* Search Input */}
          <div className="flex items-center gap-x-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#2c2c2c] outline-none focus:ring-2 focus:ring-yellow-500 p-2 rounded text-white"
              placeholder="Search for a banned word"
            />
          </div>

          <input
            type="text"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            className="bg-[#2c2c2c] outline-none focus:ring-2 focus:ring-yellow-500 p-2 rounded text-white"
            placeholder="Enter a new banned word"
          />

          <div className="relative group inline-flex items-center">
            <button
              onClick={handleAddWord}
              className="bg-[#2c2c2c] text-white p-2 rounded hover:bg-yellow-500"
            >
              <BsDatabaseAdd className="h-6 w-6"/>
            </button>

            {/* Tooltip */}
            <div className="absolute bottom-full mt-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
              Add Word
            </div>
          </div>

          {/* Bulk Delete Button with Confirmation */}
          {selectedWords.length > 0 && (
            <div className="relative group inline-flex items-center">
              <button
                onClick={() => setDeletePrompt(true)} 
                className="bg-[#2c2c2c] text-red-500 p-2 rounded hover:bg-yellow-500"
              >
                <BsDatabaseX className="h-6 w-6"/>
              </button>

              {/* Tooltip */}
              <div className="absolute bottom-full mt-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
                Delete Word
              </div>
            </div>
          )}
        </div>

        {/* Error and Success Messages */}
        {duplicateError && (
          <p className="text-red-500 text-sm mt-2">This word is already in the banned list.</p>
        )}
        {successMessage && (
          <p className="text-green-500 text-sm mt-2">{successMessage}</p>
        )}

        {/* Delete Confirmation Modal */}
        {deletePrompt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
            <div className="bg-[#2c2c2c] p-6 rounded-lg text-white text-center">
              <p>Are you sure you want to delete the selected words?</p>
              <div className="mt-4 flex justify-center gap-4">
                <button
                  onClick={handleDeleteSelectedWords}
                  className="bg-yellow-500 text-black px-4 py-2 rounded hover:bg-yellow-600"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setDeletePrompt(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
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
          <table className="min-w-fit table-auto border-collapse bg-[#2c2c2c] text-white text-center">
            <thead>
              <tr>
                <th className="w-fit border px-4 py-2 border-yellow-500">Select</th>
                <th className="w-full border px-4 py-2 border-yellow-500">Banned Word</th>
              </tr>
            </thead>
            <tbody>
              {filteredWords.sort().map((word) => (
                <tr key={word}>
                  <td className="border px-4 py-2 border-yellow-500">
                    <input
                      type="checkbox"
                      checked={selectedWords.includes(word)}
                      onChange={() => toggleSelectWord(word)}
                      className="form-checkbox"
                    />
                  </td>
                  <td className="border px-4 py-2 border-yellow-500">{word}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
};

export default AdminFilterPage;
