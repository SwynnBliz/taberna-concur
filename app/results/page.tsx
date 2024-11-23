'use client';

import { useEffect, useState } from 'react';
import { firestore, auth } from './../../app/firebase/config'; // Import auth
import { collection, getDocs, query, where } from 'firebase/firestore';
import Layout from '../../components/root/Layout';

const ResultsPage = () => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const user = auth.currentUser; // Get the current user
        if (user) {
          // Only fetch results for the current user's email
          const userEmail = user.email;

          const resultsQuery = query(
            collection(firestore, 'quizScores'),
            where('email', '==', userEmail) // Filter by email
          );
          const querySnapshot = await getDocs(resultsQuery);

          const resultsData = querySnapshot.docs.map((doc) => doc.data());
          setResults(resultsData);
        } else {
          setError('No user is logged in.');
        }
      } catch (err) {
        console.error('Error fetching results:', err);
        setError('Error fetching quiz results');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#3A3A3A] text-white">
        <div className="text-xl font-semibold animate-pulse">Loading Results...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#3A3A3A] text-white">
        {error}
      </div>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#1F1F1F] text-[#E5E5E5] p-6">
        <h2 className="text-3xl font-bold mb-6 text-center text-[#FFC107]">Your Quiz Results</h2>
        <div className="bg-[#292929] text-[#FFC107] p-6 rounded-lg shadow-lg w-full max-w-3xl">
          {results.length > 0 ? (
            <table className="w-full table-auto text-center">
              <thead>
                <tr>
                  <th className="p-4 border-b">Email</th>
                  <th className="p-4 border-b">Quiz Code</th>
                  <th className="p-4 border-b">Score</th>
                  <th className="p-4 border-b">Date</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index}>
                    <td className="p-4 border-b">{result.email}</td>
                    <td className="p-4 border-b">{result.quizCode}</td>
                    <td className="p-4 border-b">{result.score}</td>
                    <td className="p-4 border-b">
                      {result.createdAt?.toDate().toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-lg">You have not taken any quizzes yet.</p>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ResultsPage;