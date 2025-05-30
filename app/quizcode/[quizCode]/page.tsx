// app/quizcode/page.tsx (TESDA Take Page)
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { firestore, auth } from './../../../app/firebase/config';
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';
import Layout from '../../../components/root/Layout';
import emailjs from "emailjs-com";

const QuizPage = () => {
  const router = useRouter();
  const { quizCode } = useParams();
  const normalizedQuizCode = decodeURIComponent(Array.isArray(quizCode) ? quizCode[0] : quizCode ?? "");
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
  const [timer, setTimer] = useState<number>(15);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);
  const [quizStarted, setQuizStarted] = useState<boolean>(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState<boolean>(false);
  const passingPercentage = 60;

  const normalizeAnswer = (answer: string) =>
    answer.trim().replace(/[^\w\s]/g, '').toLowerCase();

  useEffect(() => {
    if (!quizCode) return;

    const fetchQuiz = async () => {
      try {
        console.log("Fetching quiz with code:", normalizedQuizCode); // Debugging
    
        const quizQuery = query(collection(firestore, 'quizzes'), where('code', '==', normalizedQuizCode));
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
          console.log("Quiz not found in Firestore for code:", normalizedQuizCode);
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

  const handleStartQuiz = () => {
    setQuizStarted(true);
    setTimer(30); // Start the timer
    setIsTimerRunning(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
      setTimer(30);
      setIsTimerRunning(true);
      setSelectedAnswer(null);
      setShowCorrectAnswer(false);
    } else {
      handleSubmit(answers);
    }
  };

  const handleAnswerSelection = async (answer: string) => {
    setSelectedAnswer(answer);
    setShowCorrectAnswer(true);
    setIsTimerRunning(false);

    const updatedAnswers = [...answers];
    updatedAnswers[currentQuestionIndex] = normalizeAnswer(answer);
    setAnswers(updatedAnswers);

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
  };

  const handleFillInAnswer = (e: React.ChangeEvent<HTMLInputElement>) => {
    const updatedAnswers = [...answers];
    updatedAnswers[currentQuestionIndex] = e.target.value; // Keep spaces as the user types
    setAnswers(updatedAnswers);
  };

  const handleAnswerSubmit = () => {
    handleAnswerSelection(answers[currentQuestionIndex]);
  };

  const sendQuizResult = (
    userEmail: string,
    userName: string, // Add user's name
    quizCode: string,
    score: number,
    percentage: number,
    passingPercentage: number
  ) => {
    emailjs
  .send(
    "service_20rlf32",
    "template_aq9jypi",
    {
      user_email: userEmail, // ✅ Correct (matches EmailJS template)
      name: userName,
      quiz_code: quizCode,
      score: score,
      percentage: percentage,
      status: percentage >= passingPercentage ? "Passed" : "Failed",
    },
    "VdJNrhaXpaf5ASiZ0"
  )

      .then(() => console.log(`✅ Email Sent Successfully to ${userEmail}`))
      .catch((error) =>
        console.error(`❌ Error sending email to ${userEmail}:`, error)
      );
  };
  
  
  const handleSubmit = async (finalAnswers: string[]) => {
    let score = 0;
    
    // ✅ Calculate Score
    questions.forEach((q, index) => {
      if (normalizeAnswer(finalAnswers[index]) === normalizeAnswer(q.correctAnswer)) {
        score++;
      }
    });
  
    const totalQuestions = questions.length;
    const percentage = (score / totalQuestions) * 100;
    const status = percentage >= passingPercentage ? "Passed" : "Failed";
  
    setScore(score);
    setPassStatus(status);
    setShowPopup(true);
  
    if (userEmail) {
      const user = auth.currentUser;
  
      if (user) {
        try {
          // ✅ Extract Name from Email
          const userName = userEmail
            .split("@")[0] // Take first part of email
            .replace(/[0-9]/g, "") // Remove numbers
            .replace(".", " ") // Replace dot with space
            .replace(/(^\w|\s\w)/g, (match) => match.toUpperCase()); // Capitalize first letters
  
          // ✅ Save Score to Firestore
          const scoreRef = doc(firestore, "quizScores", `${user.uid}_${normalizedQuizCode}`);
          await setDoc(scoreRef, {
            userId: user.uid,
            quizCode: quizCode,
            score,
            email: userEmail,
            percentage,
            passed: status === "Passed",
            createdAt: new Date(),
          });
  
          // ✅ Send Email with User's Name
          sendQuizResult(userEmail, userName, normalizedQuizCode, score, percentage, passingPercentage);
        } catch (error) {
          console.error("Error saving quiz result:", error);
        }
      }
    }
  
    // ✅ Delay before redirecting
    setTimeout(() => {
      router.push("/results");
    }, 5000);
  };
  
  // ✅ Loading and Error Handling
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#3A3A3A] text-white">
        <div className="text-xl font-semibold animate-pulse">Loading...</div>
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
  

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-screen bg-[#1F1F1F] text-[#E5E5E5] p-4 sm:p-6">
        <div className="bg-[#292929] text-[#FFC107] p-6 sm:p-8 rounded-lg shadow-lg w-full max-w-3xl">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-center text-[#FFC107]">
            {quiz?.name}
          </h2>
          {!quizStarted ? (
            <div className="text-center">
              <p className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">
                Get ready to start the quiz!
              </p>
              <button
                onClick={handleStartQuiz}
                className="bg-[#FFC107] hover:bg-[#FFD54F] text-[#292929] font-semibold py-3 px-6 rounded-lg shadow-lg transition duration-300"
              >
                Start Quiz
              </button>
            </div>
          ) : (
            <div className="bg-[#333333] p-4 sm:p-6 rounded-lg shadow-md">
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
                      className={`w-full py-3 px-4 sm:py-4 sm:px-6 rounded-lg shadow-lg transition duration-300 font-semibold ${
                        showCorrectAnswer
                          ? normalizeAnswer(opt) === normalizeAnswer(currentQuestion.correctAnswer)
                            ? 'bg-green-500 text-white'
                            : selectedAnswer === opt
                            ? 'bg-red-500 text-white'
                            : 'bg-[#FFC107] text-[#292929]'
                          : 'bg-[#FFC107] hover:bg-[#FFD54F] text-[#292929]'
                      }`}
                      disabled={showCorrectAnswer}
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
                    disabled={showCorrectAnswer}
                  />
                  <button
                    onClick={handleAnswerSubmit}
                    className="mt-4 w-full sm:w-auto bg-[#FFC107] hover:bg-[#FFD54F] text-[#292929] font-semibold py-2 px-4 rounded-lg transition duration-300"
                    disabled={showCorrectAnswer}
                  >
                    Submit Answer
                  </button>
                </div>
              ) : (
                <p className="text-center">Question type is not supported yet</p>
              )}

              {showCorrectAnswer && (
                <div className="text-center mt-4">
                  <button
                    onClick={handleNextQuestion}
                    className="bg-[#FFC107] hover:bg-[#FFD54F] text-[#292929] font-semibold py-2 px-6 rounded-lg shadow-lg transition duration-300"
                  >
                    Next Question
                  </button>
                </div>
              )}
            </div>
          )}
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
