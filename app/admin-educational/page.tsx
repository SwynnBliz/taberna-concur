'use client'
import { useState, useEffect, useRef } from 'react';
import { firestore } from '../firebase/config'; 
import { addDoc, collection, serverTimestamp, doc, deleteDoc, getDoc, getDocs, query, orderBy, updateDoc } from 'firebase/firestore';
import { FaPlus, FaSearch, FaTrash, FaEdit, FaTimes } from 'react-icons/fa'; 
import Layout from '../../components/root/Layout';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { LinkIt } from 'react-linkify-it';

interface User {
    id: string;
    profilePhoto: string;
    username: string;
    bio: string;
    contactNumber: string;
    visibility: 'public' | 'private';
    role: 'admin' | 'user';
}

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

const EducationalInfoAdmin = () => {
    const router = useRouter();
    const auth = getAuth();
    const [formData, setFormData] = useState({
        title: '',
        category: '',
        content: '',
        videoUrl: '',
        imageUrl: '',
        showForm: false,
    });
    const [editImageFile, setEditImageFile] = useState<File | null>(null);
    const [editVideoFile, setEditVideoFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredTips, setFilteredTips] = useState<Tip[]>([]);
    const [editingTip, setEditingTip] = useState<Tip | null>(null);
    const [pendingImageDelete, setPendingImageDelete] = useState(false);
    const [pendingVideoDelete, setPendingVideoDelete] = useState(false);
    const [tips, setTips] = useState<Tip[]>([]);
    const currentUser = auth.currentUser;
    const imageInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
    
        const checkAdminRole = async (authUser: FirebaseUser | null) => {
          if (!authUser) {
            
            router.push('/sign-in');
            return;
          }
    
          try {
            
            const userDocRef = doc(firestore, 'users', authUser.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
              const userData = userDoc.data() as User;
    
              if (userData.role !== 'admin') {
                
                router.push('/forum');
              }
            } else {
              
              router.push('/sign-in');
            }
          } catch (error) {
            console.error('Error checking user role: ', error);
            router.push('/sign-in');
          }
        };
    
        
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          if (user) {
            checkAdminRole(user); 
          } else {
            router.push('/sign-in'); 
          }
        });
    
        return () => unsubscribe(); 
    }, [auth, firestore, router]);

    const handleCreateTip = async (e: React.FormEvent) => {
        e.preventDefault(); 
      
        if (!formData.title || !formData.content) {
          alert('Title and content are required!');
          return;
        }
      
        setLoading(true);
      
        try {
          let videoUrl = formData.videoUrl;
          let imageUrl = formData.imageUrl;
      
          
          if (editImageFile) {
            const formDataImage = new FormData();
            formDataImage.append('file', editImageFile);
            formDataImage.append('upload_preset', 'tip-image-upload'); 
      
            const res = await fetch(
              `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
              {
                method: 'POST',
                body: formDataImage,
              }
            );
      
            if (res.ok) {
              const data = await res.json();
              imageUrl = data.secure_url;
            } else {
              const errorData = await res.json();  
              console.error('Error uploading image:', errorData);
              throw new Error('Image upload failed');
            }
          }
      
          
          if (editVideoFile) {
            const formDataVideo = new FormData();
            formDataVideo.append('file', editVideoFile);
            formDataVideo.append('upload_preset', 'tip-video-upload'); 
      
            const res = await fetch(
              `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload`,
              {
                method: 'POST',
                body: formDataVideo,
              }
            );
      
            if (res.ok) {
              const data = await res.json();
              videoUrl = data.secure_url;
            } else {
              throw new Error('Video upload failed');
            }
          }
      
          
          const newTip = {
            ...formData,
            videoUrl,
            imageUrl,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: 'admin', 
            updatedBy: 'admin',
        };
            
            const docRef = await addDoc(collection(firestore, 'educationalInfo'), newTip);

            
            setTips((prevTips) => [
                { id: docRef.id, ...newTip }, 
                ...prevTips,
            ]);
      
          
          setFormData({
            title: '',
            category: '',
            content: '',
            videoUrl: '',
            imageUrl: '',
            showForm: false,
          });
          setEditImageFile(null);
          setEditVideoFile(null);
          alert('Tip added successfully!');
          setLoading(false);
        } catch (error) {
          console.error('Error creating educational tip:', error);
          setLoading(false);
        }
    };

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

    const handleToggleForm = () => {
        setFormData({
          title: '',
          category: '',
          content: '',
          videoUrl: '',
          imageUrl: '',
          showForm: !formData.showForm,
        });
      
        if (editingTip) {
          setEditingTip(null);  
        }
    };

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

    const handleEdit = (tip: Tip) => {
        setEditingTip(tip);
        setFormData({
          title: tip.title,
          category: tip.category,
          content: tip.content,
          videoUrl: tip.videoUrl || '',
          imageUrl: tip.imageUrl || '',
          showForm: true,
        });
    };

    const handleDeleteMedia = (mediaType: 'image' | 'video') => {
        if (mediaType === 'image') {
            setPendingImageDelete(true);
        } else if (mediaType === 'video') {
            setPendingVideoDelete(true);
        }
    };
      
    const handleUpdateTip = async (e: React.FormEvent) => {
        e.preventDefault();
    
        if (!editingTip) {
            alert('No tip selected for editing!');
            return;
        }
    
        if (!formData.title || !formData.content) {
            alert('Title and content are required!');
            return;
        }
    
        setLoading(true);
    
        try {
            let videoUrl = formData.videoUrl;
            let imageUrl = formData.imageUrl;
    
            
            if (pendingImageDelete) {
                imageUrl = '';
            } else if (editImageFile) {
                const formDataImage = new FormData();
                formDataImage.append('file', editImageFile);
                formDataImage.append('upload_preset', 'tip-image-upload');
                const res = await fetch(
                    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
                    { method: 'POST', body: formDataImage }
                );
                if (res.ok) {
                    const data = await res.json();
                    imageUrl = data.secure_url;
                } else {
                    throw new Error('Image upload failed');
                }
            }
    
            if (pendingVideoDelete) {
                videoUrl = '';
            } else if (editVideoFile) {
                const formDataVideo = new FormData();
                formDataVideo.append('file', editVideoFile);
                formDataVideo.append('upload_preset', 'tip-video-upload');
                const res = await fetch(
                    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload`,
                    { method: 'POST', body: formDataVideo }
                );
                if (res.ok) {
                    const data = await res.json();
                    videoUrl = data.secure_url;
                } else {
                    throw new Error('Video upload failed');
                }
            }
    
            const updatedTip = {
                title: formData.title,
                category: formData.category,
                content: formData.content,
                videoUrl,
                imageUrl,
                updatedAt: serverTimestamp(),
                updatedBy: currentUser?.displayName || currentUser?.email || 'admin',
            };
    
            await updateDoc(doc(firestore, 'educationalInfo', editingTip.id), updatedTip);
    
            setTips((prevTips) =>
                prevTips.map((tip) =>
                    tip.id === editingTip.id ? { ...tip, ...updatedTip } : tip
                )
            );
    
            
            handleResetForm();
            alert('Tip updated successfully!');
        } catch (error) {
            console.error('Error updating tip:', error);
            alert('An error occurred while updating the tip. Please try again.');
        } finally {
            setLoading(false);
        }
    };
    
    const handleClearForm = () => {
        setFormData((prevFormData) => ({
            ...prevFormData,
            title: '',
            category: '',
            content: '',
            videoUrl: '',
            imageUrl: '',
        }));
    
        setEditImageFile(null);
        setEditVideoFile(null);
    
        if (imageInputRef.current) imageInputRef.current.value = '';
        if (videoInputRef.current) videoInputRef.current.value = '';
    };

    const handleResetForm = () => {
        setPendingImageDelete(false);
        setPendingVideoDelete(false);
        setEditingTip(null);
        setFormData({ title: '', category: '', content: '', videoUrl: '', imageUrl: '', showForm: false });
        setEditImageFile(null);
        setEditVideoFile(null);
    
        if (imageInputRef.current) imageInputRef.current.value = '';
        if (videoInputRef.current) videoInputRef.current.value = '';
    };
    
    const handleDelete = async (tipId: string) => {
        try {
          await deleteDoc(doc(firestore, 'educationalInfo', tipId));
    
          
          setTips((prevTips) => prevTips.filter((tip) => tip.id !== tipId));
    
          alert('Tip deleted successfully!');
        } catch (error) {
          console.error('Error deleting tip:', error);
          alert('Error deleting tip.');
      }
    };

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

    return (
        <Layout>
            <div className="flex flex-col">
                <div className="mt-6 w-8/12 mx-auto flex justify-between items-center border-b-2 border-white pb-2 mb-4">
                    <h1 className="text-xl text-white">Educational Tips & Tricks (Admin Mode)</h1>
                    {/* Button to show/hide the form */}
                    <button
                        onClick={handleToggleForm}
                        className="bg-yellow-500 text-black p-2 rounded-full hover:bg-yellow-600 transition duration-200"
                    >
                        <FaPlus className="inline mr-2" /> Add Tip
                    </button>
                </div>
    
                <div className="flex flex-col justify-center align-middle mx-auto w-6/12">
                    {formData.showForm && (
                    <form onSubmit={editingTip ? handleUpdateTip : handleCreateTip} className="bg-[#383434] p-6 rounded-lg shadow-xl w-full space-y-4">
                        <div>
                            <div className="flex items-center justify-between">
                                <label className="text-white">Title</label>
                                <button
                                    type="button"
                                    onClick={handleClearForm}
                                    className="text-yellow-500 hover:text-yellow-600 flex items-center space-x-1"
                                >
                                    <span>Clear</span>
                                    <FaTimes />
                                </button>
                            </div>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                                className="w-full p-2 mt-1 rounded-md text-white outline-none focus:ring-2 focus:ring-yellow-500 bg-[#2c2c2c] resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-white">Category</label>
                            <input
                                type="text"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                required
                                className="w-full p-2 mt-1 rounded-md text-white outline-none focus:ring-2 focus:ring-yellow-500 bg-[#2c2c2c] resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-white">Content</label>
                            <textarea
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                required
                                className="w-full p-2 mt-1 rounded-md text-white outline-none min-h-52 focus:ring-2 focus:ring-yellow-500 bg-[#2c2c2c] resize-none"
                            />
                        </div>

                        {/* Upload fields */}
                        <div>
                            <label className="block text-white">Upload Image (Optional)</label>
                            <input
                                ref={imageInputRef}
                                type="file"
                                accept="image/*"
                                onChange={(e) => setEditImageFile(e.target.files?.[0] || null)}
                                className="w-full p-2 mt-1 rounded-md text-white outline-none focus:ring-2 focus:ring-yellow-500 bg-[#2c2c2c] resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-white">Upload Video (Optional)</label>
                            <input
                                ref={videoInputRef}
                                type="file"
                                accept="video/*"
                                onChange={(e) => setEditVideoFile(e.target.files?.[0] || null)}
                                className="w-full p-2 mt-1 rounded-md text-white outline-none focus:ring-2 focus:ring-yellow-500 bg-[#2c2c2c] resize-none"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-yellow-500 text-black py-2 rounded mt-4 hover:bg-yellow-600 transition duration-200 disabled:opacity-50"
                        >
                            {loading ? 'Uploading...' : editingTip ? 'Update Tip' : 'Add Tip'}
                        </button>

                        {editingTip && (
                            <div className="flex flex-col space-y-4">
                                {editingTip.imageUrl && !editImageFile && !pendingImageDelete && (
                                    <div className="flex flex-col items-center space-x-4">
                                        <button
                                            onClick={() => handleDeleteMedia('image')}
                                            className="text-red-500 hover:text-red-600 flex items-center text-md pb-2"
                                        >
                                            <FaTrash className="mr-2" /> Remove Image
                                        </button>
                                        <img
                                            src={editingTip.imageUrl}
                                            alt="Current Image"
                                            className="w-full h-64 object-cover rounded-lg"
                                        />
                                    </div>
                                )}
                                {pendingImageDelete && (
                                    <p className="text-red-500 text-center">Image will be removed upon submission.</p>
                                )}
                                {editImageFile && (
                                    <div className="flex flex-col items-center space-x-4">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditImageFile(null);
                                                if (imageInputRef.current) imageInputRef.current.value = '';
                                            }}
                                            className="text-red-500 hover:text-red-600 flex flex-row items-center text-md pb-2"
                                        >
                                            <FaTrash className="mr-2" /> Remove Preview Image
                                        </button>
                                        <img
                                            src={URL.createObjectURL(editImageFile)}
                                            alt="Preview Image"
                                            className="w-full h-64 object-cover rounded-lg"
                                        />
                                    </div>
                                )}

                                {editingTip.videoUrl && !editVideoFile && !pendingVideoDelete && (
                                    <div className="flex flex-col items-center space-x-4">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditVideoFile(null);
                                                if (videoInputRef.current) videoInputRef.current.value = ''; 
                                            }}
                                            className="text-red-500 hover:text-red-600 flex items-center text-md pb-2"
                                        >
                                            <FaTrash className="mr-2" /> Remove Video
                                        </button>
                                        <video
                                            src={editingTip.videoUrl}
                                            controls
                                            className="w-full h-64 object-cover rounded-lg"
                                        />
                                    </div>
                                )}
                                {pendingVideoDelete && (
                                    <p className="text-red-500 text-center">Video will be removed upon submission.</p>
                                )}
                                {editVideoFile && (
                                    <div className="flex flex-col items-center space-x-4">
                                        <button
                                            onClick={() => setEditVideoFile(null)}
                                            className="text-red-500 hover:text-red-600 flex items-center text-md pb-2"
                                        >
                                            <FaTrash className="mr-2" /> Remove Preview Video
                                        </button>
                                        <video
                                            src={URL.createObjectURL(editVideoFile)}
                                            controls
                                            className="w-full h-64 object-cover rounded-lg"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </form>
                    )}
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
                                    {/* Buttons container */}
                                    <div className="flex space-x-4">
                                      {/* Edit Button */}
                                      <div className="relative group inline-flex items-center">
                                        <button
                                          onClick={() => handleEdit(tip)}
                                          className="text-white hover:text-yellow-500"
                                        >
                                          <FaEdit />
                                        </button>
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
                                          Update Tip Info
                                        </div>
                                      </div>
                                      {/* Delete Button */}
                                      <div className="relative group inline-flex items-center">
                                        <button
                                            onClick={() => handleDelete(tip.id)}
                                            className="text-red-500 hover:text-red-600"
                                        >
                                            <FaTrash />
                                        </button>
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-[#2c2c2c] text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
                                          Delete Tip Info
                                        </div>
                                      </div>
                                    </div>
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

export default EducationalInfoAdmin;