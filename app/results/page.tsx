// app/results/page.tsx (TESDA Results Page)
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { firestore, auth } from './../../app/firebase/config';
import { collection, query, where, getDocs, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import Layout from '../../components/root/Layout';
import { FaSearch } from 'react-icons/fa'; 

const ResultsPage = () => {
  const [results, setResults] = useState<any[]>([]);
  const [filteredResults, setFilteredResults] = useState<any[]>([]); 
  const [searchQuery, setSearchQuery] = useState<string>(''); 
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 5;
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setError('User not authenticated.');
        setLoading(false);
        return;
      }
      
      try {
        const scoresQuery = query(
          collection(firestore, 'quizScores'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          orderBy('__name__', 'desc') // Required Firestore index
        );
        const scoresSnapshot = await getDocs(scoresQuery);

        if (scoresSnapshot.empty) {
          setError('No quiz results found.');
          setLoading(false);
          return;
        }

        const scoresData = scoresSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            quizCode: data.quizCode || 'N/A',
            email: data.email || 'Unknown', 
            score: data.score !== null ? data.score : 'Pending', 
            createdAt: data.createdAt?.seconds
              ? new Date(data.createdAt.seconds * 1000).toLocaleString()
              : 'No Date Available',
          };
        });

        //attempt numbers
        const groupedResults = scoresData.reduce((acc, result) => {
          if (!acc[result.quizCode]) acc[result.quizCode] = [];
          acc[result.quizCode].push(result);
          return acc;
        }, {} as Record<string, any[]>);

        const finalResults = Object.values(groupedResults).flatMap((group) => {
          //  ascending order
          group.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          return group.map((result, index) => ({
            ...result,
            attemptNumber: index + 1, // Increment
          }));
        });

        setResults(finalResults);
      } catch (err: any) {
        console.error('Error fetching quiz results:', err.message || err);
        setError('Error loading quiz results. Ensure Firestore index is set up.');
      } finally {
        setLoading(false);
      }
    });
    
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setFilteredResults(
      results.filter((result) =>
        result.quizCode.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [searchQuery, results]); // Update filtered results when search query or results change

  const retakeQuiz = async (quizCode: string) => {
    const user = auth.currentUser;
    if (!user) {
      setError('User not authenticated.');
      console.error('User not authenticated.');
      return;
    }
  
    try {
      console.log('🔄 Retaking quiz:', quizCode);
  
      if (!quizCode) {
        console.error('⚠️ quizCode is undefined or empty.');
        setError('Invalid quiz code.');
        return;
      }
  
      console.log('📡 Fetching previous scores...');
      const scoresQuery = query(
        collection(firestore, 'quizScores'),
        where('userId', '==', user.uid),
        where('quizCode', '==', quizCode),
        orderBy('createdAt', 'desc'),
        orderBy('__name__', 'desc') // Ensure the order matches Firestore index
      );
      
      const scoresSnapshot = await getDocs(scoresQuery);
      console.log('✅ Scores fetched:', scoresSnapshot.docs.map(doc => doc.data()));
  
      let lastScore = 'N/A';
      if (!scoresSnapshot.empty) {
        lastScore = scoresSnapshot.docs[0].data().score ?? 'N/A';
      }
      console.log('📊 Last Score:', lastScore);
  
      console.log('📝 Saving new quiz attempt...');
      const docRef = await addDoc(collection(firestore, 'quizScores'), {
        userId: user.uid,
        email: user.email,
        quizCode: quizCode,
        score: lastScore,
        createdAt: serverTimestamp(),
      });
  
      console.log('✅ Quiz attempt added with ID:', docRef.id);
      
      console.log('➡️ Redirecting to:', `/quizcode/${quizCode}`);
      router.push(`/quizcode/${quizCode}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('❌ Error retaking quiz:', errorMessage);
      setError(`Failed to retake the quiz: ${errorMessage}`);
    }
  };

  const reviewQuiz = (quizCode: string) => {
    router.push(`/review/${quizCode}`);
  };

  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
  const paginatedResults = filteredResults.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

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
          <div className="flex items-center mb-6">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search by Quiz Code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-2 px-4 pl-10 bg-gray-800 text-yellow-400 rounded-lg border border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
              <FaSearch className="absolute left-3 top-2.5 text-yellow-400" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="text-yellow-400 border-b border-yellow-500 text-lg">
                  <th className="py-3">Attempt</th>
                  <th className="py-3">Email</th>
                  <th className="py-3">Quiz Code</th>
                  <th className="py-3">Score</th>
                  <th className="py-3">Date</th>
                  <th className="py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedResults.map((result) => (
                  <tr key={result.id} className="border-b border-gray-700 text-yellow-200 hover:bg-yellow-500 hover:text-gray-900 transition">
                    <td className="py-4 px-2 font-bold">{result.attemptNumber}</td>
                    <td className="py-4 px-2">{result.email}</td>
                    <td className="py-4 px-2">{result.quizCode}</td>
                    <td className="py-4 px-2 font-bold">{result.score}</td>
                    <td className="py-4 px-2">{result.createdAt}</td>
                    <td className="py-4 px-2 flex space-x-2">
                      <button
                        onClick={() => reviewQuiz(result.quizCode)}
                        className="bg-yellow-500 hover:bg-blue-600 text-black font-semibold py-2 px-6 rounded-lg shadow-md transition-transform hover:scale-105"
                      >
                        Review
                      </button>
                      <button
                        onClick={() => retakeQuiz(result.quizCode)}
                        className="bg-gray-600 hover:bg-gray-800 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-transform hover:scale-105"
                      >
                        Retake
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between mt-4">
            {currentPage > 1 && (
              <button
                onClick={handlePreviousPage}
                className="bg-gray-600 hover:bg-yellow-500 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-transform hover:scale-105"
              >
                Previous
              </button>
            )}
            <span className="text-yellow-400 font-semibold">Page {currentPage} of {totalPages}</span>
            {currentPage < totalPages && (
              <button
                onClick={handleNextPage}
                className="bg-gray-600 hover:bg-yellow-500 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-transform hover:scale-105"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ResultsPage;
