// components/root/Topbar.tsx
'use client'
import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { usePathname } from 'next/navigation';  
import { getAuth, signOut } from "firebase/auth"; 
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { FaSpinner } from "react-icons/fa";

const Topbar = ({ onLeftSidebarToggle }: { onLeftSidebarToggle: () => void }) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [loading, setLoading] = useState(true); 
  const [isAdmin, setIsAdmin] = useState(false); 
  const router = useRouter();
  const pathname = usePathname();  
  const firestore = getFirestore();
  const isOnAdminPage = pathname.includes("/admin");

  const handleProfileClick = () => {
    setIsProfileMenuOpen(!isProfileMenuOpen);
  };

  const handleLogout = async () => {
    try {
      await signOut(getAuth()); 
      router.push("/sign-in"); 
    } catch (error) {
      console.error("Error during logout: ", error);
    }
  };

  const handleNavigateHome = () => {
    if (isAdmin) {
      
      if (isOnAdminPage) {
        router.push("/admin-forum"); 
      } else {
        router.push("/forum"); 
      }
    } else {
      
      if (isOnAdminPage) {
        router.push("/admin-forum"); 
      } else {
        router.push("/forum"); 
      }
    }
  };

  
  const handleSidebarToggle = () => {
    setIsSidebarOpen((prev) => !prev);
    onLeftSidebarToggle(); 
  };

  
  useEffect(() => {
    const fetchUserData = async () => {
      const user = getAuth().currentUser;
      if (user) {
        const userRef = doc(firestore, "users", user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setProfilePhoto(userData?.profilePhoto || "https://via.placeholder.com/150");
          setIsAdmin(userData?.role === "admin");
        }
      } else {
        setProfilePhoto("https://via.placeholder.com/150");
      }
      setLoading(false); 
    };

    
    if (getAuth().currentUser) {
      fetchUserData();
    }

    
    const unsubscribe = getAuth().onAuthStateChanged(user => {
      if (user) {
        fetchUserData();
      }
    });

    
    return () => unsubscribe();
  }, [firestore]);

  const handleModeToggle = () => {
    if (isAdmin) {
      
      if (isOnAdminPage) {
        router.push("/forum"); 
      } else {
        router.push("/admin-forum"); 
      }
    } else {
      
      if (isOnAdminPage) {
        router.push("/forum"); 
      } else {
        router.push("/admin-forum"); 
      }
    }
  };

  return (
    <div className="sticky top-0 z-50 flex justify-between items-center bg-[#302C2C] text-white p-4 shadow-md">
      <div className="relative group">
        <button
          onClick={handleSidebarToggle} 
          className="hover:bg-yellow-500 rounded-full w-12 h-12 flex items-center justify-center transition-all"
        >
          <span className="text-white text-2xl">☰</span>
        </button>

        {/* Tooltip */}
        <div className="absolute bottom-1/4 transform translate-x-14 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
          {isSidebarOpen ? "Close Left Sidebar" : "Open Left Sidebar"}
        </div>
      </div>

      <div className="relative group">
        <button onClick={handleNavigateHome} className="text-yellow-500 italic island-moments font-semibold text-4xl">
          TabernaConcur
        </button>

        {/* Tooltip */}
        <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
          Go to Home Page
        </div>
      </div>
      
      <div className="relative group">
        <button
          onClick={handleProfileClick}
          className="w-10 h-10 rounded-full overflow-hidden relative transition-all"
        >
          <div className="absolute top-0 left-0 w-full h-full bg-yellow-500 opacity-0 hover:opacity-50 transition-all"></div>
          {/* Profile image */}
          {loading ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-400 animate-pulse rounded-full">
              <FaSpinner className="animate-spin text-white text-lg" />
            </div>
          ) : (
            <Image
              src={profilePhoto || "https://via.placeholder.com/150"}
              alt="Profile"
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          )}
        </button>

        {/* Tooltip */}
        <div className="absolute bottom-1/4 transform -translate-x-full hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
          Profile Menu
        </div>

        {isProfileMenuOpen && (
          <div className="absolute right-0 mt-2 bg-[#363232] text-black p-4 rounded-md shadow-lg w-48">
            {/* Mode toggle button */}
            {isAdmin && (
              <button
                onClick={handleModeToggle}
                className="w-full text-left px-4 py-2 mb-2 rounded-md hover:bg-yellow-500 transition duration-200 text-white"
              >
                {isOnAdminPage ? "User Mode" : "Admin Mode"}
              </button>
            )}
            <button
              onClick={() => router.push("/profile-manage")}
              className="w-full text-left px-4 py-2 mb-2 rounded-md hover:bg-yellow-500 transition duration-200 text-white"
            >
              Update Profile
            </button>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 rounded-md text-red-600 font-semibold hover:bg-red-300 transition duration-200"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Topbar;
