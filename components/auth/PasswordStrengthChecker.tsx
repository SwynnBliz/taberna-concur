// components/auth/PasswordStrengthChecker.tsx (Password Strength Checker Function)
import { useState, useEffect } from "react";

type PasswordStrengthCheckerProps = {
  password: string;
  setStrengthValid: (isValid: boolean) => void;
};

const PasswordStrengthChecker = ({ password, setStrengthValid }: PasswordStrengthCheckerProps) => {
  const [strength, setStrength] = useState("");
  const [feedback, setFeedback] = useState<string[]>([]);

  useEffect(() => {
    const checkPasswordStrength = (password: string) => {
      let strengthLevel = 0;
      const feedback: string[] = [];

      if (password.length >= 8) strengthLevel++;
      else feedback.push("At least 8 characters long");

      if (/[A-Z]/.test(password)) strengthLevel++;
      else feedback.push("At least one uppercase letter");

      if (/[0-9]/.test(password)) strengthLevel++;
      else feedback.push("At least one number");

      if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strengthLevel++;
      else feedback.push("At least one special character");

      switch (strengthLevel) {
        case 0:
        case 1:
          setStrength("Weak");
          setStrengthValid(false);
          break;
        case 2:
          setStrength("Fair");
          setStrengthValid(false);
          break;
        case 3:
          setStrength("Good");
          setStrengthValid(false);
          break;
        case 4:
          setStrength("Strong");
          setStrengthValid(true);
          break;
        default:
          setStrength("");
          setStrengthValid(false);
      }

      setFeedback(feedback);
    };

    checkPasswordStrength(password);
  }, [password, setStrengthValid]);

  const textStyles = {
    Weak: "text-red-500 font-semibold",
    Fair: "text-yellow-500 font-semibold",
    Good: "text-blue-500 font-semibold",
    Strong: "text-green-500 font-semibold",
  };

  return (
    <div className="mt-2">
      <p
        id="password-strength"
        className={`text-sm font-medium ${textStyles[strength as keyof typeof textStyles]} p-1 rounded-md`}
        style={{ textShadow: "2px 2px 5px rgba(0, 0, 0, 0.8)" }}
      >
        Password Strength: {strength}
      </p>
      {feedback.length > 0 && (
        <ul className="text-sm text-red-500 mt-1 p-2 rounded-md" style={{ textShadow: "2px 2px 5px rgba(0, 0, 0, 0.8)" }}>
          {feedback.map((item, index) => (
            <li key={index} className="mb-1">
              - {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PasswordStrengthChecker;
