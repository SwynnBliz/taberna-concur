// app/results/page.tsx (TESDA Results Page)
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { firestore, auth } from './../../app/firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Layout from '../../components/root/Layout';

const ResultsPage = () => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const user = auth.currentUser;
        if (!user) {
          setError('User not authenticated.');
          return;
        }

        const scoresQuery = query(collection(firestore, 'quizScores'), where('userId', '==', user.uid));
        const scoresSnapshot = await getDocs(scoresQuery);

        if (scoresSnapshot.empty) {
          setError('No quiz results found.');
          return;
        }

        const scoresData = scoresSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt && data.createdAt.seconds
              ? new Date(data.createdAt.seconds * 1000).toLocaleString()
              : 'No Date Available',
          };
        });

        setResults(scoresData);
      } catch (err) {
        console.error('Error fetching quiz results:', err);
        setError('Error loading quiz results.');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-yellow-400 text-xl animate-pulse">
        Loading results...
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-red-500 text-xl font-semibold">
        {error}
      </div>
    );

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center px-6 sm:px-10 md:px-16 bg-[#1F1F1F] text-yellow-400" 
      style={{backgroundImage: "url('/Background.png')",backgroundSize: "cover"}}>
        <div className="bg-[#1F1F1F] bg-opacity-90 backdrop-blur-lg p-8 sm:p-12 rounded-2xl shadow-2xl w-full max-w-4xl border border-yellow-500 relative">
          <h2 className="text-4xl text-yellow-500 font-extrabold mb-6 text-center animate-pulse">
            Your Quiz Results
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="text-yellow-400 border-b border-yellow-500 text-lg">
                  <th className="py-3">Email</th>
                  <th className="py-3">Quiz Code</th>
                  <th className="py-3">Score</th>
                  <th className="py-3">Date</th>
                  <th className="py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.id} className="border-b border-gray-700 text-yellow-200 hover:bg-yellow-500 hover:text-gray-900 transition">
                    <td className="py-4 px-2">{result.email}</td>
                    <td className="py-4 px-2">{result.quizCode}</td>
                    <td className="py-4 px-2 font-bold">{result.score}</td>
                    <td className="py-4 px-2">{result.createdAt}</td>
                    <td className="py-4 px-2">
                      <button
                        onClick={() => router.push(`/review/${result.quizCode}`)}
                        className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-gray-900 font-semibold py-2 px-6 rounded-lg shadow-md transform transition-transform hover:scale-105"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ResultsPage;
