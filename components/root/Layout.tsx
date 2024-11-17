// components/root/Layout.tsx
'use client';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TopBar from "./Topbar";
import RightSidebar from "./RightSidebar";
import LeftSidebar from "./LeftSideBar";
import { getAuth } from "firebase/auth";
import { app } from "../../app/firebase/config";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const auth = getAuth(app);

  const [isLeftSidebarVisible, setIsLeftSidebarVisible] = useState(false);

  const handleLeftSidebarToggle = () => {
    setIsLeftSidebarVisible(!isLeftSidebarVisible);
  };

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
      <div className="flex flex-1">
        {/* Left Sidebar */}
        <LeftSidebar 
          isVisible={isLeftSidebarVisible} 
          onClose={() => setIsLeftSidebarVisible(false)} 
        />

        {/* Main Content */}
        <main className="flex-1 bg-gray-50 overflow-auto">{children}</main>

        {/* Right Sidebar */}
        <RightSidebar />
      </div>
    </div>
  );
};

export default Layout;
