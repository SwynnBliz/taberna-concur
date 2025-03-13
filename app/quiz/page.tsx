// app/quiz/page.tsx (TESDA Home Page)
'use client';

import Link from 'next/link';
import Layout from '../../components/root/Layout';
import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app } from '../firebase/config';
import { motion } from 'framer-motion';

// Fetch user status
const fetchUserStatus = async () => {
  try {
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) return { isNc2Holder: false, isAdmin: false };

    const firestore = getFirestore(app);
    const userRef = doc(firestore, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      return {
        isNc2Holder: userData.isNCIIHolder,
        isAdmin: userData.role === 'admin'
      };
    }
  } catch (error) {
    console.error("Error fetching user status:", error);
  }
  return { isNc2Holder: false, isAdmin: false };
};

const QuizHomePage = () => {
  const [status, setStatus] = useState({ isNc2Holder: false, isAdmin: false });

  useEffect(() => {
    const fetchData = async () => {
      const userStatus = await fetchUserStatus();
      setStatus(userStatus);
    };
    fetchData();
  }, []);

  return (
    <Layout>
        
        {/* Dark Overlay */}
        <div className="absolute top-0 left-0 w-full h-full bg-black/50" />

        {/* Content */}
        
        <div className="relative flex flex-col items-center justify-center h-full text-white px-4 sm:px-8"
        style={{backgroundImage: "url('/Background.png')",backgroundSize: "cover"}}>
          <div
            className="mb-3 text-4xl sm:text-5xl font-extrabold text-yellow-300 drop-shadow-lg text-center bg-opacity-80 bg-gray-800 p-4 rounded-lg">
            Welcome to the TESDA Module
          </div>
          
          {/* Subtitle */}
          <div className="text-lg sm:text-xl mb-8 sm:mb-12 text-center text-yellow-300 max-w-lg bg-opacity-100 bg-gray-700 p-3 rounded-lg shadow-lg">
            Create TESDA quiz or join existing ones and challenge your knowledge!
          </div>
          
          {/* Buttons */}
          <div className="flex flex-col sm:flex-row sm:space-x-6 space-y-4 sm:space-y-0">
            {(status.isNc2Holder || status.isAdmin) && (
              <Link href="/create">
                <motion.button 
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-yellow-500 text-black text-lg font-semibold rounded-md shadow-xl 
                  hover:shadow-yellow-500/80"
                  whileHover={{ scale: 1.1 }}
                >
                  Create Quiz
                </motion.button>
              </Link>
            )}
            <Link href="/join">
              <motion.button 
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gray-700 text-gray-200 text-lg font-semibold rounded-md shadow-xl 
                hover:shadow-gray-500/80"
                whileHover={{ scale: 1.1 }}
              >
                Join Quiz
              </motion.button>
            </Link>
            <Link href="/results">
              <motion.button 
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-blue-500 text-white text-lg font-semibold rounded-md shadow-xl 
                hover:shadow-blue-500/80"
                whileHover={{ scale: 1.1 }}
              >
                View Results
              </motion.button>
            </Link>
          </div>
        </div>
     
    </Layout>
  );
};

export default QuizHomePage;