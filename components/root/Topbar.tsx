// components/root/Topbar.tsx (Top Bar Component)
'use client';
import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { usePathname } from 'next/navigation';  
import { getAuth, signOut } from "firebase/auth"; 
import { FaSpinner, FaBell, FaCheck, FaTrash, FaBookmark } from "react-icons/fa";
import { getFirestore, collection, query, where, onSnapshot, getDoc, getDocs, writeBatch, updateDoc, deleteDoc, doc, orderBy } from "firebase/firestore";
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  content: string;
  read: boolean;
  userId: string;
  link: string;
}

const Topbar = ({ onLeftSidebarToggle, onRightSidebarToggle }: { onLeftSidebarToggle: () => void; onRightSidebarToggle: () => void; }) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [loading, setLoading] = useState(true); 
  const [isAdmin, setIsAdmin] = useState(false); 
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();  
  const firestore = getFirestore();
  const isOnAdminPage = pathname.includes("/admin");
  const [deleteNotificationPrompt, setDeleteNotificationPrompt] = useState(false);
  const [notificationIdToDelete, setNotificationIdToDelete] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [inviteCount, setInviteCount] = useState(0);

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      setUserId(user.uid);
    }
    
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserId(user.uid);
      }
    });
  
    return () => unsubscribe();
  }, []);  

  useEffect(() => {
    const fetchNotifications = () => {
      const user = getAuth().currentUser;
      if (user) {
        const q = query(
          collection(firestore, "notifications"),
          where("userId", "==", user.uid),
          orderBy("timestamp", "desc")
        );
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
  
  useEffect(() => {
    if (!userId) return;
  
    const auth = getAuth();
    const firestore = getFirestore();
  
    getDoc(doc(firestore, "users", userId)).then((userDoc) => {
      if (userDoc.exists()) {
        const userEmail = userDoc.data().email?.toLowerCase();
        if (!userEmail) return;
  
        const projectsRef = collection(firestore, "projects");
        const q = query(projectsRef, where("invitedEmails", "array-contains", userEmail));
  
        const unsubscribe = onSnapshot(q, (snapshot) => {
          setInviteCount(snapshot.size);
        });
  
        return () => unsubscribe();
      }
    });
  }, [userId]);  

  const handleNotificationClick = async (notificationId: string, link: string) => {
    try {
      const notificationRef = doc(firestore, "notifications", notificationId);
      await updateDoc(notificationRef, { read: true });
  
      setUnreadCount((prevCount) => prevCount - 1);
  
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

      setUnreadCount((prevCount) => prevCount - 1);

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
        const notificationsRef = collection(firestore, "notifications");
        const q = query(
          notificationsRef,
          where("userId", "==", user.uid),
          where("read", "==", false)
        );
        const querySnapshot = await getDocs(q);
        const batch = writeBatch(firestore);
        querySnapshot.forEach((doc) => {
          batch.update(doc.ref, { read: true });
        });
        await batch.commit();
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    setNotificationIdToDelete(notificationId);
    setDeleteNotificationPrompt(true);
  };

  const confirmDeleteNotification = async () => {
    try {
      if (!notificationIdToDelete) return;
      
      await deleteDoc(doc(firestore, "notifications", notificationIdToDelete));
      
      setNotifications((prevNotifications) =>
        prevNotifications.filter((notif) => notif.id !== notificationIdToDelete)
      );

      setDeleteNotificationPrompt(false);

    } catch (error) {
      console.error("Error deleting notification:", error);
      alert("Error deleting notification.");
    }
  };

  const cancelDeleteNotification = () => {
    setDeleteNotificationPrompt(false);
  };

  const formatTimestamp = (timestamp: any) => {
    return timestamp && timestamp.seconds
      ? formatDistanceToNow(new Date(timestamp.seconds * 1000), { addSuffix: true })
      : 'Invalid date';
  };

  return (
    <div className="h-12 p-2 | sm:h-18 sm:p-4 | sticky top-0 z-50 flex justify-between items-center bg-[#303030] text-white shadow-md">
      <div className="relative group">
        <button
          onClick={handleSidebarToggle} 
          className="w-8 h-8 | sm:w-11 sm:h-11 | relative hover:bg-yellow-500 rounded-full flex items-center justify-center transition-all"
        >
          <span className="text-sm | sm:text-2xl | text-white">☰</span>

          {inviteCount > 0 && (
            <span className="text-[10px] w-4 h-4 | sm:text-xs sm:w-5 sm:h-5 | absolute top-0 right-0 bg-red-500 text-white rounded-full flex items-center justify-center">
              {inviteCount}
            </span>
          )}
        </button>

        {/* Tooltip */}
        <div className="absolute bottom-1/4 transform translate-x-14 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
          {isSidebarOpen ? "Close Left Sidebar" : "Open Left Sidebar"}
        </div>
      </div>

      <div className="ml-6 | sm:ml-0 | flex-1 text-center">
        <button onClick={handleNavigateHome} className="text-md | sm:text-4xl | text-yellow-500 italic island-moments font-semibold">
          TabernaConcur
        </button>

        {/* Tooltip */}
        <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
          Go to Home Page
        </div>
      </div>

      <div className="sm:mr-4 | relative">
        <button
          className={`text-sm | sm:text-2xl | relative text-white transition-all ${isNotificationsOpen ? "bg-yellow-500 hover:bg-yellow-600" : "hover:bg-yellow-500"} rounded-full p-2`}
          onClick={handleToggleNotifications}
        >
          <FaBell/>
          {unreadCount > 0 && (
            <span className="text-[10px] w-4 h-4 | sm:text-xs sm:w-5 sm:h-5 | absolute top-0 right-0 bg-red-500 text-white rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        {isNotificationsOpen && (
          <div className="w-48 max-h-80 | sm:w-72 sm:max-h-96 | absolute right-0 mt-2 bg-[#383838] text-black p-4 rounded-md shadow-lg overflow-y-auto">
            {/* Mark All as Read Button */}
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] | sm:text-sm | text-white font-semibold">Notifications</span>
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs | sm:text-base | text-white hover:text-yellow-500 p-2 rounded-full"
              >
                <FaCheck/>
              </button>
            </div>
            {notifications.length === 0 ? (
              <div className="text-xs | sm:text-base | text-white text-center">You have no notifications</div>
            ) : (
              notifications.map((notification, index) => (
                <div
                  key={index}
                  className={`flex flex-col justify-between items-start mb-2 p-2 rounded-md cursor-pointer transition-all duration-200 ease-in-out ${notification.read ? "bg-transparent hover:bg-gray-700" : "bg-yellow-500 hover:bg-yellow-600"} hover:shadow-xl`}
                  onClick={() => handleNotificationClick(notification.id, notification.link)}
                >
                  <div className="text-[10px] | sm:text-sm | flex justify-between items-center w-full">
                    <div className="text-white overflow-hidden text-ellipsis max-w-[calc(100%-50px)]">
                      {notification.content}
                    </div>
                    {/* Mark as read button */}
                    {!notification.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkNotificationAsRead(notification.id);
                        }}
                        className="text-white hover:text-yellow-500 ml-2"
                      >
                        <FaCheck/>
                      </button>
                    )}
                    {/* Delete notification button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNotification(notification.id);
                      }}
                      className="text-white hover:text-red-500 ml-2"
                    >
                      <FaTrash/>
                    </button>
                  </div>
                  
                  <div className="text-[8px] | sm:text-xs | text-gray-100 mt-1">
                    {notification.timestamp ? formatTimestamp(notification.timestamp) : "Unknown time"}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {deleteNotificationPrompt && (
        <div className="fixed inset-0 bg-[#484848] bg-opacity-40 flex items-center justify-center z-50">
          <div className="w-10/12 text-xs | sm:w-auto sm:text-base | bg-[#2c2c2c] p-6 rounded-lg text-white text-center">
            <p>Are you sure you want to delete this notification? This cannot be undone!</p>
            <div className="mt-4 flex justify-center gap-4">
              <button
                onClick={confirmDeleteNotification}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Confirm
              </button>
              <button
                onClick={cancelDeleteNotification}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        className={`text-md mr-1 | sm:text-2xl sm:mr-4 | relative text-white transition-all rounded-full p-2 lg:hidden ${
          isSidebarOpen ? " hover:bg-yellow-500" : "hover:bg-yellow-500"
        }`}
        onClick={() => {
          setIsSidebarOpen(!isSidebarOpen);
          onRightSidebarToggle();
        }}
      >
        <FaBookmark/>
      </button>

      <div className="relative group">
        <button
          onClick={handleProfileClick}
          className="w-6 h-6 mt-2 | sm:w-10 sm:h-10 sm:mt-0 | rounded-full overflow-hidden relative transition-all"
        >
          <div className="absolute top-0 left-0 w-full h-full bg-yellow-500 opacity-0 hover:opacity-40 transition-all"></div>
          {/* Profile image */} 
          {loading ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-400 animate-pulse rounded-full">
              <FaSpinner className="text-sm | sm:text-lg | animate-spin text-white" />
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
          <div className="text-xs | sm:text-base | absolute right-0 mt-2 bg-[#383838] text-black p-4 rounded-md shadow-lg w-48">
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
