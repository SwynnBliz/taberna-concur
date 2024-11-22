'use client';

import { useState } from 'react';
import { firestore } from './../../app/firebase/config';
import { collection, addDoc } from 'firebase/firestore';
import Layout from '../../components/root/Layout';

interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
}

const QuizCreatorPage = () => {
  const [quizName, setQuizName] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: '',
  });
  const [quizCode, setQuizCode] = useState<string | null>(null);

  const handleAddQuestion = () => {
    if (!currentQuestion.question.trim() || currentQuestion.options.some(opt => !opt.trim())) {
      alert('Please fill in all fields for the question and options!');
      return;
    }

    if (questions.length >= 60) {
      alert('You can only add up to 60 questions.');
      return;
    }

    setQuestions([...questions, currentQuestion]);
    setCurrentQuestion({ question: '', options: ['', '', '', ''], correctAnswer: '' });
  };

  const handleCreateQuiz = async () => {
    if (!quizName.trim() || questions.length === 0) {
      alert('Please provide a quiz name and at least one question!');
      return;
    }

    try {
      const code = quizName.toLowerCase().replace(/ /g, '_');

      // Save quiz
      const quizRef = await addDoc(collection(firestore, 'quizzes'), {
        name: quizName,
        code,
        createdAt: new Date(),
      });

      // Save questions
      await Promise.all(
        questions.map(question =>
          addDoc(collection(firestore, 'questions'), { quizId: quizRef.id, ...question })
        )
      );

      setQuizCode(code); // Display the code to the user
      setQuizName('');
      setQuestions([]);
      alert('Quiz created successfully!');
    } catch (error) {
      console.error('Error creating quiz:', error);
      alert('An error occurred while creating the quiz.');
    }
  };

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-screen bg-gray-800 text-yellow-400 px-4">
        <div className="bg-gray-900 text-yellow-400 p-8 rounded-xl shadow-2xl w-full max-w-3xl">
          <h2 className="text-4xl font-extrabold mb-6 text-center text-yellow-300">
            Create a Quiz
          </h2>

          {/* Quiz Name */}
          <input
            type="text"
            placeholder="Quiz Name"
            value={quizName}
            onChange={e => setQuizName(e.target.value)}
            className="border-2 border-yellow-500 p-4 mb-6 w-full rounded-lg focus:ring focus:ring-yellow-300"
          />

          {/* Current Question Input */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Enter a Question"
              value={currentQuestion.question}
              onChange={e => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
              className="border-2 border-yellow-500 p-4 mb-4 w-full rounded-lg focus:ring focus:ring-yellow-300"
            />
            <div className="grid grid-cols-2 gap-4">
              {currentQuestion.options.map((option, index) => (
                <input
                  key={index}
                  type="text"
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={e => {
                    const updatedOptions = [...currentQuestion.options];
                    updatedOptions[index] = e.target.value;
                    setCurrentQuestion({ ...currentQuestion, options: updatedOptions });
                  }}
                  className="border-2 border-yellow-500 p-3 rounded-lg focus:ring focus:ring-yellow-300"
                />
              ))}
            </div>
            <input
              type="text"
              placeholder="Correct Answer"
              value={currentQuestion.correctAnswer}
              onChange={e =>
                setCurrentQuestion({ ...currentQuestion, correctAnswer: e.target.value })
              }
              className="border-2 border-yellow-500 p-4 mt-4 w-full rounded-lg focus:ring focus:ring-yellow-300"
            />
          </div>

          {/* Add Question Button */}
          <button
            onClick={handleAddQuestion}
            className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-lg w-full mb-6 transition-all duration-300 shadow-lg"
          >
            Add Question
          </button>

          {/* Display Added Questions */}
          <div className="mb-6">
            <h3 className="text-2xl font-semibold mb-4 text-yellow-300">Questions Added:</h3>
            {questions.map((q, i) => (
              <div
                key={i}
                className="bg-gray-700 p-3 mb-2 rounded-lg shadow-md border border-yellow-400 text-yellow-300"
              >
                {i + 1}. {q.question}
              </div>
            ))}
          </div>

          {/* Create Quiz Button */}
          <button
            onClick={handleCreateQuiz}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg w-full transition-all duration-300 shadow-lg"
          >
            Create Quiz
          </button>

          {/* Display Quiz Code */}
          {quizCode && (
            <div className="mt-6 text-center text-green-600 font-semibold">
              <p>
                Quiz created successfully! Share this code: <strong>{quizCode}</strong>
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default QuizCreatorPage;
