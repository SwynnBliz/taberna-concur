// components/root/RightSidebar.tsx
const RightSidebar = () => {
  return (
    <div className="w-60 bg-[#484242] p-6 border-l-2 border-white">
      {/* Placeholder for recent posts */}
      <h3 className="font-semibold text-white border-b-2 border-white pb-2">Bookmarked Posts</h3>
      <p className="text-white pt-2">No bookmarked posts yet.</p> {/* Add border-bottom here */}
    </div>
  );
};

export default RightSidebar;