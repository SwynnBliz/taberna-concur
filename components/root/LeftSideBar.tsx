// components/root/LeftSidebar.tsx (Leftside Bar Component)
import { useRouter } from 'next/navigation';
import { getAuth, signOut, onAuthStateChanged } from 'firebase/auth';
import { useState, useEffect } from 'react';
import { getFirestore, doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { usePathname } from 'next/navigation';

interface LeftSidebarProps {
  isVisible: boolean;
  onClose: () => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ isVisible, onClose }) => {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);  
  const pathname = usePathname(); 
  const [inviteCount, setInviteCount] = useState(0);
  
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid); 

        
        const firestore = getFirestore();
        const userRef = doc(firestore, "users", user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setIsAdmin(userData?.role === "admin"); 
        }
      } else {
        setUserId(null); 
      }
    });

    
    return () => unsubscribe();
  }, []);

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

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const auth = getAuth();

    try {
      await signOut(auth);  
      router.push('/sign-in');  
    } catch (error) {
      console.error('Error during logout: ', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleNavigate = (path: string) => {
    router.push(path);
    onClose(); 
  };

  return (
    <div
      className={`fixed top-18 left-0 h-full w-64 bg-[#383838] text-white p-6 transition-all transform ${
        isVisible ? 'translate-x-0' : '-translate-x-full'
      }`}
      style={{ zIndex: 1000 }}
    >
      <ul className="space-y-4">
        {/* Show these buttons if user is not on admin page */}
        {!pathname.includes("/admin") ? (
          <>
            <li>
              <button
                className="w-full py-2 px-4 text-left hover:bg-yellow-500 hover:rounded-lg"
                onClick={() => handleNavigate('/forum')}
              >
                Home
              </button>
            </li>
            <li>
              <button
                className="w-full py-2 px-4 text-left hover:bg-yellow-500 hover:rounded-lg"
                onClick={() => userId && router.push(`/profile-view/${userId}`)}
              >
                Profile
              </button>
            </li>
            <li>
              <button
                className="w-full py-2 px-4 text-left hover:bg-yellow-500 hover:rounded-lg"
                onClick={() => handleNavigate('/educational-tip')}
              >
                Educational
              </button>
            </li>
            <li>
              <button
                className="relative w-full py-2 px-4 text-left hover:bg-yellow-500 hover:rounded-lg flex items-center justify-between"
                onClick={() => handleNavigate('/collaborative')}
              >
                Collaborative
                {inviteCount > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {inviteCount}
                  </span>
                )}
              </button>
            </li>
            <li>
              <button
                className="w-full py-2 px-4 text-left hover:bg-yellow-500 hover:rounded-lg"
                onClick={() => handleNavigate('/quiz')}
              >
                TESDA
              </button>
            </li>
            
          </>
        ) : (
          /* Show these buttons if user is on an admin page and is an admin */
          isAdmin && (
            <>
              <li>
                <button
                  className="w-full py-2 px-4 text-left hover:bg-yellow-500 hover:rounded-lg"
                  onClick={() => handleNavigate('/admin-forum')}
                >
                  Manage Posts
                </button>
              </li>
              <li>
                <button
                  className="w-full py-2 px-4 text-left hover:bg-yellow-500 hover:rounded-lg"
                  onClick={() => handleNavigate('/admin-user')}
                >
                  Manage Users
                </button>
              </li>
              <li>
                <button
                  className="w-full py-2 px-4 text-left hover:bg-yellow-500 hover:rounded-lg"
                  onClick={() => handleNavigate('/admin-educational-tip')}
                >
                  Manage Tips
                </button>
              </li>
              <li>
                <button
                  className="w-full py-2 px-4 text-left hover:bg-yellow-500 hover:rounded-lg"
                  onClick={() => handleNavigate('/admin-educational-drink')}
                >
                  Manage Drinks
                </button>
              </li>
              <li>
                <button
                  className="w-full py-2 px-4 text-left hover:bg-yellow-500 hover:rounded-lg"
                  onClick={() => handleNavigate('/admin-filter')}
                >
                  Settings
                </button>
              </li>
            </>
          )
        )}
        {/* Bottom SideBar */}
        <div className="absolute bottom-20 left-0 w-full px-6">
          <hr className="border-gray-50 my-2" />
          <ul className="space-y-2">
            <li>
              <button
                className="w-full py-2 px-4 text-left hover:bg-yellow-500 hover:rounded-lg"
                onClick={() => handleNavigate('/contact-support')}
              >
                Contact Support
              </button>
            </li>
            {/* Show logout button on both modes */}
            <li>
              <button
                className="w-full py-2 px-4 text-left text-red-600 font-semibold hover:bg-red-300 hover:rounded-lg"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </li>
          </ul>
        </div>
      </ul>
    </div>
  );
};

export default LeftSidebar;
