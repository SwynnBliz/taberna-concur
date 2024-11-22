'use client';

import { useState } from 'react';
import { firestore } from './../../app/firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Layout from '../../components/root/Layout';

const QuizTakePage = () => {
  const [quizCode, setQuizCode] = useState<string>('');
  const [quiz, setQuiz] = useState<any>(null);

  const handleJoinQuiz = async () => {
    if (!quizCode.trim()) {
      alert('Please enter a valid quiz code!');
      return;
    }

    try {
      const quizzesRef = collection(firestore, 'quizzes');
      const quizQuery = query(quizzesRef, where('code', '==', quizCode));
      const querySnapshot = await getDocs(quizQuery);

      if (querySnapshot.empty) {
        alert('Quiz not found! Please check the code.');
        return;
      }

      const quizData = querySnapshot.docs[0].data();
      setQuiz(quizData);
      alert(`Joined quiz: ${quizData.name}`);
    } catch (error) {
      console.error('Error fetching quiz:', error);
      alert('Error fetching quiz data');
    }
  };

  return (
    <Layout>
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Take a Quiz</h2>
      <input
        type="text"
        placeholder="Enter Quiz Code"
        value={quizCode}
        onChange={e => setQuizCode(e.target.value)}
        className="border p-2 mb-4 w-full"
      />
      <button onClick={handleJoinQuiz} className="bg-blue-500 text-white p-2 rounded">
        Join Quiz
      </button>
      {quiz && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold">Quiz Details</h3>
          <p>Quiz Name: {quiz.name}</p>
        </div>
      )}
    </div>
    </Layout>
  );
};

export default QuizTakePage;
