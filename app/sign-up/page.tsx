'use client';

import { useState, useEffect } from "react";
import { useCreateUserWithEmailAndPassword } from 'react-firebase-hooks/auth';
import { auth } from '../firebase/config';
import { useRouter } from 'next/navigation';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import PasswordStrengthChecker from '../../components/auth/PasswordStrengthChecker'; // Importing PasswordStrengthChecker

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false); // State to toggle password visibility
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false); // State for confirm password

  const firestore = getFirestore();

  const [createUserWithEmailAndPassword, user, loading, error] = useCreateUserWithEmailAndPassword(auth);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        router.push('/discussion-board');
      }
    });
    return () => unsubscribe(); // Cleanup the listener on component unmount
  }, [router]);

  const validateEmail = (email: string) => {
    // Basic email regex validation
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailPattern.test(email);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setErrorMessage("");
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }
    if (!validateEmail(email)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    try {
      const res = await createUserWithEmailAndPassword(email, password);
      if (!res || !res.user) {
        setErrorMessage("This email is already in use.");
        return;
      }
      const userRef = doc(firestore, "users", res.user.uid);
      await setDoc(userRef, {
        email,
        username,
        createdAt: new Date(),
      });
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setUsername("");
    } catch (e) {
      setErrorMessage("An error occurred during sign-up.");
    }
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-cover bg-center"
      style={{ backgroundImage: "url('https://wallup.net/wp-content/uploads/2019/09/929884-liquor-alcohol-spirits-poster-drinks-drink-whiskey.jpg')" }}
    >
      <div className="bg-white/20 border border-white rounded-xl backdrop-blur-lg p-8 shadow-lg w-full max-w-md">
        <h1 className="text-4xl font-bold text-center text-white mb-8">
          <span>Welcome to </span>
          <span className="text-yellow-500 italic island-moments">
            TabernaConcur
          </span>
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full px-4 py-2 rounded-md bg-white/90"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Username"
            className="w-full px-4 py-2 rounded-md bg-white/90"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          
          {/* Password Input with Show/Hide toggle */}
          <div className="relative">
            <input
              type={passwordVisible ? "text" : "password"} // Toggle between text and password type
              placeholder="Password"
              className="w-full px-4 py-2 rounded-md bg-white/90"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setPasswordVisible(!passwordVisible)} // Toggle visibility
              className="absolute right-4 top-2 text-gray-500"
            >
              {passwordVisible ? "Hide" : "Show"}
            </button>
          </div>

          {/* Confirm Password Input with Show/Hide toggle */}
          <div className="relative">
            <input
              type={confirmPasswordVisible ? "text" : "password"} // Toggle between text and password type for confirm password
              placeholder="Confirm Password"
              className="w-full px-4 py-2 rounded-md bg-white/90"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)} // Toggle visibility for confirm password
              className="absolute right-4 top-2 text-gray-500"
            >
              {confirmPasswordVisible ? "Hide" : "Show"}
            </button>
          </div>

          <PasswordStrengthChecker password={password} />

          <button
            type="submit"
            className="w-full py-2 mt-4 bg-yellow-500 text-white font-semibold rounded-md hover:bg-yellow-600"
            disabled={loading}
          >
            {loading ? "Signing Up..." : "Sign Up"}
          </button>
          {errorMessage && <p className="text-red-500 mt-4 text-center font-semibold">{errorMessage}</p>}
          {error && !errorMessage && <p className="text-red-500 mt-4 text-center font-semibold">{error.message}</p>}
          <div className="text-center mt-4">
            <p className="text-white">
              Already have an account?{" "}
              <a href="/sign-in" className="text-white hover:underline hover:text-yellow-300 font-bold">Sign In</a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignUp;
