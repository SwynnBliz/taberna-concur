'use client';
import { useState, useEffect } from "react";
import { useCreateUserWithEmailAndPassword } from 'react-firebase-hooks/auth';
import { getAuth, setPersistence, browserSessionPersistence, fetchSignInMethodsForEmail } from "firebase/auth";
import { auth } from '../firebase/config';
import { useRouter } from 'next/navigation';
import PasswordStrengthChecker from "../../components/auth/PasswordStrengthChecker";

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  
  const [passwordVisible, setPasswordVisible] = useState(false); // State to toggle password visibility
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false); // State to toggle confirm password visibility

  const [createUserWithEmailAndPassword, user, loading, error] = useCreateUserWithEmailAndPassword(auth);
  const router = useRouter();

  useEffect(() => {
    setPersistence(auth, browserSessionPersistence).catch((error) => {
      console.error("Error setting persistence:", error);
      setErrorMessage("Failed to set session persistence. Try using a regular browsing window.");
    });
  }, []);

  useEffect(() => {
    if (user) {
      console.log("User signed up:", user);
      router.push('/sign-in');
    }
  }, [user, router]);

  const validateEmail = (email: string) => {
    // Basic email regex validation
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailPattern.test(email);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setErrorMessage(""); // Clear previous error messages
  
    // Validation checks
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
      console.log("User created:", res);

      if (!res || res.user === null) {
        setErrorMessage("This email is already in use. Please try another one.")
        return;
      }
    
      // Only clear the form and redirect if there are no errors
      if (!errorMessage) {
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setUsername("");
      }
    } catch (e: any) {
      console.error("Error creating user:", e);
    }
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-cover bg-center"
      style={{ backgroundImage: "url('https://wallup.net/wp-content/uploads/2019/09/929884-liquor-alcohol-spirits-poster-drinks-drink-whiskey.jpg')" }}
    >
      <div className="bg-white/30 border border-white rounded-xl backdrop-blur-lg p-8 shadow-lg w-full max-w-md">
        <h1 className="text-4xl font-bold text-center text-white mb-8">
          <span style={{ fontFamily: "Arial, sans-serif" }}>Welcome to </span>
          <span className="text-yellow-500 island-moments">TabernaConcur</span>
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            aria-label="Enter your email"
            className="w-full px-4 py-2 rounded-md text-gray-800 outline-none focus:ring-2 focus:ring-yellow-500 bg-white/90"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Username"
            aria-label="Enter your username"
            className="w-full px-4 py-2 rounded-md text-gray-800 outline-none focus:ring-2 focus:ring-yellow-500 bg-white/90"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          
          {/* Password field */}
          <div className="relative">
            <input
              type={passwordVisible ? "text" : "password"}
              placeholder="Password"
              aria-label="Enter your password"
              className="w-full px-4 py-2 rounded-md text-gray-800 outline-none focus:ring-2 focus:ring-yellow-500 bg-white/90"
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
          
          {/* Confirm Password field */}
          <div className="relative">
            <input
              type={confirmPasswordVisible ? "text" : "password"}
              placeholder="Confirm Password"
              aria-label="Re-enter your password for confirmation"
              className="w-full px-4 py-2 rounded-md text-gray-800 outline-none focus:ring-2 focus:ring-yellow-500 bg-white/90"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
              className="absolute right-4 top-2 text-gray-500"
              aria-label="Show/Hide Confirm Password"
            >
              {confirmPasswordVisible ? "Hide" : "Show"}
            </button>
          </div>

          <PasswordStrengthChecker password={password} />
          <button
            type="submit"
            aria-label="Click to sign up using your user credential"
            className="w-full py-2 mt-4 bg-yellow-500 text-white font-semibold rounded-md hover:bg-yellow-600"
            disabled={loading}
          >
            {loading ? "Signing Up..." : "Sign Up"}
          </button>
          {errorMessage && <p className="text-red-500 mt-4" aria-live="polite">{errorMessage}</p>}
          {!errorMessage && error && <p className="text-red-500 mt-4" aria-live="polite">{error.message}</p>}

          {/* Link to Sign In */}
          <div className="text-center mt-4">
            <p className="text-white">
              Already have an account?{" "}
              <a href="/sign-in" className="text-yellow-500 hover:underline">Sign In</a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignUp;
