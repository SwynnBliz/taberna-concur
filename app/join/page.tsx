// app/join/page.tsx (TESDA Join Page)
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '../../components/root/Layout';
import { motion } from 'framer-motion';

const JoinQuizPage = () => {
  const [quizCode, setQuizCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleJoinQuiz = () => {
    const trimmedCode = quizCode.trim();

    if (!trimmedCode) {
      setError('Please enter a valid quiz code!');
      return;
    }

    setError(null);
    setLoading(true);

    setTimeout(() => {
      router.push(`/quizcode/${trimmedCode}`);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleJoinQuiz();
  };

  return (
    <Layout>
      {/* Background Video */}
      <div className="relative w-full h-screen overflow-hidden">
        <video
          className="absolute top-0 left-0 w-full h-full object-cover"
          src="/Join.mp4"
          autoPlay
          loop
          muted
          playsInline
        />

        {/* Dark Overlay for Better Contrast */}
        <div className="absolute top-0 left-0 w-full h-full bg-black/40" />

        {/* Foreground Content with Glassmorphism */}
        <div className="relative flex items-center justify-center min-h-screen text-white px-4">
          <motion.div
            className="backdrop-blur-md bg-white/5 border-2 border-yellow-400 shadow-lg rounded-xl p-8 w-full max-w-md"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 10, y: 0 }}
            transition={{ duration: 0.8 }}
          >
          <h2 className="text-3xl text-yellow-500 font-extrabold mb-6 text-center animate-pulse">
              Join a Quiz
            </h2>

            {/* Input Field */}
            <input
              type="text"
              placeholder="Enter your Quiz Code"
              value={quizCode}
              onChange={(e) => setQuizCode(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
              onKeyDown={handleKeyPress}
              className="border border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded-md p-3 w-full mb-2 text-yellow-500 bg-black/30 placeholder-gray-400 shadow-md backdrop-blur-md"
            />

            {/* Error Message */}
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            {/* Join Button */}
            <motion.button
              onClick={handleJoinQuiz}
              className={`bg-yellow-500 hover:bg-yellow-600 text-black font-medium py-3 px-6 rounded-md w-full transition-all duration-300 flex items-center justify-center shadow-lg ${
                loading ? 'pointer-events-none opacity-70' : ''
              }`}
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
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default JoinQuizPage;