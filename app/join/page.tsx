'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '../../components/root/Layout';

const JoinQuizPage = () => {
  const [quizCode, setQuizCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false); 
  const router = useRouter();

  const handleJoinQuiz = () => {
    if (!quizCode.trim()) {
      alert('Please enter a valid quiz code!');
      return;
    }

    setLoading(true); 

    
    setTimeout(() => {
      
      router.push(`/quizcode/${quizCode}`);
    }, 1000); 
  };

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-screen bg-[#2e2e2e] text-white">
        <div className="bg-[#1f1f1f] text-yellow-500 p-8 rounded-lg shadow-lg w-full max-w-md">
          <h2 className="text-3xl font-bold mb-6 text-center">Join a Quiz</h2>
          <input
            type="text"
            placeholder="Enter your Quiz Code"
            value={quizCode}
            onChange={(e) => setQuizCode(e.target.value)}
            className="border border-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded-md p-3 w-full mb-4 text-yellow-500 bg-[#2e2e2e] placeholder-gray-400"
          />
          <button
            onClick={handleJoinQuiz}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-medium py-2 px-4 rounded-md w-full transition duration-300 flex items-center justify-center"
            disabled={loading} 
          >
            {loading ? (
              <div className="animate-spin border-4 border-t-4 border-yellow-600 border-opacity-50 border-t-[#1f1f1f] rounded-full h-6 w-6"></div>
            ) : (
              'Join Quiz'
            )}
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default JoinQuizPage;