'use client';
import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { usePathname } from 'next/navigation';  
import { getAuth, signOut } from "firebase/auth"; 
import { FaSpinner, FaBell, FaCheck, FaTrash } from "react-icons/fa";
import { getFirestore, collection, query, where, onSnapshot, getDoc, getDocs, writeBatch, updateDoc, deleteDoc, doc, orderBy } from "firebase/firestore";

interface Notification {
  id: string;
  content: string;
  read: boolean;
  userId: string;
  link: string;
}

const Topbar = ({ onLeftSidebarToggle }: { onLeftSidebarToggle: () => void }) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [loading, setLoading] = useState(true); 
  const [isAdmin, setIsAdmin] = useState(false); 
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false); // Track if notifications are open
  const router = useRouter();
  const pathname = usePathname();  
  const firestore = getFirestore();
  const isOnAdminPage = pathname.includes("/admin");

  useEffect(() => {
    const fetchNotifications = () => {
      const user = getAuth().currentUser;
      if (user) {
        const q = query(
          collection(firestore, "notifications"),
          where("userId", "==", user.uid),
          orderBy("timestamp", "desc") // Sorting by timestamp, latest first
        );
        // Listen for real-time updates
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          const notificationsData: any[] = [];
          querySnapshot.forEach((doc) => {
            notificationsData.push({ id: doc.id, ...doc.data() });
          });
          setNotifications(notificationsData);
          setUnreadCount(notificationsData.filter(notification => !notification.read).length);
        });
    
        return unsubscribe;
      }
    };
  
    if (getAuth().currentUser) {
      fetchNotifications();
    }
  
    const unsubscribeAuth = getAuth().onAuthStateChanged(user => {
      if (user) {
        fetchNotifications();
      }
    });
  
    return () => {
      unsubscribeAuth();
    };
  }, [firestore]);

  const handleNotificationClick = async (notificationId: string, link: string) => {
    try {
      const notificationRef = doc(firestore, "notifications", notificationId);
      await updateDoc(notificationRef, { read: true });
  
      // Directly update unread count without re-fetching
      setUnreadCount((prevCount) => prevCount - 1);
  
      // Navigate to the associated link
      router.push(link);
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };  

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

  const handleToggleNotifications = () => {
    setIsNotificationsOpen(!isNotificationsOpen);
  };

  useEffect(() => {
    const fetchUserData = async () => {
      const user = getAuth().currentUser;
      if (user) {
        const userRef = doc(firestore, "users", user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setProfilePhoto(userData?.profilePhoto || "/placeholder.jpg");
          setIsAdmin(userData?.role === "admin");
        }
      } else {
        setProfilePhoto("/placeholder.jpg");
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

  const handleMarkNotificationAsRead = async (notificationId: string) => {
    try {
      const notificationRef = doc(firestore, "notifications", notificationId);
      await updateDoc(notificationRef, { read: true });
  
      // Update the unread count locally
      setUnreadCount((prevCount) => prevCount - 1);
  
      // Optionally update the notifications array locally to reflect the read status
      setNotifications((prevNotifications) =>
        prevNotifications.map((notif) =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };  

  const handleMarkAllAsRead = async () => {
    try {
      const user = getAuth().currentUser;
      if (user) {
        // Update all notifications to 'read' for the current user
        const notificationsRef = collection(firestore, "notifications");
        const q = query(
          notificationsRef,
          where("userId", "==", user.uid),
          where("read", "==", false) // Only update unread notifications
        );
        const querySnapshot = await getDocs(q);
        const batch = writeBatch(firestore); // Use batch to update multiple notifications at once
        querySnapshot.forEach((doc) => {
          batch.update(doc.ref, { read: true });
        });
        await batch.commit();
        setUnreadCount(0); // Reset the unread count
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      // Delete the notification from Firestore
      await deleteDoc(doc(firestore, "notifications", notificationId));
  
      // Optionally update the state to remove the notification locally
      setNotifications((prevNotifications) =>
        prevNotifications.filter((notif) => notif.id !== notificationId)
      );
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  return (
    <div className="sticky top-0 z-50 flex justify-between items-center bg-[#302C2C] text-white p-4 shadow-md max-h-18">
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

      <div className="flex-1 text-center">
        <button onClick={handleNavigateHome} className="text-yellow-500 italic island-moments font-semibold text-4xl">
          TabernaConcur
        </button>

        {/* Tooltip */}
        <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
          Go to Home Page
        </div>
      </div>

      <div className="relative mr-4">
        <button
          className={`relative text-white transition-all ${isNotificationsOpen ? "bg-yellow-500 hover:bg-yellow-600" : "hover:bg-yellow-500"} rounded-full p-2`}
          onClick={handleToggleNotifications}
        >
          <FaBell size={24} />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        {isNotificationsOpen && (
          <div className="absolute right-0 mt-2 bg-[#3f3b3b] text-black p-4 rounded-md shadow-lg w-72 max-h-80 overflow-y-auto">
            {/* Mark All as Read Button */}
            <div className="flex justify-between items-center mb-2">
              <span className="text-white text-sm font-semibold">Notifications</span>
              <button
                onClick={handleMarkAllAsRead}
                className="text-white hover:text-yellow-500 p-2 rounded-full"
              >
                <FaCheck size={16} />
              </button>
            </div>
            {notifications.length === 0 ? (
              <div className="text-white text-center">You have no notifications</div>
            ) : (
              notifications.map((notification, index) => (
                <div
                  key={index}
                  className={`flex flex-col justify-between items-start mb-2 p-2 rounded-md cursor-pointer transition-all duration-200 ease-in-out ${notification.read ? "bg-transparent hover:bg-gray-700" : "bg-yellow-500 hover:bg-yellow-600"} hover:shadow-xl`}
                  onClick={() => handleNotificationClick(notification.id, notification.link)}
                >
                  <div className="flex justify-between items-center w-full">
                    <div className="text-white text-sm overflow-hidden text-ellipsis max-w-[calc(100%-50px)]">
                      {notification.content}
                    </div>
                    {/* Mark as read button */}
                    {!notification.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent navigating to the notification page
                          handleMarkNotificationAsRead(notification.id);
                        }}
                        className="text-white hover:text-yellow-500 ml-2"
                      >
                        <FaCheck size={16} />
                      </button>
                    )}
                    {/* Delete notification button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent navigating to the notification page
                        handleDeleteNotification(notification.id);
                      }}
                      className="text-white hover:text-red-500 ml-2"
                    >
                      <FaTrash size={16} />
                    </button>
                  </div>
                  <div className="text-xs text-gray-100 mt-1">
                    {notification.timestamp ? new Date(notification.timestamp.seconds * 1000).toLocaleString() : "Unknown time"}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
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
              src={profilePhoto || "/placeholder.jpg"}
              alt="Profile"
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          )}
        </button>

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
