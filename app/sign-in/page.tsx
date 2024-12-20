// app/sign-in/page.tsx (Sign In Page)
'use client';

import { useState, useEffect } from "react";
import { useSignInWithEmailAndPassword } from 'react-firebase-hooks/auth';
import { useRouter } from 'next/navigation';
import { auth, googleProvider } from '../firebase/config';
import { signInWithPopup } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { FcGoogle } from "react-icons/fc";
import { FirebaseError } from 'firebase/app';

const SignInPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [signInWithEmailAndPassword, user, loading, error] = useSignInWithEmailAndPassword(auth);

  const router = useRouter();
  const firestore = getFirestore();

  
  const getErrorMessage = (error: any) => {
    if (error) {
      const errorMessage = error.message;
      
      if (errorMessage.includes('auth/user-disabled')) {
        return "Your account has been disabled.";
      }
      
      if (errorMessage.includes('auth/user-not-found')) {
        return "No user found with this email address.";
      }
      if (errorMessage.includes('auth/wrong-password')) {
        return "Incorrect password. Please try again.";
      }
      
      return "Error signing in. Please try again.";
    }
    return "";
  };

  useEffect(() => {
    if (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }, [error]);

  const handleEmailPasswordSignIn = async (e: any) => {
    e.preventDefault();
    setErrorMessage(""); 

    try {
      await signInWithEmailAndPassword(email, password);
    } catch (e) {
      console.error(e); 
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(""); 
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userRef = doc(firestore, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        const defaultUsername = user.email?.split('@')[0];
        await setDoc(userRef, {
          email: user.email,
          username: defaultUsername,
          createdAt: new Date(),
          visibility: 'public',
          role: 'user',
        });
      }
      router.push('/forum');
    } catch (e) {
      if (e instanceof FirebaseError) {
        if (e.code === 'auth/user-disabled') {
          setErrorMessage("Your account has been disabled.");
        } else {
          setErrorMessage("Google sign-in failed. Please try again.");
        }
      } else {
        setErrorMessage("An unexpected error occurred. Please try again.");
      }
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        router.push('/forum');
      }
    });
    return () => unsubscribe(); 
  }, [router]);

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-cover bg-center"
      style={{ backgroundImage: "url('https://wallup.net/wp-content/uploads/2019/09/929884-liquor-alcohol-spirits-poster-drinks-drink-whiskey.jpg')" }}
    >
      <div className="bg-white/20 border border-white rounded-lg backdrop-blur-md p-8 shadow-lg w-full max-w-md">
        <h1 className="text-5xl font-bold text-center text-white mb-4">
          <span>Welcome to </span>
          <span className="text-yellow-500 italic island-moments">TabernaConcur</span>
        </h1>

        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center py-2 mt-4 mb-4 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 border border-gray-300"
        >
          <FcGoogle className="w-4 h-4 mr-2" />
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
            className="w-full px-4 py-2 rounded-md bg-white/90"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="relative">
            <input
              type={passwordVisible ? "text" : "password"}
              placeholder="Password"
              className="w-full px-4 py-2 rounded-md bg-white/90"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setPasswordVisible(!passwordVisible)}
              className="absolute right-4 top-2 text-gray-500"
            >
              {passwordVisible ? "Hide" : "Show"}
            </button>
          </div>
          <button
            type="submit"
            className="w-full py-2 mt-4 bg-yellow-500 text-white font-semibold rounded-md hover:bg-yellow-600"
            disabled={loading}
          >
            {loading ? "Signing In..." : "Log In"}
          </button>
          {errorMessage && (
            <div className="bg-red-500 text-white text-center w-10/12 rounded p-2 mt-4 ml-8">
              {errorMessage}
            </div>
          )}
          <div className="text-center mt-4">
            <p className="text-white">
              Don't have an account?{" "}
              <a href="/sign-up" className="text-white hover:underline hover:text-yellow-300 font-bold">Sign Up</a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignInPage;
