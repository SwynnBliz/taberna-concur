// app/review/[quizCode]/page.tsx (TESDA Review Page)
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { firestore, auth } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Layout from '../../../components/root/Layout';

const ReviewPage = () => {
  const params = useParams();
  const quizCode = params.quizCode;

  const [quizData, setQuizData] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!quizCode) {
      setError('Invalid quiz code.');
      setLoading(false);
      return;
    }

    const fetchReviewData = async () => {
      setLoading(true);
      try {
        const user = auth.currentUser;
        if (!user) {
          setError('User not authenticated.');
          return;
        }

        // Fetch quiz information
        const quizQuery = query(collection(firestore, 'quizzes'), where('code', '==', quizCode));
        const quizSnapshot = await getDocs(quizQuery);
        if (quizSnapshot.empty) {
          setError('Quiz not found.');
          return;
        }
        const quizDoc = quizSnapshot.docs[0];
        setQuizData(quizDoc.data());

        // Fetch quiz questions
        const questionsQuery = query(collection(firestore, 'questions'), where('quizId', '==', quizDoc.id));
        const questionsSnapshot = await getDocs(questionsQuery);
        const fetchedQuestions = questionsSnapshot.docs.map((doc) => doc.data());
        setQuestions(fetchedQuestions);

        // Fetch user responses from `quizResponses`
        const responsesQuery = query(
          collection(firestore, 'quizResponses'),
          where('quizCode', '==', quizCode),
          where('userId', '==', user.uid)
        );
        const responsesSnapshot = await getDocs(responsesQuery);

        const userResponses: Record<number, string> = {};
        responsesSnapshot.docs.forEach((doc) => {
          const responseData = doc.data();
          userResponses[responseData.questionIndex] = responseData.userAnswer;
        });

        setUserAnswers(userResponses);
      } catch (err) {
        console.error('Error fetching review data:', err);
        setError('Error loading review data.');
      } finally {
        setLoading(false);
      }
    };

    fetchReviewData();
  }, [quizCode]);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#2e2e2e] text-white">
        Loading review...
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#2e2e2e] text-white">
        {error}
      </div>
    );

    return (
      <Layout>
        <div className="min-h-screen p-8 bg-[#2e2e2e] text-white flex flex-col items-center animate-fade-in">
          <h2 className="text-4xl font-extrabold text-yellow-400 bg-black px-6 py-3 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 animate-pulse" >
            {quizData?.name} - Review
          </h2>
          <p className="text-yellow-400 mt-3 text-lg animate-pulse">Check your answers below:</p>
    
          <div className="max-w-3xl w-full bg-[#1f1f1f] p-8 mt-6 rounded-xl shadow-xl border border-gray-700 transition-all duration-300">
            {questions.map((question, index) => (
              <div key={index} className="mb-6 border-b border-gray-700 pb-4">
                <p className="text-xl font-semibold text-white">
                  {index + 1}. {question.question}
                </p>
                <p className="text-gray-400 text-lg">
                  Your Answer: <span className="font-bold text-yellow-400">{userAnswers[index] || 'No Answer'}</span>
                </p>
                <p className="font-bold text-green-400 text-lg">
                  Correct Answer: {question.correctAnswer}
                </p>
              </div>
            ))}
          </div>
    
          <div className="flex justify-center mt-6">
            <button
              onClick={() => router.push('/results')}
              className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-semibold py-3 px-8 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 animate-pulse"
            >
              View Results
            </button>
          </div>
        </div>
      </Layout>
    );
    
};

export default ReviewPage;
