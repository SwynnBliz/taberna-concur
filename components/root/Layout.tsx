// components/root/Layout.tsx (Root Layout File)
'use client';
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation"; 
import TopBar from "./Topbar";
import RightSidebar from "./RightSidebar";
import LeftSidebar from "./LeftSideBar";
import { getAuth, User } from "firebase/auth";
import { app } from "../../app/firebase/config";
import { doc, onSnapshot } from "firebase/firestore";
import { firestore } from "../../app/firebase/config";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname(); 
  const auth = getAuth(app);
  const [isLeftSidebarVisible, setIsLeftSidebarVisible] = useState(false);
  const [isRightSidebarVisible, setIsRightSidebarVisible] = useState(false);

  const handleLeftSidebarToggle = () => {
    setIsLeftSidebarVisible(!isLeftSidebarVisible);
  };

  const handleRightSidebarToggle = () => {
    setIsRightSidebarVisible(!isRightSidebarVisible);
  };  

  const isForum = pathname.startsWith('/forum');
  const isProfileView = pathname.startsWith('/profile-view/');
  const isAdmin = pathname.includes("/admin");
  const isEducational = pathname.includes("educational");

  useEffect(() => {
    const checkUserStatus = async (user: User | null) => {
      if (!user) {
        router.push("/sign-in");
        return;
      }

      try {
        const settingsRef = doc(firestore, "settings", "disabledIds");

        // Listen for changes to the disabledIds array in the settings document
        const unsubscribeSettings = onSnapshot(settingsRef, (settingsDoc) => {
          if (settingsDoc.exists()) {
            const settingsData = settingsDoc.data();
            const disabledIds = settingsData?.disabledIds || [];

            // If the current user's ID is in the disabledIds, log them out and navigate to sign-in
            if (disabledIds.includes(user.uid)) {
              auth.signOut();
              alert("You have been banned, logging out. Please contact support.");

              setTimeout(() => {
                router.push("/sign-in");
              }, 2000);
            }
          }
        });

        return () => unsubscribeSettings();
      } catch (err) {
        console.error("Error checking disabled user status:", err);
      }
    };

    const unsubscribeAuth = auth.onAuthStateChanged((user: User | null) => {
      if (user) {
        checkUserStatus(user);
      }
    });

    // Cleanup auth state listener
    return () => unsubscribeAuth();
  }, [auth, router]);

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar 
        onLeftSidebarToggle={handleLeftSidebarToggle} 
        onRightSidebarToggle={handleRightSidebarToggle}
      />
      <div className="flex flex-1 relative">
        {/* Left Sidebar */}
        <LeftSidebar 
          isVisible={isLeftSidebarVisible} 
          onClose={() => setIsLeftSidebarVisible(false)} 
        />

        {/* Main Content */}
        <main 
          className={`flex-1 bg-[#484848] overflow-auto ${isForum || isProfileView || isAdmin || isEducational ? "lg:mr-60" : ""}`}
        >
          {children}
        </main>

        {/* Right Sidebar for Desktop */}
        {(isForum || isProfileView || isAdmin || isEducational) && (
          <div className="hidden lg:block">
            <RightSidebar />
          </div>
        )}

        {/* Right Sidebar for Mobile */}
        {isRightSidebarVisible && (
          <div className="fixed right-0 w-64 h-full z-40 lg:hidden">
            <RightSidebar />
          </div>
        )}
      </div>
    </div>
  );
};

export default Layout;
