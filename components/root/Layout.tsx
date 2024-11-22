// components/root/Layout.tsx
'use client';
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation"; // Import usePathname here
import TopBar from "./Topbar";
import RightSidebar from "./RightSidebar";
import LeftSidebar from "./LeftSideBar";
import { getAuth } from "firebase/auth";
import { app } from "../../app/firebase/config";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname(); // Use usePathname to get the current path
  const auth = getAuth(app);

  const [isLeftSidebarVisible, setIsLeftSidebarVisible] = useState(false);

  const handleLeftSidebarToggle = () => {
    setIsLeftSidebarVisible(!isLeftSidebarVisible);
  };

  // Check if the current route is the discussion-board route
  const isDiscussionBoard = pathname === '/discussion-board';

  // Check if the current route is the profile-view route
  const isProfileView = pathname.startsWith('/profile-view/');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/sign-in");
      }
    });

    return () => unsubscribe();
  }, [auth, router]);

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar onLeftSidebarToggle={handleLeftSidebarToggle} />
      <div className="flex flex-1 relative">
        {/* Left Sidebar */}
        <LeftSidebar 
          isVisible={isLeftSidebarVisible} 
          onClose={() => setIsLeftSidebarVisible(false)} 
        />

        {/* Main Content */}
        <main 
          className={`flex-1 bg-[#484242] overflow-auto ${isDiscussionBoard || isProfileView ? "mr-60" : ""}`}
        >
          {children}
        </main>

        {/* Conditionally Render Right Sidebar */}
        {(isDiscussionBoard || isProfileView) && <RightSidebar />}
      </div>
    </div>
  );
};

export default Layout;
