'use client';
import { useState } from 'react';
import Link from 'next/link';

const HomePage = () => {
  // Initialize states based on localStorage directly in the state initialization
  const isPopupShown = localStorage.getItem('isPopupShown');
  const legalStatus = localStorage.getItem('isLegal');

  const [isLegal, setIsLegal] = useState<boolean | null>(
    isPopupShown ? (legalStatus === 'true' ? true : false) : null
  );

  // Handle user selection (Yes or No)
  const handleLegalSelection = (isMinor: boolean) => {
    const legalStatus = !isMinor; // If yes, user is legal
    setIsLegal(legalStatus); // Update state based on user choice
    localStorage.setItem('isLegal', legalStatus ? 'true' : 'false'); // Save to localStorage
    localStorage.setItem('isPopupShown', 'true'); // Mark popup as shown
  };

  return (
    <div className="relative h-screen bg-cover bg-center" style={{ backgroundImage: 'url(/assets/background.jpg)' }}>      <div className="relative z-10 flex items-center justify-center h-full w-full p-10">
        {isLegal === null ? (
          // Show popup if legal status is not determined yet (i.e., first visit)
          <div className="popup-overlay absolute inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center">
            <div className="popup p-6 rounded-lg shadow-transparent max-w-md w-full text-center">
              <h2 className="text-3xl font-bold text-white mb-4">Are you of legal age?</h2>
              <p className="text-white mb-4">You must be of legal age to view this website.</p>
              <div className="flex justify-center gap-4">
                <button
                  className="btn hover:bg-[#D6A336] bg-white text-black px-6 py-2 rounded-lg"
                  onClick={() => handleLegalSelection(false)} // User is not a minor
                >
                  Yes
                </button>
                <button
                  className="btn hover:bg-[#D6A336] bg-white text-black px-6 py-2 rounded-lg"
                  onClick={() => handleLegalSelection(true)} // User is a minor
                >
                  No
                </button>
              </div>
              <p className="text-white mb-4 text-sm">This site is intended for individuals of legal drinking age in the Philippines. By entering, you confirm that you meet the legal age requirement for alcohol consumption.</p>
            </div>
          </div>
        ) : isLegal ? (
          // If legal, show the homepage content with the login button
          <div className="bg-gray-800 bg-opacity-60 text-center text-white rounded-lg h-full w-full p-20">
            <h1 className="text-4xl font-bold mb-4 text-white">
              Welcome to <span className="text-[#D6A336]">Taberna Concur</span>
            </h1>
            <p className="text-lg mb-6">
              Taberna Concur is your ultimate online community for party planning! 
              <br />Whether you're organizing a small gathering or a grand celebration, our platform offers an easy way to collaborate
              <br />with friends, plan events, share ideas, and stay organized.
              <br />Join our community by logging in to start planning your next unforgettable event 
              <br />with our interactive features, event management tools, and personalized recommendations.
            </p>
            <div className="text-center">
              <Link href="/sign-in" className="text-black btn bg-white hover:bg-[#D6A336] px-6 py-2">
                Sign In
              </Link>
            </div>
          </div>
        ) : (
          // If not legal, show the warning message
          <div className="bg-gray-800 bg-opacity-60 text-center text-white rounded-lg h-full w-full p-20">
            <h1 className="text-3xl font-bold text-white mb-4">You must be of legal age to view this website</h1>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;