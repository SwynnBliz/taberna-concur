// components/forum/ui/PostMediaCarousel.tsx (Post Media Carousel UI Component Reusable)
import { useState } from "react";
import { AiOutlineLeft, AiOutlineRight } from "react-icons/ai";

const PostMediaCarousel = ({
  imageUrl,
  videoUrl,
  className = "",
}: { imageUrl?: string; videoUrl?: string; className?: string }) => {
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
      <div className={`w-full flex justify-center items-center bg-black rounded-lg overflow-hidden ${className || "h-[450px] sm:h-[500px]"}`}>
        {mediaItems[currentIndex].type === "image" ? (
          <img
            src={mediaItems[currentIndex].src}
            alt="Post media"
            className="w-full h-full object-cover"
          />
        ) : (
          <video
            src={mediaItems[currentIndex].src}
            controls={!className.includes("h-32")}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Navigation Buttons */}
      {mediaItems.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className={`absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-40 text-white rounded-full hover:bg-opacity-80 transition 
              ${className.includes("h-32") ? "p-1" : "p-3"}`}
          >
            <AiOutlineLeft size={className.includes("h-32") ? 18 : 28} />
          </button>
          <button
            onClick={handleNext}
            className={`absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-40 text-white rounded-full hover:bg-opacity-80 transition 
              ${className.includes("h-32") ? "p-1" : "p-3"}`}
          >
            <AiOutlineRight size={className.includes("h-32") ? 18 : 28} />
          </button>
        </>
      )}
    </div>
  );
};

export default PostMediaCarousel;