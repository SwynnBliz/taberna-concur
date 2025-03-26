'use client';
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation"; 
import TopBar from "./Topbar";
import RightSidebar from "./RightSidebar";
import LeftSidebar from "./LeftSideBar";
import { getAuth, User, onAuthStateChanged } from "firebase/auth";
import { app } from "../../app/firebase/config";
import { doc, onSnapshot } from "firebase/firestore";
import { firestore } from "../../app/firebase/config";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname(); 
  const auth = getAuth(app);
  const [isLeftSidebarVisible, setIsLeftSidebarVisible] = useState(false);
  const [isRightSidebarVisible, setIsRightSidebarVisible] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [user, setUser] = useState<User | null>(null);

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
  const isCollaborative = /^\/collaborative\/[^/]+(\/.*)?$/.test(pathname);

  useEffect(() => {
    let authTimeout: NodeJS.Timeout;
    
    const checkUserStatus = (user: User | null) => {
      if (!user) {
        router.push("/sign-in");
        return;
      }

      try {
        const settingsRef = doc(firestore, "settings", "disabledIds");

        // Listen for ban status updates
        const unsubscribeSettings = onSnapshot(settingsRef, (settingsDoc) => {
          if (settingsDoc.exists()) {
            const settingsData = settingsDoc.data();
            const disabledIds = settingsData?.disabledIds || [];

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

    authTimeout = setTimeout(() => {
      const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
        setUser(firebaseUser);
        setIsAuthChecked(true); // Mark authentication as checked

        if (firebaseUser) {
          checkUserStatus(firebaseUser);
        } else {
          router.push("/sign-in");
        }
      });

      return () => unsubscribeAuth();
    }, 25000); // Wait 5 seconds before checking authentication

    return () => clearTimeout(authTimeout); // Cleanup timeout on unmount
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

        {/* Main Content - Keep Structure but Hide `children` Until Auth is Checked */}
        <main 
          className={`flex-1 bg-[#484848] overflow-auto ${isForum || isProfileView || isAdmin || isEducational || isCollaborative ? "lg:mr-60" : ""}`}
        >
          {!isAuthChecked || !user ? (
            <div className="flex justify-center items-center h-full text-white text-lg">
              Loading...
            </div>
          ) : (
            children
          )}
        </main>

        {/* Right Sidebar for Desktop */}
        {(isForum || isProfileView || isAdmin || isEducational || isCollaborative) && (
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
