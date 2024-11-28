'use client';

import { useState, useEffect } from 'react';
import { firestore } from './../../app/firebase/config';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import Layout from '../../components/root/Layout';

interface Question {
  question: string;
  type: 'multiple-choice' | 'fill-in-the-blank';
  options?: string[];
  correctAnswer: string;
}

interface Quiz {
  name: string;
  code: string;
  id: string;
}

const QuizCreatorPage = () => {
  const [quizName, setQuizName] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    question: '',
    type: 'multiple-choice',
    options: [''],
    correctAnswer: '',
  });
  const [quizCode, setQuizCode] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [createdExams, setCreatedExams] = useState<Quiz[]>([]); 
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null); 
  const [showQuestions, setShowQuestions] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  
  useEffect(() => {
    const fetchQuizzes = async () => {
      const quizSnapshot = await getDocs(collection(firestore, 'quizzes'));
      const quizzes = quizSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Quiz[];

      setCreatedExams(quizzes);
    };

    fetchQuizzes();
  }, []);

  const handleAddQuestion = () => {
    if (!currentQuestion.question.trim() || !currentQuestion.correctAnswer.trim()) {
      alert('Please provide a question and correct answer.');
      return;
    }

    if (
      currentQuestion.type === 'multiple-choice' &&
      currentQuestion.options?.some(opt => !opt.trim())
    ) {
      alert('Please fill in all multiple-choice options!');
      return;
    }

    setQuestions([...questions, currentQuestion]);
    setCurrentQuestion({ question: '', type: 'multiple-choice', options: [''], correctAnswer: '' });
  };

  const handleCreateQuiz = async () => {
    if (!quizName.trim() || questions.length === 0) {
      alert('Please provide a quiz name and at least one question!');
      return;
    }

    try {
      
      const quizSnapshot = await getDocs(collection(firestore, 'quizzes'));
      const existingQuiz = quizSnapshot.docs.find(
        (doc) => doc.data().name.toLowerCase() === quizName.toLowerCase() || doc.data().code === quizName.toLowerCase().replace(/ /g, '_')
      );

      if (existingQuiz) {
        setErrorMessage('A quiz with this name or code already exists. Please choose another.');
        return;
      }

      const code = quizName.toLowerCase().replace(/ /g, '_');

      
      const quizRef = await addDoc(collection(firestore, 'quizzes'), {
        name: quizName,
        code,
        createdAt: new Date(),
      });

      
      await Promise.all(
        questions.map(question =>
          addDoc(collection(firestore, 'questions'), { quizId: quizRef.id, ...question })
        )
      );

      setQuizCode(code); 
      setQuizName(''); 
      setQuestions([]); 
      setErrorMessage(null); 
      alert('Quiz created successfully!');
      setShowModal(true); 
    } catch (error) {
      console.error('Error creating quiz:', error);
      alert('An error occurred while creating the quiz.');
    }
  };

  const handleViewQuestions = async (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setShowQuestions(true);

    
    const questionsSnapshot = await getDocs(collection(firestore, 'questions'));
    const quizQuestions = questionsSnapshot.docs
      .map(doc => doc.data())
      .filter((question: any) => question.quizId === quiz.id) as Question[];

    setQuestions(quizQuestions); 
  };

  const handleDeleteQuiz = async (quizId: string) => {
    try {
      
      await deleteDoc(doc(firestore, 'quizzes', quizId));

      
      const questionsSnapshot = await getDocs(collection(firestore, 'questions'));
      const questionsToDelete = questionsSnapshot.docs.filter(
        (doc) => doc.data().quizId === quizId
      );

      await Promise.all(
        questionsToDelete.map(questionDoc =>
          deleteDoc(doc(firestore, 'questions', questionDoc.id))
        )
      );

      alert('Quiz deleted successfully!');
      setCreatedExams(createdExams.filter(quiz => quiz.id !== quizId)); 
    } catch (error) {
      console.error('Error deleting quiz:', error);
      alert('An error occurred while deleting the quiz.');
    }
  };

  const handleUpdateQuiz = async (quizId: string) => {
    try {
      const updatedQuizName = prompt('Enter new quiz name:');
      if (!updatedQuizName) return;

      await updateDoc(doc(firestore, 'quizzes', quizId), { name: updatedQuizName });
      alert('Quiz updated successfully!');

      
      setCreatedExams(
        createdExams.map(quiz => (quiz.id === quizId ? { ...quiz, name: updatedQuizName } : quiz))
      );
    } catch (error) {
      console.error('Error updating quiz:', error);
      alert('An error occurred while updating the quiz.');
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

          {errorMessage && (
            <div className="text-red-500 text-sm mb-4">{errorMessage}</div>
          )}

          {/* Question Type */}
          <select
            value={currentQuestion.type}
            onChange={e =>
              setCurrentQuestion({
                ...currentQuestion,
                type: e.target.value as 'multiple-choice' | 'fill-in-the-blank',
              })
            }
            className="border-2 border-yellow-500 p-4 mb-4 w-full rounded-lg focus:ring focus:ring-yellow-300"
          >
            <option value="multiple-choice">Multiple Choice</option>
            <option value="fill-in-the-blank">Fill in the Blank</option>
          </select>

          {/* Current Question Input */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Enter a Question"
              value={currentQuestion.question}
              onChange={e => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
              className="border-2 border-yellow-500 p-4 mb-4 w-full rounded-lg focus:ring focus:ring-yellow-300"
            />
            {currentQuestion.type === 'multiple-choice' && (
              <div>
                {currentQuestion.options?.map((option, index) => (
                  <div key={index} className="mb-2 flex gap-2">
                    <input
                      type="text"
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={e => {
                        const updatedOptions = [...(currentQuestion.options || [])];
                        updatedOptions[index] = e.target.value;
                        setCurrentQuestion({ ...currentQuestion, options: updatedOptions });
                      }}
                      className="border-2 border-yellow-500 p-3 w-full rounded-lg focus:ring focus:ring-yellow-300"
                    />
                    <button
                      onClick={() => {
                        const updatedOptions = [...(currentQuestion.options || [])];
                        updatedOptions.splice(index, 1);
                        setCurrentQuestion({ ...currentQuestion, options: updatedOptions });
                      }}
                      className="bg-red-500 text-white p-2 rounded-lg"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  onClick={() =>
                    setCurrentQuestion({
                      ...currentQuestion,
                      options: [...(currentQuestion.options || []), ''],
                    })
                  }
                  className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg"
                >
                  Add Option
                </button>
              </div>
            )}
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
                {i + 1}. {q.type === 'multiple-choice' ? 'MCQ' : 'Fill in the Blank'} -{' '}{q.question}
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

          {/* View Created Exams Button */}
          <button
            onClick={() => setShowQuestions(!showQuestions)}
            className="bg-blue-500 hover:bg-blue-700 text-white py-3 px-6 rounded-lg w-full mt-6"
          >
            {showQuestions ? 'Hide Created Quizzes' : 'View Created Quizzes'}
          </button>

          {/* Show Created Quizzes */}
          {showQuestions && (
            <div className="mt-4 space-y-2">
              <h3 className="text-2xl font-semibold text-yellow-300">Created Quizzes:</h3>
              {createdExams.map(quiz => (
                <div
                  key={quiz.id}
                  className="bg-gray-700 p-4 mb-3 rounded-lg text-yellow-300 cursor-pointer hover:bg-yellow-500"
                  onClick={() => handleViewQuestions(quiz)}
                >
                  {quiz.name} (Code: {quiz.code})
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => handleUpdateQuiz(quiz.id)}
                      className="bg-blue-500 text-white py-2 px-4 rounded-lg"
                    >
                      Update
                    </button>
                    <button
                      onClick={() => handleDeleteQuiz(quiz.id)}
                      className="bg-red-500 text-white py-2 px-4 rounded-lg"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Show Created Quiz Questions */}
          {selectedQuiz && showQuestions && (
            <div className="mt-6">
              <h3 className="text-2xl font-semibold text-yellow-300">
                Questions for "{selectedQuiz.name}":
              </h3>
              {questions.map((q, index) => (
                <div
                  key={index}
                  className="bg-gray-700 p-4 mb-3 rounded-lg text-yellow-300"
                >
                  {index + 1}. {q.question}
                </div>
              ))}
            </div>
          )}

          {/* Quiz Code Modal */}
          {showModal && quizCode && (
            <div className="mt-6 text-center">
              <p className="text-lg">Your quiz code is: <strong>{quizCode}</strong></p>
              <button
                onClick={() => setShowModal(false)}
                className="mt-4 text-yellow-300 hover:text-yellow-400"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default QuizCreatorPage;