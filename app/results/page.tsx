// app/results/page.tsx (TESDA Results Page)
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { firestore, auth } from './../../app/firebase/config';
import { collection, query, where, getDocs, orderBy, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import Layout from '../../components/root/Layout';

const ResultsPage = () => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
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

        const scoresData = scoresSnapshot.docs.map((doc, index) => {
          const data = doc.data();
          return {
            id: doc.id,
            attemptNumber: index + 1, // Numbering attempts
            email: data.email || 'Unknown', // Ensure email field exists
            quizCode: data.quizCode || 'N/A',
            score: data.score !== null ? data.score : 'Pending', // If null, mark as Pending
            createdAt: data.createdAt?.seconds
              ? new Date(data.createdAt.seconds * 1000).toLocaleString()
              : 'No Date Available',
          };
        });

        setResults(scoresData);
      } catch (err: any) {
        console.error('Error fetching quiz results:', err.message || err);
        setError('Error loading quiz results. Ensure Firestore index is set up.');
      } finally {
        setLoading(false);
      }
    });
    
    return () => unsubscribe();
  }, []);

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
  
  

  const deleteAttempt = async (attemptId: string) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this attempt?');
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(firestore, 'quizScores', attemptId));
      setResults((prev) => prev.filter((result) => result.id !== attemptId));
    } catch (err) {
      console.error('Error deleting quiz attempt:', err);
      setError('Failed to delete the quiz attempt.');
    }
  };

  const reviewQuiz = (quizCode: string) => {
    router.push(`/review/${quizCode}`);
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
                {results.map((result) => (
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
                      <button
                        onClick={() => deleteAttempt(result.id)}
                        className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-transform hover:scale-105"
                      >
                        Delete
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
