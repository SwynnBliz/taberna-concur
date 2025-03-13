// app/forum/page.tsx (Forum Page)
'use client';
import Layout from '../../components/root/Layout'; 
import Forum from '../../components/forum/Forum'; 
import { useState, useEffect } from 'react';
import { AiOutlineClose } from 'react-icons/ai'; 

const ForumPage = () => {
  
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
      <div className="bg-[#484848]">
        <Forum />
        
        {showPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="w-[90%] sm:w-1/2 bg-[#2c2c2c] p-6 rounded-lg text-white relative max-h-[80vh] overflow-y-auto">
              {/* Close Button */}
              <button
                onClick={handleClosePopup}
                className="absolute top-2 right-2 bg-[#2c2c2c] text-white rounded-full p-1 hover:bg-yellow-500"
              >
                <AiOutlineClose size={20} />
              </button>

              <h2 className="text-base sm:text-xl mb-4 text-yellow-500 text-center">
                Welcome to TabernaConcur! 🍸
              </h2>
              <p className="text-xs sm:text-sm text-center">
                Join our online platform designed specifically for bartenders! 🎉 We offer a unique experience to help you collaborate, learn, and grow in the world of bartending. Whether you're planning a party with friends or diving into skill assessments, we’ve got you covered!
              </p>
              <p className="text-xs sm:text-sm mt-2 text-center">
                Here's what you can expect from us:
              </p>

              <ul className="text-xs sm:text-sm list-disc list-inside mt-2 space-y-2">
                <li>
                  <strong>Collaborative Alcohol Party Planning 🎊</strong>: Use our intuitive platform with a Weighted Average Algorithm and Threshold Setting to help you plan the perfect party with your friends and colleagues.
                </li>
                <li>
                  <strong>TESDA Quiz Assessment 📚</strong>: Take TESDA standard quizzes to test your knowledge with Bartending!
                </li>
                <li>
                  <strong>Forum 🗨️</strong>: Engage with others, ask questions, and share insights on our forum.
                </li>
                <li>
                  <strong>Profile Management 👤</strong>: Customize and manage your personal profile easily!
                </li>
                <li>
                  <strong>Educational Module 🍹</strong>: Explore tips and tricks to level up your bartending skills and learn new techniques!
                </li>
                <li>
                  <strong>Drinks Database 📖</strong>: Browse our extensive database of drinks, from classic cocktails to creative new recipes, with detailed information on ingredients and preparation methods!
                </li>
              </ul>

              <p className="text-xs sm:text-sm mt-4 text-center">
                We aim to foster a community where bartenders can share their experiences, improve their skills, and have fun doing it!
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ForumPage;