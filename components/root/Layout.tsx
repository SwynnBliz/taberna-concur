// components/root/Layout.tsx (Root Layout File)
'use client';
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation"; 
import TopBar from "./Topbar";
import RightSidebar from "./RightSidebar";
import LeftSidebar from "./LeftSideBar";
import { getAuth } from "firebase/auth";
import { app } from "../../app/firebase/config";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname(); 
  const auth = getAuth(app);
  const [isLeftSidebarVisible, setIsLeftSidebarVisible] = useState(false);

  const handleLeftSidebarToggle = () => {
    setIsLeftSidebarVisible(!isLeftSidebarVisible);
  };

  const isForum = pathname === '/forum';
  const isProfileView = pathname.startsWith('/profile-view/');
  const isPostView = pathname.startsWith('/post-view/');
  const isAdmin = pathname.includes("/admin");
  const isEducational = pathname.includes("educational");

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
          className={`flex-1 bg-[#484242] overflow-auto ${isForum || isProfileView || isPostView || isAdmin || isEducational ? "mr-60" : ""}`}
        >
          {children}
        </main>

        {/* Conditionally Render Right Sidebar */}
        {(isForum|| isProfileView || isPostView || isAdmin || isEducational) && <RightSidebar />}
      </div>
    </div>
  );
};

export default Layout;
