// app/editExam/[quizCode]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { firestore } from "../../firebase/config";
import { collection, doc, getDoc, updateDoc, query, where, getDocs } from "firebase/firestore";
import Layout from "../../../components/root/Layout";

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
}

const EditExamPage = () => {
  const params = useParams();
  const quizCode = params?.quizCode;
  const router = useRouter();

  const [quizData, setQuizData] = useState<{ id: string; name: string; code: string } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editedQuizName, setEditedQuizName] = useState("");
  const [editedQuizCode, setEditedQuizCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!quizCode) {
      setError("Invalid quiz code.");
      setLoading(false);
      return;
    }

    const fetchQuizData = async () => {
      setLoading(true);
      try {
        const quizQuery = query(collection(firestore, "quizzes"), where("code", "==", quizCode));
        const quizSnapshot = await getDocs(quizQuery);

        if (quizSnapshot.empty) {
          setError("Quiz not found.");
          setLoading(false);
          return;
        }

        const quizDoc = quizSnapshot.docs[0];
        const quizId = quizDoc.id;
        const quizInfo = quizDoc.data();

        setQuizData({ id: quizId, name: quizInfo.name, code: quizInfo.code });
        setEditedQuizName(quizInfo.name);
        setEditedQuizCode(quizInfo.code);

        const questionsQuery = query(collection(firestore, "questions"), where("quizId", "==", quizId));
        const questionsSnapshot = await getDocs(questionsQuery);
        const questionsData: Question[] = questionsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Question[];

        setQuestions(questionsData);
      } catch (err) {
        console.error("Error fetching quiz data:", err);
        setError("Error loading quiz data.");
      } finally {
        setLoading(false);
      }
    };

    fetchQuizData();
  }, [quizCode]);

  const handleSaveChanges = async () => {
    if (!quizData) return;

    try {
      const quizRef = doc(firestore, "quizzes", quizData.id);
      await updateDoc(quizRef, { name: editedQuizName, code: editedQuizCode });

      const updatePromises = questions.map((question) => {
        const questionRef = doc(firestore, "questions", question.id);
        return updateDoc(questionRef, {
          question: question.question,
          options: question.options,
          correctAnswer: question.correctAnswer,
        });
      });

      await Promise.all(updatePromises);
      alert("Quiz updated successfully!");
      router.push("/create");
    } catch (err) {
      console.error("Error updating quiz:", err);
      alert("Failed to save changes.");
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#2e2e2e] text-white">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-lg text-yellow-400 font-semibold">Loading Quiz...</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#2e2e2e] text-red-500 text-lg font-semibold">
        {error}
      </div>
    );

  return (
    <Layout>
  <div className="min-h-screen p-10 bg-[#2c2c2c] text-white flex justify-center items-center">
    <div className="w-full max-w-4xl bg-opacity-90 bg-[#2c2c2c] backdrop-blur-md p-8 rounded-2xl shadow-[0_4px_20px_rgba(255,255,0,0.3)] border border-yellow-500 transition-all hover:shadow-[0_8px_30px_rgba(255,255,0,0.5)]">
      <h2 className="text-5xl font-extrabold text-yellow-500 mb-6 text-center text-yellow-300 drop-shadow-lg animate-pulse tracking-wide uppercase">Edit Quiz</h2>

      {/* Edit Quiz Name & Code */}
      <div className="bg-[#1f1f1f] p-6 rounded-lg shadow-lg border border-gray-700">
        <label className="block text-xl text-yellow-500 font-semibold">Quiz Name:</label>
        <input
          type="text"
          value={editedQuizName}
          onChange={(e) => setEditedQuizName(e.target.value)}
          className="w-full p-3 bg-[#2c2c2c] text-white border border-yellow-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all"
        />

        <label className="block text-xl text-yellow-500 font-semibold mt-4">Quiz Code:</label>
        <input
          type="text"
          value={editedQuizCode}
          onChange={(e) => setEditedQuizCode(e.target.value)}
          className="w-full p-3 bg-[#2c2c2c] text-white border border-yellow-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all"
        />
      </div>

      {/* Edit Questions */}
      <div className="mt-8 bg-[#1f1f1f] p-6 rounded-lg shadow-lg border border-gray-700">
        <h3 className="text-3xl font-bold  text-yellow-500 text-yellow-300 drop-shadow-lg animate-pulse mb-6 text-center uppercase">Edit Questions</h3>
        {questions.map((question, index) => (
          <div key={question.id} className="mb-8 bg-[#2c2c2c] p-4 rounded-lg shadow-md border border-yellow-500 transition-all hover:shadow-lg">
            <label className="block text-xl text-yellow-500 font-semibold">Question {index + 1}:</label>
            <input
              type="text"
              value={question.question}
              onChange={(e) => {
                const newQuestions = [...questions];
                newQuestions[index].question = e.target.value;
                setQuestions(newQuestions);
              }}
              className="w-full p-3 bg-[#1f1f1f] text-white border border-yellow-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all"
            />

            <label className="block text-xl text-yellow-500 font-semibold mt-4">Options:</label>
            {question.options.map((option, optIndex) => (
              <input
                key={optIndex}
                type="text"
                value={option}
                onChange={(e) => {
                  const newQuestions = [...questions];
                  newQuestions[index].options[optIndex] = e.target.value;
                  setQuestions(newQuestions);
                }}
                className="w-full p-2 bg-[#1f1f1f] text-white border border-yellow-500 rounded-lg mt-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all"
              />
            ))}

            <label className="block text-xl text-yellow-500 font-semibold mt-4">Correct Answer:</label>
            <input
              type="text"
              value={question.correctAnswer}
              onChange={(e) => {
                const newQuestions = [...questions];
                newQuestions[index].correctAnswer = e.target.value;
                setQuestions(newQuestions);
              }}
              className="w-full p-2 bg-[#1f1f1f] text-white border border-yellow-500 rounded-lg mt-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all"
            />
          </div>
        ))}
      </div>

      {/* Save Changes Button */}
      <div className="flex justify-center mt-8">
        <button
          onClick={handleSaveChanges}
          className="bg-yellow-500 text-black font-bold py-4 px-8 rounded-lg shadow-xl hover:bg-yellow-600 transition-all text-xl hover:scale-105"
        >
          Save Changes
        </button>
      </div>
    </div>
  </div>
</Layout>
  );
};

export default EditExamPage;
