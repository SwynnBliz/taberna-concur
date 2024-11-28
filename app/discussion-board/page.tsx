// app/discussion-board/page.tsx (Discussion Board Page)
'use client';
import Layout from '../../components/root/Layout'; 
import Forum from '../../components/forum/Forum'; 
import { useState, useEffect } from 'react';
import { AiOutlineClose } from 'react-icons/ai'; 

const DiscussionBoardPage = () => {
  
  const [showPopup, setShowPopup] = useState(false);

  
  useEffect(() => {
    const hasSeenPopup = localStorage.getItem('hasSeenPopup');
    if (!hasSeenPopup) {
      
      setShowPopup(true);
    }
  }, []);

  
  const handleClosePopup = () => {
    
    localStorage.setItem('hasSeenPopup', 'true');
    setShowPopup(false);
  };

  return (
    <Layout>
      <div className="bg-[#484242]">
        <Forum /> {/* Use Forum component */}

        {/* Popup (only shows once) */}
        {showPopup && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#2c2c2c] p-6 rounded-lg text-white w-3/4 md:w-1/2 relative">
            {/* Close Button - Positioned top-right inside container */}
            <button
              onClick={handleClosePopup}
              className="absolute top-2 right-2 bg-[#2c2c2c] text-white rounded-full p-1 hover:bg-yellow-500"
            >
              <AiOutlineClose size={20} />
            </button>
  
            <h2 className="text-xl mb-4 text-yellow-500">Welcome to TabernaConcur! 🍸</h2>
            <p className="text-sm">
              Join our online platform designed specifically for bartenders! 🎉 We offer a unique experience to help you collaborate, learn, and grow in the world of bartending. Whether you're planning a party with friends or diving into skill assessments, we’ve got you covered!
            </p>
            <p className="text-sm mt-2">
              Here's what you can expect from us:
            </p>
            <ul className="list-disc list-inside text-sm mt-2">
              <li><strong>Collaborative Alcohol Party Planning 🎊</strong>: Use our intuitive platform with a Weighted Average Algorithm and Threshold Setting to help you plan the perfect party with your friends and colleagues.</li>
              <li><strong>TESDA Quiz Assessment & Quiz Creation 📚</strong>: Take quizzes to test your knowledge and create your own quizzes for others to enjoy!</li>
              <li><strong>Discussion Board 🗨️</strong>: Engage with others, ask questions, and share insights on our discussion board.</li>
              <li><strong>Profile Management 👤</strong>: Customize and manage your personal profile easily!</li>
              <li><strong>Educational Module 🍹</strong>: Explore tips and tricks to level up your bartending skills and learn new techniques!</li>
              <li><strong>Drinks Database 📖</strong>: Browse our extensive database of drinks, from classic cocktails to creative new recipes, with detailed information on ingredients and preparation methods!</li>
            </ul>
            <p className="text-sm mt-4">
              We aim to foster a community where bartenders can share their experiences, improve their skills, and have fun doing it!
            </p>
          </div>
        </div>
        )}
      </div>
    </Layout>
  );
};

export default DiscussionBoardPage;