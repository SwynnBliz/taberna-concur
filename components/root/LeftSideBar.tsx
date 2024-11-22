// components/root/LeftSidebar.tsx
import { useRouter } from 'next/navigation';
import { getAuth, signOut } from 'firebase/auth';
import { useState, useEffect } from 'react';

interface LeftSidebarProps {
  isVisible: boolean;
  onClose: () => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ isVisible, onClose }) => {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Get the current user's ID from Firebase Authentication
  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      setUserId(user.uid);
    }
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

  return (
    <div
      className={`fixed top-18 left-0 h-full w-64 bg-[#363232] text-white p-6 transition-all transform ${
        isVisible ? 'translate-x-0' : '-translate-x-full'
      }`}
      style={{ zIndex: 1000 }}
    >
      <ul className="space-y-4">
        <li>
          <button
            className="w-full py-2 px-4 text-left hover:bg-yellow-500 hover:rounded-lg"
            onClick={() => router.push('/discussion-board')}
          >
            Home
          </button>
        </li>
        <li>
          <button
            className="w-full py-2 px-4 text-left hover:bg-yellow-500 hover:rounded-lg"
            onClick={() => router.push('/discussion-board')}
          >
            Educational
          </button>
        </li>
        <li>
          <button
            className="w-full py-2 px-4 text-left hover:bg-yellow-500 hover:rounded-lg"
            onClick={() => router.push('/quiz')}
          >
            Quiz
          </button>
        </li>
        <li>
          <button
            className="w-full py-2 px-4 text-left hover:bg-yellow-500 hover:rounded-lg"
            onClick={() => router.push('/discussion-board')}
          >
            Collaboration
          </button>
        </li>
        <li>
          {/* Dynamically navigate to the user's profile using their UID */}
          <button
            className="w-full py-2 px-4 text-left hover:bg-yellow-500 hover:rounded-lg"
            onClick={() => userId && router.push(`/profile-view/${userId}`)}
          >
            Profile
          </button>
        </li>
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
