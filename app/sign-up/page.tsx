// app/sign-up/page.tsx (Sign Up Page)
'use client';
import { useState, useEffect } from "react";
import { useCreateUserWithEmailAndPassword } from "react-firebase-hooks/auth";
import { auth } from "../firebase/config";
import { useRouter } from "next/navigation";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import PasswordStrengthChecker from "../../components/auth/PasswordStrengthChecker";
import useBannedWords from "../../components/forum/hooks/useBannedWords";

const SignUpPage = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [isPasswordStrong, setIsPasswordStrong] = useState(false);
  const firestore = getFirestore();
  const [createUserWithEmailAndPassword, user, loading] = useCreateUserWithEmailAndPassword(auth);
  const router = useRouter();
  const { bannedWords, loading: bannedWordsLoading } = useBannedWords();
  const [isTermsChecked, setIsTermsChecked] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        router.push("/forum");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const validateEmail = (email: string) => {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailPattern.test(email);
  };

  const validateUsername = (username: string): boolean => {
    if (bannedWordsLoading) return false;
    return bannedWords.some((word) => username.toLowerCase().includes(word.toLowerCase()));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setErrorMessage("");

    if (!validateEmail(email)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    
    if (validateUsername(username)) {
      setErrorMessage("Username contains a banned word. Please choose a different username.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (!isPasswordStrong) {
      setErrorMessage("Password is not strong enough.");
      return;
    }

    if (!isTermsChecked) {
      setErrorMessage("You must agree to the Terms and Conditions to create an account.");
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
        visibility: "public",
        role: "user",
      });

      setEmail("");
      setUsername("");
      setPassword("");
      setConfirmPassword("");
    } catch (e) {
      console.error("Error during sign-up:", e);
      setErrorMessage("An error occurred during sign-up. Please try again.");
    }
  };

  const handleTermsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsTermsChecked(e.target.checked);
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (hasScrolledToEnd) {
      setIsModalOpen(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    const scrollHeight = e.currentTarget.scrollHeight;
    const scrollTop = e.currentTarget.scrollTop;
    const clientHeight = e.currentTarget.clientHeight;
    if (scrollTop + clientHeight >= scrollHeight) {
      setHasScrolledToEnd(true);
    }
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-cover bg-center p-4 md:p-0"
      style={{
        backgroundImage:
          "url('https://wallup.net/wp-content/uploads/2019/09/929884-liquor-alcohol-spirits-poster-drinks-drink-whiskey.jpg')",
      }}
    >
      <div className="bg-white/20 border border-white rounded-xl backdrop-blur-lg p-6 md:p-8 shadow-lg w-full max-w-md">
        <h1 className="text-3xl md:text-4xl font-bold text-center text-white mb-6 md:mb-8">
          <span>Welcome to </span>
          <span className="text-yellow-500 italic island-moments">TabernaConcur</span>
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full px-4 py-2 rounded-md bg-white/90 text-sm md:text-base"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="text"
            placeholder="Username"
            className="w-full px-4 py-2 rounded-md bg-white/90 text-sm md:text-base"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <div className="relative">
            <input
              type={passwordVisible ? "text" : "password"}
              placeholder="Password"
              className="w-full px-4 py-2 rounded-md bg-white/90 text-sm md:text-base"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setPasswordVisible(!passwordVisible)}
              className="absolute right-4 top-2 text-gray-500 text-sm md:text-base"
            >
              {passwordVisible ? "Hide" : "Show"}
            </button>
          </div>

          <div className="relative">
            <input
              type={confirmPasswordVisible ? "text" : "password"}
              placeholder="Confirm Password"
              className="w-full px-4 py-2 rounded-md bg-white/90 text-sm md:text-base"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
              className="absolute right-4 top-2 text-gray-500 text-sm md:text-base"
            >
              {confirmPasswordVisible ? "Hide" : "Show"}
            </button>
          </div>

          <label className="flex items-center space-x-2 text-sm md:text-base">
            <input
              type="checkbox"
              checked={isTermsChecked}
              onChange={handleTermsChange}
              className="h-4 w-4 text-yellow-500 border-yellow-500 rounded focus:ring-yellow-500"
            />
            <span className="text-white">
              I agree to the{" "}
              <span
                className="text-yellow-500 hover:text-yellow-600 cursor-pointer underline"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openModal();
                }}
              >
                Terms and Conditions
              </span>
            </span>
          </label>

          <PasswordStrengthChecker password={password} setStrengthValid={setIsPasswordStrong} />

          <button
            type="submit"
            className={`w-full py-2 mt-4 text-white font-semibold rounded-md ${
              loading || !isPasswordStrong ? 'bg-gray-400 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-600'
            }`}
            disabled={loading || !isPasswordStrong}
          >
            {loading ? "Signing Up..." : "Sign Up"}
          </button>

          {errorMessage && (
            <div className="bg-red-500 text-white text-center w-10/12 rounded p-2 mt-4 ml-8">
              {errorMessage}
            </div>
          )}

          <div className="text-center mt-4">
            <p className="text-white text-sm md:text-base">
              Already have an account?{" "}
              <a href="/sign-in" className="text-white hover:underline hover:text-yellow-300 font-bold">
                Sign In
              </a>
            </p>
          </div>
        </form>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-[#484242] rounded-lg w-11/12 sm:w-3/4 md:w-1/2 p-6 overflow-auto max-h-[80vh] text-white">
            <h3 className="text-lg md:text-xl font-semibold mt-4 mb-2">Terms and Conditions</h3>
            <div className="terms-and-conditions max-h-60 md:max-h-80 overflow-y-scroll pr-4" onScroll={handleScroll}>
              <p className="mb-4">
                <strong>Effective Date:</strong> January 5, 2025
              </p>
              <p className="mb-4">
                Welcome to TabernaConcur! By creating an account and using our services, you agree to comply with the following terms and conditions. Please read them carefully before proceeding.
              </p>

              <h4 className="font-semibold mt-4">1. Acceptance of Terms</h4>
              <p className="mb-4">
                By accessing or using TabernaConcur, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use our website.
              </p>

              <h4 className="font-semibold mt-4">2. User Responsibilities</h4>
              <ul className="list-disc pl-6 mb-4">
                <li>You must provide accurate and truthful information during registration.</li>
                <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                <li>Any actions taken using your account are your responsibility.</li>
              </ul>

              <h4 className="font-semibold mt-4">3. Prohibited Activities</h4>
              <p>Users agree not to:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Use the website for illegal purposes.</li>
                <li>Distribute harmful content, including viruses or spam.</li>
                <li>Attempt to disrupt or exploit the website's functionality.</li>
              </ul>

              <h4 className="font-semibold mt-4">4. User Conduct and Moderation</h4>
              <p className="mb-4">
                To maintain a safe and respectful community, users must adhere to the following guidelines:
              </p>

              <ul className="list-disc pl-6 mb-4">
                <li>
                  <h5 className="font-semibold mt-2">Prohibited Content:</h5>
                  <ul className="list-disc pl-8 mb-4">
                    <li>No offensive, hateful, or inappropriate language in forum posts, usernames, profile bios, or messages.</li>
                    <li>No spamming, phishing, or distributing malicious content.</li>
                  </ul>
                </li>

                <li>
                  <h5 className="font-semibold mt-2">Warning and Ban Policy:</h5>
                  <ul className="list-disc pl-8 mb-4">
                    <li>Users violating these rules will receive warnings from admins.</li>
                    <li>Accumulating 3 warnings may result in a temporary or permanent ban.</li>
                    <li>Severe violations (e.g., explicit threats, hate speech) may result in an immediate ban without warning.</li>
                  </ul>
                </li>

                <li>
                  <h5 className="font-semibold mt-2">Admin Authority:</h5>
                  <ul className="list-disc pl-8 mb-4">
                    <li>Admins have full discretion to enforce these rules and determine penalties for violations.</li>
                    <li>Appeals for bans may be submitted to [Insert Contact Information], but decisions are final.</li>
                  </ul>
                </li>
              </ul>

              <h4 className="font-semibold mt-4">5. Data Privacy</h4>
              <ul className="list-disc pl-6 mb-4">
                <li>We collect and store user data to enhance our services.</li>
                <li>Your data will not be sold or shared without your consent.</li>
              </ul>

              <h4 className="font-semibold mt-4">6. Limitation of Liability</h4>
              <ul className="list-disc pl-6 mb-4">
                <li>TabernaConcur is not responsible for errors, interruptions, or downtime of the website.</li>
                <li>Loss or damage caused by unauthorized access to your account.</li>
                <li>Any indirect or incidental damages arising from your use of the website.</li>
              </ul>

              <h4 className="font-semibold mt-4">7. Account Termination</h4>
              <p className="mb-4">
                We reserve the right to suspend or terminate accounts for violations of these Terms and Conditions or at our discretion without prior notice.
              </p>

              <h4 className="font-semibold mt-4">8. Modifications to Terms</h4>
              <p className="mb-4">
                We may update these Terms and Conditions at any time. Continued use of the website after changes constitutes your agreement to the updated terms.
              </p>

              <h4 className="font-semibold mt-4">9. Contact Information</h4>
              <p className="mb-4">
                If you have questions or concerns, contact us at:
              </p>
              <p className="mb-4">
                <span className="mr-2">Email:</span>
                <a
                  href={`https://mail.google.com/mail/?view=cm&fs=1&to=tabernaconcur.support@gmail.com&su=Request for Assistance&body=Dear TabernaConcur Support,%0D%0A%0D%0AI would like to contact you regarding the following:%0D%0A%0D%0A[Your message here]`}
                  target="_blank"
                  className="text-yellow-500 hover:text-yellow-600"
                >
                  tabernaconcur.support@gmail.com
                </a>
              </p>

              <p className="mt-4">
                By creating an account, you acknowledge that you have read, understood, and agreed to these Terms and Conditions.
              </p>

              <button
                onClick={closeModal}
                disabled={!hasScrolledToEnd}
                className={`w-full py-2 mt-4 text-white font-semibold rounded-md ${
                  !hasScrolledToEnd ? 'bg-gray-400 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-600'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignUpPage;
