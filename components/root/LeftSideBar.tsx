// components/root/LeftSidebar.tsx
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
  const [isAdmin, setIsAdmin] = useState(false);  // Track if the user is an admin
  const pathname = usePathname(); // To track the current route
  
  // Listen for changes in authentication state
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid); // Set the userId when the user is logged in

        // Fetch user role from Firestore
        const firestore = getFirestore();
        const userRef = doc(firestore, "users", user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setIsAdmin(userData?.role === "admin"); // Set isAdmin based on Firestore role field
        }
      } else {
        setUserId(null); // Clear the userId if the user is logged out
      }
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const auth = getAuth();

    try {
      await signOut(auth);  // Sign out the user from Firebase Authentication
      router.push('/sign-in');  // Redirect to the sign-in page
    } catch (error) {
      console.error('Error during logout: ', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleNavigate = (path: string) => {
    router.push(path);
    onClose(); // Close the sidebar after navigation
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
                onClick={() => handleNavigate('/discussion-board')}
              >
                Home
              </button>
            </li>
            <li>
              <button
                className="w-full py-2 px-4 text-left hover:bg-yellow-500 hover:rounded-lg"
                onClick={() => handleNavigate('/discussion-board')}
              >
                Educational
              </button>
            </li>
            <li>
              <button
                className="w-full py-2 px-4 text-left hover:bg-yellow-500 hover:rounded-lg"
                onClick={() => handleNavigate('/quiz')}
              >
                Quiz
              </button>
            </li>
            <li>
              <button
                className="w-full py-2 px-4 text-left hover:bg-yellow-500 hover:rounded-lg"
                onClick={() => handleNavigate('/discussion-board')}
              >
                Collaboration
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
                  onClick={() => handleNavigate('/admin-discussion-board')}
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
                  onClick={() => handleNavigate('/admin-discussion-board')}
                >
                  Settings
                </button>
              </li>
            </>
          )
        )}

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