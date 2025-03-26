// app/create/page.tsx (TESDA Create Page)
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
  const code = quizName.toLowerCase().replace(/[^a-zA-Z0-9@&_.-]/g, '');
  const [createdExams, setCreatedExams] = useState<Quiz[]>([]); 
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null); 
  const [showQuestions, setShowQuestions] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null); // New state for file upload
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedQuiz, setEditedQuiz] = useState<Quiz | null>(null);
  const [editedQuizName, setEditedQuizName] = useState("");


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
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  // Function to parse text file and add questions
  const handleUploadFile = async () => {
    if (!file) {
      alert('Please upload a valid file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const parsedQuestions = parseQuestions(text);
      setQuestions([...questions, ...parsedQuestions]); // Add parsed questions to existing questions
      alert('Questions uploaded successfully!');
    };
    reader.readAsText(file);
  };

  // Function to parse questions from text file
  const parseQuestions = (text: string): Question[] => {
    const lines = text.split("\n").filter((line) => line.trim() !== "");
    const questions: Question[] = [];
    let currentQuestion: Question | null = null;

    lines.forEach((line) => {
      if (/^\d+\./.test(line)) {
        if (currentQuestion) questions.push(currentQuestion);
        currentQuestion = { question: line.replace(/^\d+\.\s*/, ""), type: "multiple-choice", options: [], correctAnswer: "" };
      } else if (/^[A-D]\)/.test(line)) {
        currentQuestion?.options?.push(line);
      } else if (/^Correct Answer:/.test(line)) {
        if (currentQuestion) {
          currentQuestion.correctAnswer = line.replace(/^Correct Answer:\s*/, "");
        }
      }
    });

    if (currentQuestion) questions.push(currentQuestion);
    return questions;
  };

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
      // Ensure unique quiz name or code
      const quizSnapshot = await getDocs(collection(firestore, 'quizzes'));
      const existingQuiz = quizSnapshot.docs.find(
        (doc) =>
          doc.data().name.toLowerCase() === quizName.toLowerCase() ||
          doc.data().code === quizName.toLowerCase().replace(/ /g, '_')
      );
  
      if (existingQuiz) {
        setErrorMessage('A quiz with this name or code already exists. Please choose another.');
        return;
      }
  
      // Generate quiz code with allowed characters only
      const code = quizName.toLowerCase().replace(/[^a-zA-Z0-9@&_]/g, '');
  
      const quizRef = await addDoc(collection(firestore, 'quizzes'), {
        name: quizName,
        code,
        createdAt: new Date(),
      });
  
      // Save questions to Firestore
      await Promise.all(
        questions.map((question) =>
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
  
  const handleSaveQuiz = (quiz: Quiz | null) => {
    if (!quiz) return; // Prevent saving if there's no quiz selected
    
    const updatedExams = createdExams.map((q) =>
      q.code === quiz.code ? { ...q, name: editedQuizName } : q
    );
    
    setCreatedExams(updatedExams);
    setShowEditModal(false);
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

  const handleUpdateQuiz = async (quizId: string, newName: string) => {
    try {
      if (!newName.trim()) {
        alert("Quiz name cannot be empty.");
        return;
      }
  
      await updateDoc(doc(firestore, "quizzes", quizId), { name: newName });
      alert("Quiz updated successfully!");
  
      // Update state
      setCreatedExams(
        createdExams.map((quiz) =>
          quiz.id === quizId ? { ...quiz, name: newName } : quiz
        )
      );
    } catch (error) {
      console.error("Error updating quiz:", error);
      alert("An error occurred while updating the quiz.");
    }
  };
  

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-screen bg-[#1F1F1F] text-yellow-400 px-4 sm:px-8 md:px-12 lg:px-20 xl:px-32"
      style={{ backgroundImage: "url('/Background.png')", backgroundSize: "cover" }}>
        <div className="bg-gray-800 bg-opacity-90 backdrop-blur-lg text-yellow-400 p-8 sm:p-10 md:p-12 rounded-2xl shadow-2xl w-full max-w-3xl border border-yellow-500 relative">
          <h2 className="text-4xl sm:text-5xl font-extrabold mb-6 text-center text-yellow-300 drop-shadow-lg animate-pulse">
            Create a Quiz
          </h2>
          
          {/* Quiz Name */}
          <input
  type="text"
  placeholder="Quiz Name"
  value={quizName}
  onChange={(e) => setQuizName(e.target.value.replace(/[^a-zA-Z0-9@&_]/g, ''))}
  className="border-2 border-yellow-500 p-4 mb-6 w-full rounded-lg focus:ring focus:ring-yellow-400 bg-transparent text-yellow-200 placeholder-yellow-400"
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
            className="border-2 border-yellow-500 p-4 mb-4 w-full rounded-lg focus:ring focus:ring-yellow-400 bg-transparent text-yellow-200"
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
              className="border-2 border-yellow-500 p-4 mb-4 w-full rounded-lg focus:ring focus:ring-yellow-400 bg-transparent text-yellow-200"
            />
            {currentQuestion.type === 'multiple-choice' && (
              <div>
                {currentQuestion.options?.map((option, index) => (
                  <div key={index} className="mb-2 flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={e => {
                        const updatedOptions = [...(currentQuestion.options || [])];
                        updatedOptions[index] = e.target.value;
                        setCurrentQuestion({ ...currentQuestion, options: updatedOptions });
                      }}
                      className="border-2 border-yellow-500 p-3 w-full rounded-lg focus:ring focus:ring-yellow-400 bg-transparent text-yellow-200"
                    />
                    <button
                      onClick={() => {
                        const updatedOptions = [...(currentQuestion.options || [])];
                        updatedOptions.splice(index, 1);
                        setCurrentQuestion({ ...currentQuestion, options: updatedOptions });
                      }}
                      className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-700"
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
                  className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg w-full sm:w-auto"
                >
                  Add Option
                </button>
              </div>
            )}
  
            {/* File Upload Section */}
            <div className="mb-4">
              <input type="file" accept=".txt" onChange={handleFileChange} className="mb-2 bg-transparent text-yellow-200" />
              <button onClick={handleUploadFile} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                Upload Questions
              </button>
            </div>
  
            <input
              type="text"
              placeholder="Correct Answer"
              value={currentQuestion.correctAnswer}
              onChange={e =>
                setCurrentQuestion({ ...currentQuestion, correctAnswer: e.target.value })
              }
              className="border-2 border-yellow-500 p-4 mt-4 w-full rounded-lg focus:ring focus:ring-yellow-400 bg-transparent text-yellow-200"
            />
          </div>
  
          {/* Buttons */}
          <button
            onClick={handleAddQuestion}
            className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-lg w-full mb-6 transition-all duration-300 shadow-lg hover:shadow-yellow-500"
          >
            Add Question
          </button>
  
          <button
            onClick={handleCreateQuiz}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg w-full transition-all duration-300 shadow-lg hover:shadow-green-500"
          >
            Create Quiz
          </button>

{/* Button to Open Modal */}
<button
  onClick={() => setShowQuestions(true)}
  className="bg-blue-500 hover:bg-blue-700 text-white py-3 px-6 rounded-lg w-full mt-6"
>
  View Created Quizzes
</button>

{/* Modal for Created Quizzes */}
{showQuestions && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-lg relative">
      
      {/* Close Button */}
      <button
        onClick={() => setShowQuestions(false)}
        className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded"
      >
        ✖
      </button>

      <h3 className="text-2xl font-semibold text-yellow-300 mb-4">Created Quizzes</h3>
      
      {/* List of Quizzes */}
      <div className="space-y-2">
        {createdExams.map((quiz) => (
          <div
            key={quiz.id}
            className="flex justify-between items-center bg-gray-700 p-4 rounded-lg text-yellow-300 cursor-pointer hover:bg-yellow-500 transition-all"
          >
            <span>{quiz.name} (Code: {quiz.code})</span>

            <div className="flex gap-2">
              {/* Edit Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent clicking the quiz from opening it
                  setEditedQuiz(quiz);
                  setEditedQuizName(quiz.name);
                  setShowEditModal(true);
                }}
                className="bg-yellow-500 hover:bg-yellow-700 text-white text-sm px-3 py-1 rounded"
              >
                ✏ Edit
              </button>

              {/* Delete Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteQuiz(quiz.id);
                }}
                className="bg-red-500 hover:bg-red-700 text-white text-sm px-3 py-1 rounded"
              >
                🗑 Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Quiz Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md relative">
            
            {/* Close Button */}
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded"
            >
              ✖
            </button>

            <h3 className="text-2xl font-semibold text-yellow-300 mb-4">
              Edit Quiz
            </h3>

            {/* Input Field */}
            <input
              type="text"
              className="w-full p-2 mb-4 rounded bg-gray-700 text-white"
              value={editedQuizName}
              onChange={(e) => setEditedQuizName(e.target.value)}
            />

            {/* Save Button */}
            <button
              onClick={() => handleSaveQuiz(editedQuiz)}
              className="bg-green-500 hover:bg-green-700 text-white py-2 px-4 rounded w-full"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
)}


   </div>
 </div>
    </Layout>
  );
};

export default QuizCreatorPage;