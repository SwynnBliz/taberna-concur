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
import { query, where, getDocs, collection } from 'firebase/firestore'; 
import { User } from 'firebase/auth';

const SignInPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<React.ReactNode>("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [signInWithEmailAndPassword, user, loading, error] = useSignInWithEmailAndPassword(auth);
  const router = useRouter();
  const firestore = getFirestore();

  const getErrorMessage = (error: any) => {
    if (error) {
      const errorMessage = error.message;
      
      if (errorMessage.includes('auth/wrong-password')) {
        return "Incorrect password. Please try again.";
      }
      
      return "Incorrect email/password. Please try again.";
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
      const usersQuery = query(
        collection(firestore, "users"),
        where("email", "==", email)
      );
      const querySnapshot = await getDocs(usersQuery);
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const banMessage = userDoc.data().banMessage;
        if (banMessage) {
          setErrorMessage(
            <div>
              Your account has been disabled, Reason: {banMessage}. Please contact us at{" "}
              <a
                className="text-yellow-500 hover:text-yellow-600 hover:underline active:text-white"
                href={`https://mail.google.com/mail/?view=cm&fs=1&to=tabernaconcur.support@gmail.com&su=Request for Unban&body=Dear TabernaConcur Support,%0D%0A%0D%0AI would like to request an unban for my account. Here are the details for justification:%0D%0A%0D%0A[Explanation]%0D%0A%0D%0AReason for ban: ${encodeURIComponent(
                  banMessage
                )}%0D%0A%0D%0AThank you for your time.%0D%0A%0D%0A[Your Name]`}
                target="_blank"
                rel="noopener noreferrer"
              >
                tabernaconcur.support@gmail.com
              </a>{" "}
              to request an unban.
            </div>
          );
        }
      } else {
        setErrorMessage("Incorrect email/password. Please try again.");
      }
    } catch (e) {
      setErrorMessage("Error signing in. Please try again.");
    }
  };  

  const handleGoogleSignIn = async () => {
    setErrorMessage(""); 
  
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user as User;
      const userRef = doc(firestore, "users", user.uid);
  
      const userDoc = await getDoc(userRef);
  
      if (userDoc.exists()) {
        const banMessage = userDoc.data().banMessage;
  
        if (banMessage) {
          setErrorMessage(
            <div>
              Your account has been disabled, Reason: {banMessage}. Please contact us at{" "}
              <a
                className="text-yellow-500 hover:text-yellow-600 hover:underline active:text-white"
                href={`https://mail.google.com/mail/?view=cm&fs=1&to=tabernaconcur.support@gmail.com&su=Request for Unban&body=Dear TabernaConcur Support,%0D%0A%0D%0AI would like to request an unban for my account. Here are the details for justification:%0D%0A%0D%0A[Explanation]%0D%0A%0D%0AReason for ban: ${encodeURIComponent(
                  banMessage
                )}%0D%0A%0D%0AThank you for your time.%0D%0A%0D%0A[Your Name]`}
                target="_blank"
                rel="noopener noreferrer"
              >
                tabernaconcur.support@gmail.com
              </a>{" "}
              to request an unban.
            </div>
          );
        } else {
          router.push('/forum');
        }
      } else {
        const defaultUsername = user.email?.split('@')[0];
        await setDoc(userRef, {
          email: user.email,
          username: defaultUsername,
          createdAt: new Date(),
          visibility: 'public',
          role: 'user',
        });
        router.push('/forum');
      }
    } catch (e) {
      if (e instanceof FirebaseError) {
        if (e.code === 'auth/user-disabled') {
          const email = e.customData?.email;
  
          if (email) {
            const usersQuery = query(
              collection(firestore, "users"),
              where("email", "==", email)
            );
  
            const querySnapshot = await getDocs(usersQuery);
  
            if (!querySnapshot.empty) {
              const userDoc = querySnapshot.docs[0];
              const banMessage = userDoc.data().banMessage;
  
              if (banMessage) {
                setErrorMessage(
                  <div>
                    Your account has been disabled, Reason: {banMessage}. Please contact us at{" "}
                    <a
                      className="text-yellow-500 hover:text-yellow-600 hover:underline active:text-white"
                      href={`https://mail.google.com/mail/?view=cm&fs=1&to=tabernaconcur.support@gmail.com&su=Request for Unban&body=Dear TabernaConcur Support,%0D%0A%0D%0AI would like to request an unban for my account. Here are the details for justification:%0D%0A%0D%0A[Explanation]%0D%0A%0D%0AReason for ban: ${encodeURIComponent(
                        banMessage
                      )}%0D%0A%0D%0AThank you for your time.%0D%0A%0D%0A[Your Name]`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      tabernaconcur.support@gmail.com
                    </a>{" "}
                    to request an unban.
                  </div>
                );                          
              } else {
                setErrorMessage("Your account has been disabled.");
              }
            } else {
              setErrorMessage("Your account has been disabled, but no user found.");
            }
          } else {
            setErrorMessage("Your account has been disabled, but no user found.");
          }
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
      className="flex items-center justify-center min-h-screen bg-cover bg-center px-4 sm:px-8"
      style={{ backgroundImage: "url('https://wallup.net/wp-content/uploads/2019/09/929884-liquor-alcohol-spirits-poster-drinks-drink-whiskey.jpg')" }}
    >
      <div className="bg-white/20 border border-white rounded-lg backdrop-blur-md p-6 sm:p-8 shadow-lg w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-white mb-4">
          <span>Welcome to </span>
          <span className="text-yellow-500 italic island-moments">TabernaConcur</span>
        </h1>
    
        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center py-2 mt-4 mb-4 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 border border-gray-300"
        >
          <FcGoogle className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
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
            className="w-full px-4 py-2 rounded-md text-black bg-white/90 text-sm sm:text-base"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="relative">
            <input
              type={passwordVisible ? "text" : "password"}
              placeholder="Password"
              className="w-full px-4 py-2 rounded-md text-black bg-white/90 text-sm sm:text-base"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setPasswordVisible(!passwordVisible)}
              className="absolute right-4 top-2 text-gray-500 text-sm sm:text-base"
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
            <p className="text-white text-sm sm:text-base">
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
