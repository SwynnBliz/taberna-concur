// src/utils/filterText.ts
export const filterText = (text: string, bannedWords: string[]): string => {
    let filteredText = text;
  
    bannedWords.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, "gi"); // Match the word as a whole word
      filteredText = filteredText.replace(regex, "***"); // Replace with ***
    });
  
    return filteredText;
  };
  