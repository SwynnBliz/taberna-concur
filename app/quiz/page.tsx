'use client';

import Link from 'next/link';
import Layout from '../../components/root/Layout';
import { useEffect } from 'react';

const QuizHomePage = () => {
  useEffect(() => {
    // Add the global class to the body
    document.body.classList.add('QuizHomePage');
    return () => {
      // Clean up after unmounting the component
      document.body.classList.remove('QuizHomePage');
    };
  }, []);

  return (
    <Layout>
      <div
        className="min-h-screen flex flex-col items-center justify-center text-white"
        style={{
          backgroundImage: "url('https://images2.alphacoders.com/132/1321858.png')",
        }}
      >
        <h1 className="text-4xl font-extrabold mb-8 shadow-md p-4 rounded-lg bg-[#1f1f1f] text-#df8e24-500">
          Welcome to the Quiz Module
        </h1>
        <p className="text-lg mb-12 text-center text-white-400">
          Create quizzes or join existing ones and challenge your knowledge!
        </p>
        <div className="flex space-x-6">
          {/* Create Quiz Button */}
          <Link href="/create">
            <button className="px-8 py-4 bg-yellow-500 text-black text-lg font-semibold rounded-md shadow hover:bg-yellow-600 transition duration-300">
              Create Quiz
            </button>
          </Link>
          {/* Join Quiz Button */}
          <Link href="/join">
            <button className="px-8 py-4 bg-gray-700 text-gray-200 text-lg font-semibold rounded-md shadow hover:bg-gray-600 transition duration-300">
              Join Quiz
            </button>
          </Link>
          {/* Results Button */}
          <Link href="/results">
            <button className="px-8 py-4 bg-blue-500 text-white text-lg font-semibold rounded-md shadow hover:bg-blue-600 transition duration-300">
              View Results
            </button>
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default QuizHomePage;