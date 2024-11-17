// app/discussion-board/page.tsx (Discussion Board Page)
'use client';
import Layout from '../../components/root/Layout'; // Layout component
import Forum from '../../components/forum/Forum'; // Import the Forum component

const DiscussionBoardPage = () => {
  return (
    <Layout>
      <div className="bg-[#484242]">
        <Forum /> {/* Use Forum component */}
      </div>
    </Layout>
  );
};

export default DiscussionBoardPage;