import Link from 'next/link';
import Layout from '../../components/root/Layout';

const QuizHomePage = () => {
  return (
    <Layout>
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#2e2e2e] text-white">
        <h1 className="text-4xl font-extrabold mb-8 shadow-md p-4 rounded-lg bg-[#1f1f1f] text-yellow-500">
          Welcome to the Quiz Module
        </h1>
        <p className="text-lg mb-12 text-center text-gray-400">
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