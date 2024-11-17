// components/root/Topbar.tsx
'use client'
import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const Topbar = ({ onLeftSidebarToggle }: { onLeftSidebarToggle: () => void }) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null); // Allow null
  const router = useRouter();
  const authInstance = getAuth();
  const firestore = getFirestore();

  const handleProfileClick = () => {
    setIsProfileMenuOpen(!isProfileMenuOpen);
  };

  const handleLogout = () => {
    router.push("/sign-in");
  };

  const handleNavigateHome = () => {
    router.push("/discussion-board");
  };

  // Fetch user data (including profile photo) from Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      const user = authInstance.currentUser;
      if (user) {
        const userRef = doc(firestore, "users", user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          setProfilePhoto(userDoc.data()?.profilePhoto || "https://via.placeholder.com/150"); // Default image if no profile photo
        }
      }
    };

    fetchUserData();
  }, [authInstance.currentUser, firestore]);

  return (
    <div className="sticky top-0 z-50 flex justify-between items-center bg-[#302C2C] text-white p-4 shadow-md">
      <button onClick={onLeftSidebarToggle}>
        <span className="text-white text-2xl">☰</span>
      </button>
      <button onClick={handleNavigateHome} className="text-yellow-500 italic island-moments font-semibold text-4xl">
        TabernaConcur
      </button>
      <div className="relative">
        <button onClick={handleProfileClick} className="w-10 h-10 rounded-full overflow-hidden">
          <Image
            src={profilePhoto || "https://via.placeholder.com/150"} // Fallback to default image if profilePhoto is null
            alt="Profile"
            width={40}
            height={40}
            className="w-full h-full object-cover"
          />
        </button>
        {isProfileMenuOpen && (
          <div className="absolute right-0 mt-2 bg-white text-black p-4 rounded-md shadow-lg">
            <button onClick={() => router.push("/profile")}>Update Profile</button>
            <button onClick={handleLogout}>Logout</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Topbar;
