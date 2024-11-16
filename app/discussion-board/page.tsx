/** src/app/sign-up/page.tsx (Sign Up Page) */
'use client';

import { useRouter } from 'next/navigation';

const DashboardPage = () => {
  const router = useRouter();

  const handleProfile = () => {
    router.push('')
  }

  const handleLogout = () => {
    router.push('/sign-in'); // Redirect to sign-in page after logout
  };

  return (
    <div className="container">
      <h1 className="text-3xl font-bold mb-4">Welcome to Your Dashboard</h1>
      <button onClick={handleLogout} className="btn bg-red-500 hover:bg-red-600">
        Log Out
      </button>
    </div>
  );
};

export default DashboardPage;