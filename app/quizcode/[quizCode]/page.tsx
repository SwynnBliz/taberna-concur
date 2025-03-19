// app/quizcode/page.tsx (TESDA Take Page)
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { firestore, auth } from './../../../app/firebase/config';
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';
import Layout from '../../../components/root/Layout';

const QuizPage = () => {
  const router = useRouter();
  const { quizCode } = useParams();
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [passStatus, setPassStatus] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [flipped, setFlipped] = useState<boolean>(false);
  const [timer, setTimer] = useState<number>(15);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);
  const passingPercentage = 60;

  const normalizeAnswer = (answer: string) =>
    answer.trim().replace(/[^\w\s]/g, '').toLowerCase();

  useEffect(() => {
    if (!quizCode) return;

    const fetchQuiz = async () => {
      try {
        const quizQuery = query(collection(firestore, 'quizzes'), where('code', '==', quizCode));
        const quizSnapshot = await getDocs(quizQuery);

        if (!quizSnapshot.empty) {
          const quizDoc = quizSnapshot.docs[0];
          setQuiz(quizDoc.data());
          const quizId = quizDoc.id;

          const questionsQuery = query(collection(firestore, 'questions'), where('quizId', '==', quizId));
          const questionsSnapshot = await getDocs(questionsQuery);
          const questionsData = questionsSnapshot.docs.map((doc) => doc.data());
          setQuestions(questionsData);

          // Initialize answers array
          setAnswers(Array(questionsData.length).fill(''));
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
    const user = auth.currentUser;
    if (user) {
      setUserEmail(user.email);
    }
  }, []);

  useEffect(() => {
    if (isTimerRunning && timer > 0) {
      const interval = setInterval(() => {
        setTimer((prevTime) => prevTime - 1);
      }, 1000);

      return () => clearInterval(interval);
    } else if (timer === 0) {
      handleAnswerSelection('');
    }
  }, [timer, isTimerRunning]);

  const handleAnswerSelection = async (answer: string) => {
    const updatedAnswers = [...answers];
    updatedAnswers[currentQuestionIndex] = normalizeAnswer(answer);
    setAnswers(updatedAnswers);
  
    setFlipped(true); // Start flip effect
    setIsTimerRunning(false);
  
    // Save answer to Firebase immediately
    if (userEmail) {
      const user = auth.currentUser;
      if (user) {
        const responseRef = doc(
          firestore,
          'quizResponses',
          `${user.uid}_${quizCode}_${currentQuestionIndex}`
        );
        await setDoc(responseRef, {
          userId: user.uid,
          quizCode: quizCode,
          questionIndex: currentQuestionIndex,
          question: questions[currentQuestionIndex]?.question,
          userAnswer: normalizeAnswer(answer),
          correctAnswer: normalizeAnswer(questions[currentQuestionIndex]?.correctAnswer),
          createdAt: new Date(),
        });
      }
    }
  
    // Change question immediately while keeping smooth flip effect
    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
        setTimer(30);
        setIsTimerRunning(true);
      } else {
        handleSubmit(updatedAnswers);
      }
    }, 300); // Shorter delay, so the question loads fast
  
    // Reset flip after next question is set
    setTimeout(() => {
      setFlipped(false);
    }, 200); // Keep flip effect smooth without extra wait
  };

  const handleFillInAnswer = (e: React.ChangeEvent<HTMLInputElement>) => {
    const updatedAnswers = [...answers];
    updatedAnswers[currentQuestionIndex] = e.target.value; // Keep spaces as the user types
    setAnswers(updatedAnswers);
  };

  const handleAnswerSubmit = () => {
    handleAnswerSelection(answers[currentQuestionIndex]);
  };

  const handleSubmit = async (finalAnswers: string[]) => {
    let score = 0;
    questions.forEach((q, index) => {
      const userAnswer = normalizeAnswer(finalAnswers[index]);
      const correctAnswer = normalizeAnswer(q.correctAnswer);

      if (userAnswer === correctAnswer) {
        score++;
      }
    });

    const totalQuestions = questions.length;
    const percentage = (score / totalQuestions) * 100;

    setScore(score);
    setPassStatus(percentage >= passingPercentage ? 'Passed' : 'Failed');
    setShowPopup(true);

    if (userEmail) {
      const user = auth.currentUser;
      if (user) {
        const scoreRef = doc(firestore, 'quizScores', `${user.uid}_${quizCode}`);
        await setDoc(scoreRef, {
          userId: user.uid,
          quizCode: quizCode,
          score,
          email: userEmail,
          createdAt: new Date(),
        });
      }
    }

    setTimeout(() => {
      router.push('/join');
    }, 5000);
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
      <div className="flex items-center justify-center min-h-screen bg-[#1F1F1F] text-[#E5E5E5] p-4 sm:p-6">
  <div className="bg-[#292929] text-[#FFC107] p-6 sm:p-8 rounded-lg shadow-lg w-full max-w-3xl">
    <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-center text-[#FFC107]">
      {quiz?.name}
    </h2>
    <div className={`flip-container ${flipped ? 'flipped' : ''}`}>
      <div className="flipper bg-[#333333] p-4 sm:p-6 rounded-lg shadow-md">
        <p className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-center">
          {currentQuestionIndex + 1}. {currentQuestion?.question}
        </p>
        <p className="text-center text-yellow-500 mb-4 text-lg sm:text-xl">{timer}s</p>
        
        {currentQuestion?.type === 'multiple-choice' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {currentQuestion?.options.map((opt: string, i: number) => (
              <button
                key={i}
                onClick={() => handleAnswerSelection(opt)}
                className="w-full bg-[#FFC107] hover:bg-[#FFD54F] text-[#292929] font-semibold py-3 px-4 sm:py-4 sm:px-6 rounded-lg shadow-lg transition duration-300"
              >
                {opt}
              </button>
            ))}
          </div>
        ) : currentQuestion?.type === 'fill-in-the-blank' ? (
          <div className="w-full">
            <input
              type="text"
              placeholder="Your Answer"
              value={answers[currentQuestionIndex] || ''}
              onChange={handleFillInAnswer}
              className="border-2 border-yellow-500 p-3 sm:p-4 w-full rounded-lg focus:ring focus:ring-yellow-300 text-black"
            />
            <button
              onClick={handleAnswerSubmit}
              className="mt-4 w-full sm:w-auto bg-[#FFC107] hover:bg-[#FFD54F] text-[#292929] font-semibold py-2 px-4 rounded-lg transition duration-300"
            >
              Submit Answer
            </button>
          </div>
        ) : (
          <p className="text-center">Question type is not supported yet</p>
        )}
      </div>
    </div>
  </div>
</div>

{showPopup && (
  <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center p-4 sm:p-6">
    <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg text-center max-w-md w-full">
      <p className={`text-xl sm:text-2xl font-semibold mb-4 ${passStatus === 'Passed' ? 'text-green-500' : 'text-red-500'}`}>
        {passStatus === 'Passed'
          ? '🎉 Congratulations! You Passed!'
          : '❌ You Did Not Pass This Time'}
      </p>
      <p className="text-lg sm:text-xl mb-4 sm:mb-6 text-gray-800">
        {passStatus === 'Passed'
          ? 'Well done on successfully completing the quiz!'
          : 'Don’t give up! Review and try again.'}
      </p>
      <p className="text-lg sm:text-xl font-medium text-gray-900">
        Your score: {score} / {questions.length} ({((score / questions.length) * 100).toFixed(2)}%)
      </p>
    </div>
  </div>
)}
    </Layout>
  );
};

export default QuizPage;