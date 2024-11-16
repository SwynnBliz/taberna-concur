"use client"; // This directive makes this file a Client Component

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AgeVerification() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  const handleYesClick = () => {
    router.push("/sign-up");
  };

  const handleNoClick = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-cover bg-center"
      style={{
        backgroundImage:
          "url('https://wallup.net/wp-content/uploads/2019/09/929884-liquor-alcohol-spirits-poster-drinks-drink-whiskey.jpg')",
      }}
    >
      <div className="bg-white/20 border border-white rounded-lg backdrop-blur-md p-8 shadow-lg w-full max-w-md">
        <h1 className="text-5xl font-bold text-center text-white mb-6">
          <span style={{ fontFamily: "Arial, sans-serif" }}>Welcome to </span>
          <span className="text-yellow-500 italic island-moments">
            TabernaConcur
          </span>
        </h1>

        <p className="text-lg text-center text-white mb-8">
          Are you of legal age (18 years old)?
        </p>

        <div className="flex gap-4 justify-center">
          <button
            onClick={handleYesClick}
            aria-label="Click if you are of legal age to enter website"
            className="w-1/2 py-2 border border-[#D6A336] bg-[#2B1A0A] text-white font-semibold rounded-md hover:bg-transparent transition duration-200"
          >
            Yes
          </button>
          <button
            onClick={handleNoClick}
            aria-label="Click if you are not of legal age to enter website"
            className="w-1/2 py-2 border border-[#D6A336] bg-[#2B1A0A] text-white font-semibold rounded-md hover:bg-transparent transition duration-200"
          >
            No
          </button>
        </div>

        <p className="text-sm mt-6 text-center text-white">
          This site is intended for individuals of legal drinking age in the
          Philippines. By entering, you confirm that you meet the legal age
          requirement for alcohol consumption.
        </p>
      </div>

      {/* Modal */}
      {showModal && (
        <div     role="dialog" aria-labelledby="modal-title" aria-describedby="modal-description" className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 shadow-lg text-center">
            <p className="text-lg font-medium mb-4">
              Sorry, you must be of legal drinking age to enter this site.
            </p>
            <button
              onClick={closeModal}
              aria-label="Click to close the restriction modal popup"
              className="w-1/2 py-2 border border-[#D6A336] bg-[#2B1A0A] text-white font-semibold rounded-md hover:bg-opacity-40 transition duration-200"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
