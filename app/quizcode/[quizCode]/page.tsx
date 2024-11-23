'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation'; // Import useParams here
import { firestore, auth } from './../../../app/firebase/config';
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';
import Layout from '../../../components/root/Layout';

const QuizPage = () => {
  const router = useRouter();
  const { quizCode } = useParams(); // Use useParams to get quizCode
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [passStatus, setPassStatus] = useState<string>(''); 
  const [userEmail, setUserEmail] = useState<string | null>(null);  // Add this to store the user's email
  const [flipped, setFlipped] = useState<boolean>(false);
  const passingPercentage = 50;

  useEffect(() => {
    if (!quizCode) return;

    const fetchQuiz = async () => {
      try {
        // Fetch the quiz data from Firestore
        const quizQuery = query(collection(firestore, 'quizzes'), where('code', '==', quizCode));
        const quizSnapshot = await getDocs(quizQuery);

        if (!quizSnapshot.empty) {
          const quizDoc = quizSnapshot.docs[0];
          setQuiz(quizDoc.data());
          const quizId = quizDoc.id;

          // Fetch the questions for the quiz
          const questionsQuery = query(collection(firestore, 'questions'), where('quizId', '==', quizId));
          const questionsSnapshot = await getDocs(questionsQuery);
          const questionsData = questionsSnapshot.docs.map((doc) => doc.data());
          setQuestions(questionsData);
        } else {
          setError('Quiz not found');
        }
      } catch (err) {
        console.error('Error fetching quiz:', err);
        setError('Error fetching quiz data');
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [quizCode]);

  useEffect(() => {
    // Fetch user email when user is logged in
    const user = auth.currentUser;
    if (user) {
      setUserEmail(user.email);
    }
  }, []);

  const handleAnswerSelection = (answer: string) => {
    const updatedAnswers = [...answers];
    updatedAnswers[currentQuestionIndex] = answer.trim().toLowerCase();
    setAnswers(updatedAnswers);
    setFlipped(true);

    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
      } else {
        handleSubmit();
      }
      setFlipped(false);
    }, 600); // Duration of the flip animation
  };

  const handleFillInAnswer = (answer: string) => {
    setAnswers((prevAnswers) => {
      const updatedAnswers = [...prevAnswers];
      updatedAnswers[currentQuestionIndex] = answer; // Keep spaces if needed
      return updatedAnswers;
    });
  };

  const handleAnswerSubmit = () => {
    handleAnswerSelection(answers[currentQuestionIndex]);
  };

  const handleSubmit = async () => {
    let score = 0;
    questions.forEach((q, index) => {
      if (answers[index]?.trim().toLowerCase() === q.correctAnswer?.trim().toLowerCase()) {
        score++;
      }
    });

    const totalQuestions = questions.length;
    const percentage = (score / totalQuestions) * 100;

    setScore(score);
    setPassStatus(percentage >= passingPercentage ? 'Passed' : 'Failed');
    setShowPopup(true);

    // Save score to Firestore with user's email and quiz code
    if (userEmail) {
      const user = auth.currentUser;
      if (user) {
        const scoreRef = doc(firestore, 'quizScores', `${user.uid}_${quizCode}`);
        await setDoc(scoreRef, {
          userId: user.uid,
          quizCode: quizCode,
          score: score,
          email: userEmail,
          createdAt: new Date(),
        });
      }
    }

    setTimeout(() => {
      router.push('/join'); // Redirect to the join page after 5 seconds
    }, 5000);

    setTimeout(() => setShowPopup(false), 5000);
  };

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setLoading(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [loading]);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#3A3A3A] text-white">
        <div className="text-xl font-semibold animate-pulse">Loading...</div>
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#3A3A3A] text-white">
        {error}
      </div>
    );

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-screen bg-[#1F1F1F] text-[#E5E5E5]">
        <div className="bg-[#292929] text-[#FFC107] p-8 rounded-lg shadow-lg w-full max-w-3xl">
          <h2 className="text-3xl font-bold mb-6 text-center text-[#FFC107]">
            {quiz?.name}
          </h2>
          <div className={`flip-container ${flipped ? 'flipped' : ''}`}>
            <div className="flipper bg-[#333333] p-6 rounded-lg shadow-md">
              <p className="text-xl font-semibold mb-6 text-center">
                {currentQuestionIndex + 1}. {currentQuestion?.question}
              </p>
              {currentQuestion?.type === 'multiple-choice' ? (
                <div className="grid grid-cols-2 gap-4">
                  {currentQuestion?.options.map((opt: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => handleAnswerSelection(opt)}
                      className="bg-[#FFC107] hover:bg-[#FFD54F] text-[#292929] font-semibold py-4 px-6 rounded-lg shadow-lg transition duration-300"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : currentQuestion?.type === 'fill-in-the-blank' ? (
                <div>
                  <input
                    type="text"
                    placeholder="Your Answer"
                    value={answers[currentQuestionIndex] || ''}
                    onChange={(e) => handleFillInAnswer(e.target.value)} // This still handles spaces
                    className="border-2 border-yellow-500 p-4 w-full rounded-lg focus:ring focus:ring-yellow-300"
                  />
                  <button
                    onClick={handleAnswerSubmit}
                    className="bg-[#FFC107] hover:bg-[#FFD54F] text-[#292929] font-semibold py-2 px-4 mt-4 rounded-lg"
                  >
                    Submit Answer
                  </button>
                </div>
              ) : (
                <p className="text-center text-red-500">Invalid question type</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-[#292929] text-[#FFC107] p-6 rounded-lg shadow-lg">
            <h3 className="text-2xl font-bold mb-4 text-center">Congratulations!</h3>
            <p className="text-lg text-center mb-2">
              Your Score: {score} / {questions.length}
            </p>
            <p
              className={`text-lg font-semibold text-center ${
                passStatus === 'Passed' ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {passStatus === 'Passed' ? 'You passed!' : 'Try Again!'}
            </p>
            <p className="text-center mt-4">You will be redirected shortly...</p>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default QuizPage;