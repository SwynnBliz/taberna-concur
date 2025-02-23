// app/educational/page.tsx (Educational Tip Page)
'use client'
import { useState, useEffect } from 'react';
import { firestore } from '../firebase/config'; 
import { collection, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';
import { FaSearch } from 'react-icons/fa'; 
import Layout from '../../components/root/Layout';
import { LinkIt } from 'react-linkify-it';
import { useRouter } from 'next/navigation';

interface Tip {
  id: string;
  title: string;
  category: string;
  content: string;
  videoUrl: string | "";
  imageUrl: string | "";
  createdAt: any;
  updatedAt: any;
  createdBy: string;
  updatedBy: string;
}

const EducationalInfo = () => {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredTips, setFilteredTips] = useState<Tip[]>([]);
    const [tips, setTips] = useState<Tip[]>([]);

    const handleSearch = () => {
        const searchTermLower = searchTerm.trim().toLowerCase(); 
    
        
        const filtered = tips.filter((tip) => 
            tip.title.toLowerCase().includes(searchTermLower) ||
            tip.content.toLowerCase().includes(searchTermLower) ||
            tip.category.toLowerCase().includes(searchTermLower)
        );
    
        setFilteredTips(filtered); 
    };
    
    useEffect(() => {
        if (!searchTerm) {
            setFilteredTips(tips); 
        }
    }, [searchTerm, tips]);  

    useEffect(() => {
        const fetchTips = async () => {
          try {
            const q = query(collection(firestore, 'educationalInfo'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
      
            const fetchedTips: Tip[] = querySnapshot.docs.map((doc) => ({
              id: doc.id,
              title: doc.data().title || '',
              category: doc.data().category || '',
              content: doc.data().content || '',
              videoUrl: doc.data().videoUrl || null,
              imageUrl: doc.data().imageUrl || null,
              createdAt: doc.data().createdAt || serverTimestamp(),
              updatedAt: doc.data().updatedAt || serverTimestamp(),
              createdBy: doc.data().createdBy || 'admin',
              updatedBy: doc.data().updatedBy || 'admin',
            }));
      
            setTips(fetchedTips);
            setFilteredTips(fetchedTips); 
          } catch (error) {
            console.error('Error fetching tips: ', error);
          }
        };
      
        fetchTips();
    }, []); 
      
    useEffect(() => {
        if (searchTerm) {
          const filtered = tips.filter((tip) =>
            tip.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tip.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tip.category.toLowerCase().includes(searchTerm.toLowerCase())
          );
          setFilteredTips(filtered); 
        } else {
          setFilteredTips(tips); 
        }
    }, [searchTerm, tips]); 

    const renderLink = (match: string, key: number) => (
      <a
        href={match}
        key={key}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 underline hover:text-yellow-500"
      >
        {match}
      </a>
    );
  
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    const handleNavigate = (path: string) => {
      router.push(path);
    };

    return (
        <Layout>
            <div className="flex flex-col">
                <div className="mt-6 w-8/12 mx-auto flex justify-between items-center border-b-2 border-white pb-2 mb-4">
                    <h1 className="text-xl text-white">Educational Tips & Tricks</h1>
                </div>
    
                {/* Search and List of Educational Tips */}
                <div className="max-w-8/12 px-52">
                    <div className="flex space-x-2 items-center mt-4 my-5">
                        <input
                            type="text"
                            placeholder="Search Tips"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full p-2 rounded-md text-white outline-none focus:ring-2 focus:ring-yellow-500 bg-[#2c2c2c] resize-none"
                        />
                        <button
                            onClick={handleSearch}
                            className="bg-yellow-500 text-black p-2 rounded-full hover:bg-yellow-600 transition duration-200"
                        >
                            <FaSearch />
                        </button>
                    </div>
    
                    {/* Render Tips List */}
                    <div className="space-y-6 my-5">
                        {filteredTips.length === 0 ? (
                            <p className="text-yellow-500">No results found</p>
                        ) : (
                            filteredTips.map((tip: Tip) => (
                                <div key={tip.id} className="bg-[#383434] flex flex-col p-4 rounded-lg shadow-lg space-y-4 text-white relative">
                                  {/* Title and buttons container */}
                                  <div className="flex items-center justify-between">
                                    <h3 className="text-2xl font-semibold text-center text-yellow-500 flex-1">{tip.title}</h3>
                                  </div>

                                  {/* Image (optional) */}
                                  {tip.imageUrl && <img src={tip.imageUrl} alt={tip.title} className="w-full max-h-80 rounded-lg" />}
                              
                                  {/* Content and category */}
                                  <LinkIt component={renderLink} regex={urlRegex}>
                                    <p className="whitespace-pre-wrap">{tip.content}</p>
                                  </LinkIt>
                                  <p className="text-yellow-500">Category: {tip.category}</p>
                                  
                                  {/* Video (optional) */}
                                  {tip.videoUrl && (
                                    <video
                                      src={tip.videoUrl}
                                      controls
                                      className="w-full rounded-lg mt-2"
                                    />
                                  )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );    
};

export default EducationalInfo;