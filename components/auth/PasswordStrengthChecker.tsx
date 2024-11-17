import { useState, useEffect } from "react";

type PasswordStrengthCheckerProps = {
  password: string;
};

const PasswordStrengthChecker = ({ password }: PasswordStrengthCheckerProps) => {
  const [strength, setStrength] = useState("");

  useEffect(() => {
    const checkPasswordStrength = (password: string) => {
      let strengthLevel = 0;

      // Criteria
      if (password.length >= 8) strengthLevel++;
      if (/[A-Z]/.test(password)) strengthLevel++;
      if (/[0-9]/.test(password)) strengthLevel++;
      if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strengthLevel++;

      // Determine strength level
      switch (strengthLevel) {
        case 0:
        case 1:
          return "Weak";
        case 2:
          return "Fair";
        case 3:
          return "Good";
        case 4:
          return "Strong";
        default:
          return "";
      }
    };

    setStrength(checkPasswordStrength(password));
  }, [password]);

  const textStyles = {
    Weak: "text-red-500 font-semibold text-shadow-lg",
    Fair: "text-yellow-500 text-shadow-lg",
    Good: "text-blue-500 text-shadow-lg",
    Strong: "text-green-500 text-shadow-lg",
  };

  return (
    <div className="mt-2">
      <p
        id="password-strength"
        className={`text-sm font-medium ${textStyles[strength as keyof typeof textStyles]}`}
        style={{ textShadow: "2px 2px 4px rgba(0, 0, 0, 0.7)" }}
      >
        Password Strength: {strength}
      </p>
    </div>
  );
};

export default PasswordStrengthChecker;
