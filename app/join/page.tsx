'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '../../components/root/Layout';
import { motion } from 'framer-motion';
import { collection, getDocs } from 'firebase/firestore';
import { firestore } from './../../app/firebase/config';

const JoinQuizPage = () => {
  const [quizCode, setQuizCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showQuizzes, setShowQuizzes] = useState<boolean>(false);
  const [createdQuizzes, setCreatedQuizzes] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchQuizzes = async () => {
      const querySnapshot = await getDocs(collection(firestore, 'quizzes'));
      const quizzes = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setCreatedQuizzes(quizzes);
    };
    fetchQuizzes();
  }, []);

  const handleJoinQuiz = () => {
    const trimmedCode = quizCode.trim();
    if (!trimmedCode) {
      setError('Please enter a valid quiz code!');
      return;
    }
    setError(null);
    setLoading(true);
    setTimeout(() => {
      router.push(`/quizcode/${encodeURIComponent(trimmedCode)}`);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleJoinQuiz();
  };

  return (
    <Layout>
      <div className="relative w-full h-screen overflow-hidden">
        <video
          className="absolute top-0 left-0 w-full h-full object-cover"
          src="/Join.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="absolute top-0 left-0 w-full h-full bg-black/40" />
        <div className="relative flex flex-col items-center justify-center min-h-screen text-white px-4">
          <motion.div
            className="backdrop-blur-md bg-white/5 border-2 border-yellow-400 shadow-lg rounded-xl p-8 w-full max-w-md"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl text-yellow-500 font-extrabold mb-6 text-center animate-pulse">
              Join a Quiz
            </h2>
            <input
              type="text"
              placeholder="Enter your Quiz Code"
              value={quizCode}
              onChange={(e) => setQuizCode(e.target.value.replace(/[^a-zA-Z0-9@&_]/g, ''))}
              onKeyDown={handleKeyPress}
              className="border border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded-md p-3 w-full mb-2 text-yellow-500 bg-black/30 placeholder-gray-400 shadow-md backdrop-blur-md"
            />
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <motion.button
              onClick={handleJoinQuiz}
              className={`bg-yellow-500 hover:bg-yellow-600 text-black font-medium py-3 px-6 rounded-md w-full transition-all duration-300 flex items-center justify-center shadow-lg ${loading ? 'pointer-events-none opacity-70' : ''}`}
              whileHover={{ scale: 1.05 }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin border-4 border-t-4 border-yellow-600 border-opacity-50 border-t-[#1f1f1f] rounded-full h-5 w-5 mr-2"></div>
                  Joining...
                </>
              ) : (
                'Join Quiz'
              )}
            </motion.button>
            <button
              onClick={() => setShowQuizzes(true)}
              className="bg-blue-500 hover:bg-blue-700 text-white py-3 px-6 rounded-lg w-full mt-6"
            >
              View Quizzes
            </button>
          </motion.div>
        </div>
      </div>
      {showQuizzes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-lg relative">
            <button
              onClick={() => setShowQuizzes(false)}
              className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded"
            >
              ✖
            </button>
            <h3 className="text-2xl font-semibold text-yellow-300 mb-4">Created Quizzes</h3>
            <div className="space-y-2">
              {createdQuizzes.length > 0 ? (
                createdQuizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    className="flex justify-between items-center bg-gray-700 p-4 rounded-lg text-yellow-300 cursor-pointer hover:bg-yellow-500 transition-all"
                    onClick={() => router.push(`/quizcode/${quiz.code}`)}
                  >
                    <span>{quiz.name} (Code: {quiz.code})</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-300">No quizzes found.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default JoinQuizPage;
