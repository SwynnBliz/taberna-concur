'use client';
import { useState, useEffect } from "react";
import { useSignInWithEmailAndPassword } from 'react-firebase-hooks/auth';
import { useRouter } from 'next/navigation';
import { auth, googleProvider } from '../firebase/config';
import { signInWithPopup } from "firebase/auth";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [passwordVisible, setPasswordVisible] = useState(false); // State to toggle password visibility

  const [signInWithEmailAndPassword, user, loading, error] = useSignInWithEmailAndPassword(auth);
  const router = useRouter();

  const handleEmailPasswordSignIn = async (e: any) => {
    e.preventDefault();
    setErrorMessage("");
    try {
      await signInWithEmailAndPassword(email, password);
      setEmail("");
      setPassword("");
    } catch (e) {
      console.error("Error signing in:", e);
      setErrorMessage("Error signing in. Please try again.");
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        router.push('/');
      }
    } catch (e) {
      console.error("Error with Google Sign-In:", e);
      setErrorMessage("Google sign-in failed. Please try again.");
    }
  };

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-cover bg-center"
      style={{ backgroundImage: "url('https://wallup.net/wp-content/uploads/2019/09/929884-liquor-alcohol-spirits-poster-drinks-drink-whiskey.jpg')" }}
    >
      <div className="bg-white/30 border border-white rounded-lg backdrop-blur-md p-8 shadow-lg w-full max-w-md">
        <h1 className="text-5xl font-bold text-center text-white mb-4">
          <span style={{ fontFamily: "Arial, sans-serif" }}>Welcome to </span>
          <span className="text-yellow-500 italic island-moments">TabernaConcur</span>
        </h1>

        <button
          onClick={handleGoogleSignIn}
          aria-label="Continue with Google"
          className="w-full flex items-center justify-center py-2 mt-4 mb-4 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 border border-gray-300"
        >
          <img
            src="https://logos-world.net/wp-content/uploads/2020/09/Google-Symbol.png"
            alt="Google Icon"
            className="w-6 h-4 mr-2"
          />
          Continue with Google
        </button>

        <div className="flex items-center my-4">
          <div className="border-t border-gray-400 flex-grow"></div>
          <span className="mx-4 text-white font-semibold">OR</span>
          <div className="border-t border-gray-400 flex-grow"></div>
        </div>

        <form onSubmit={handleEmailPasswordSignIn} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            aria-label="Enter your email"
            className="w-full px-4 py-2 rounded-md text-gray-800 outline-none focus:ring-2 focus:ring-yellow-500 bg-white/90 placeholder-gray-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          
          {/* Password field */}
          <div className="relative">
            <input
              type={passwordVisible ? "text" : "password"}
              placeholder="Password"
              aria-label="Enter your password"
              className="w-full px-4 py-2 rounded-md text-gray-800 outline-none focus:ring-2 focus:ring-yellow-500 bg-white/90 placeholder-gray-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setPasswordVisible(!passwordVisible)}
              className="absolute right-4 top-2 text-gray-500"
              aria-label="Show/Hide Password"
            >
              {passwordVisible ? "Hide" : "Show"}
            </button>
          </div>

          <button
            type="submit"
            aria-label="Click to login using your user credential"
            className="w-full py-2 mt-4 bg-yellow-500 text-white font-semibold rounded-md hover:bg-yellow-600"
            disabled={loading}
          >
            {loading ? "Signing In..." : "Log In"}
          </button>
          {errorMessage && <p className="text-red-500 mt-4 text-center" aria-live="polite">{errorMessage}</p>}
          {error && !errorMessage && <p className="text-red-500 mt-4 text-center" aria-live="polite">{error.message}</p>}

          {/* Link to Sign Up */}
          <div className="text-center mt-4">
            <p className="text-white">
              Don't have an account?{" "}
              <a href="/sign-up" className="text-yellow-500 hover:underline">Sign Up</a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignIn;
