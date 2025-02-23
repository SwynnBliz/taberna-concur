// components/root/LeftSidebar.tsx (Leftside Bar Component)
import { useRouter } from 'next/navigation';
import { getAuth, signOut, onAuthStateChanged } from 'firebase/auth';
import { useState, useEffect } from 'react';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
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
      className={`fixed top-18 left-0 h-full w-64 bg-[#363232] text-white p-6 transition-all transform ${
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
                onClick={() => handleNavigate('/educational')}
              >
                Educational
              </button>
            </li>
            <li>
              <button
                className="w-full py-2 px-4 text-left hover:bg-yellow-500 hover:rounded-lg"
                onClick={() => handleNavigate('/forum')}
              >
                Collaborative
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
                  onClick={() => handleNavigate('/admin-educational')}
                >
                  Manage Tips
                </button>
              </li>
              <li>
                <button
                  className="w-full py-2 px-4 text-left hover:bg-yellow-500 hover:rounded-lg"
                  onClick={() => handleNavigate('/admin-drink')}
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
  );
};

export default LeftSidebar;