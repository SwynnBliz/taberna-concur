import { useState } from "react";
import { AiOutlineLeft, AiOutlineRight } from "react-icons/ai";

const PostMediaCarousel = ({
  imageUrl,
  videoUrl,
  className = "",
  onImageClick, // Add this prop
}: {
  imageUrl?: string;
  videoUrl?: string;
  className?: string;
  onImageClick?: () => void; // Define the type for the prop
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const mediaItems = [];
  if (imageUrl) mediaItems.push({ type: "image", src: imageUrl });
  if (videoUrl) mediaItems.push({ type: "video", src: videoUrl });

  if (mediaItems.length === 0) return null; // No media to display

  const handleNext = () => setCurrentIndex((prev) => (prev + 1) % mediaItems.length);
  const handlePrev = () => setCurrentIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length);

  return (
    <div className={`relative w-full max-w-2xl mx-auto`}>
      {/* Media Display */}
      <div
        className={`w-full flex justify-center items-center bg-black rounded-lg overflow-hidden ${
          className.includes("h-32") ? "h-[80px] sm:h-[150px]" : "h-[150px] sm:h-[450px]"
        }`}
      >
        {mediaItems[currentIndex].type === "image" ? (
          <img
            src={mediaItems[currentIndex].src}
            alt="Post media"
            className="w-full h-full object-cover cursor-pointer" // Add cursor-pointer for clickability
            onClick={onImageClick} // Attach the onImageClick handler
          />
        ) : (
          <video
            src={mediaItems[currentIndex].src}
            controls={!className.includes("h-32")}
            className="w-full h-full object-contain"
          />
        )}
      </div>

      {/* Navigation Buttons */}
      {mediaItems.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className={`absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-40 text-white rounded-full hover:bg-opacity-80 transition 
              ${className.includes("h-32") ? "p-1" : "p-2"}`}
          >
            <AiOutlineLeft size={className.includes("h-32") ? 14 : 28} />
          </button>
          <button
            onClick={handleNext}
            className={`absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-40 text-white rounded-full hover:bg-opacity-80 transition 
              ${className.includes("h-32") ? "p-1" : "p-2"}`}
          >
            <AiOutlineRight size={className.includes("h-32") ? 14 : 28} />
          </button>
        </>
      )}
    </div>
  );
};

export default PostMediaCarousel;