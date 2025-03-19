// app/admin-educational-tip/page.tsx (Admin Educational Tip Page)
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
    const [deleteTipPrompt, setDeleteTipPrompt] = useState(false);
    const [tipIdToDelete, setTipIdToDelete] = useState<string | null>(null);

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
        
        setPendingImageDelete(false);
        setPendingVideoDelete(false);
        setEditImageFile(null);
        setEditVideoFile(null);
        setEditingTip(null);
    
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
    
    const handleDeleteTip = async (tipId: string) => {
      setTipIdToDelete(tipId);
      setDeleteTipPrompt(true);
    };
  
    const confirmDeleteTip = async () => {
      try {
        if (!tipIdToDelete) return;
        
        await deleteDoc(doc(firestore, 'educationalInfo', tipIdToDelete));
        
        setTips((prevTips) => prevTips.filter((tip) => tip.id !== tipIdToDelete));
  
        setDeleteTipPrompt(false);
  
        alert("Tip deleted successfully!");
      } catch (error) {
        console.error("Error deleting tip:", error);
        alert("Error deleting tip.");
      }
    };
  
    const cancelDeleteTip = () => {
      setDeleteTipPrompt(false);
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
          <div className="flex flex-col px-4 sm:w-8/12 mx-auto">
    <div className="mt-6 w-full flex flex-col sm:flex-row justify-between items-center border-b-2 border-white pb-2 mb-4">
        <h1 className="text-xl text-white text-center sm:text-left">Manage Tips & Tricks</h1>
        <button
            onClick={handleToggleForm}
            className="text-white p-2 rounded-full hover:bg-yellow-500 transition duration-200 mt-2 sm:mt-0"
        >
            <FaPlus className="inline mr-2" /> Add Tip
        </button>
    </div>

    <div className="flex flex-col justify-center mx-auto w-full sm:w-8/12">
        {formData.showForm && (
            <form
                onSubmit={editingTip ? handleUpdateTip : handleCreateTip}
                className="bg-[#383838] p-6 rounded-lg shadow-xl w-full space-y-4"
            >
                <div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                        <label className="text-white mb-1 sm:mb-0">Title</label>
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
<div className="px-4 w-full sm:w-8/12 mx-auto">
    <label className="block text-white text-sm sm:text-base">Upload Image (Optional)</label>
    <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => setEditImageFile(e.target.files?.[0] || null)}
        className="w-full p-2 mt-1 rounded-md text-white outline-none focus:ring-2 focus:ring-yellow-500 bg-[#2c2c2c] resize-none"
    />
</div>

<div className="px-4 w-full sm:w-8/12 mx-auto mt-4">
    <label className="block text-white text-sm sm:text-base">Upload Video (Optional)</label>
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
    className="w-full bg-yellow-500 text-white py-2 rounded mt-4 hover:bg-yellow-600 transition duration-200 disabled:opacity-40 text-sm sm:text-base"
>
    {loading ? 'Uploading...' : editingTip ? 'Update Tip' : 'Add Tip'}
</button>

{editingTip && (
    <div className="flex flex-col space-y-4 px-4 w-full sm:w-8/12 mx-auto">
        {editingTip.imageUrl && !editImageFile && !pendingImageDelete && (
            <div className="flex flex-col items-center">
                <button
                    onClick={() => handleDeleteMedia('image')}
                    className="text-red-500 hover:text-red-600 flex items-center text-sm sm:text-md pb-2"
                >
                    <FaTrash className="mr-2" /> Remove Image
                </button>
                <img
                    src={editingTip.imageUrl}
                    alt="Current Image"
                    className="w-full max-h-64 object-cover rounded-lg"
                />
            </div>
        )}
        {pendingImageDelete && (
            <p className="text-red-500 text-center text-sm sm:text-base">Image will be removed upon submission.</p>
        )}
        {editImageFile && (
            <div className="flex flex-col items-center">
                <button
                    type="button"
                    onClick={() => {
                        setEditImageFile(null);
                        if (imageInputRef.current) imageInputRef.current.value = '';
                    }}
                    className="text-red-500 hover:text-red-600 flex flex-row items-center text-sm sm:text-md pb-2"
                >
                    <FaTrash className="mr-2" /> Remove Preview Image
                </button>
                <img
                    src={URL.createObjectURL(editImageFile)}
                    alt="Preview Image"
                    className="w-full max-h-64 object-cover rounded-lg"
                />
            </div>
        )}

        {editingTip.videoUrl && !editVideoFile && !pendingVideoDelete && (
            <div className="flex flex-col items-center">
                <button
                    onClick={() => handleDeleteMedia('video')}
                    className="text-red-500 hover:text-red-600 flex items-center text-sm sm:text-md pb-2"
                >
                    <FaTrash className="mr-2" /> Remove Video
                </button>
                <video
                    src={editingTip.videoUrl}
                    controls
                    className="w-full max-h-64 object-cover rounded-lg"
                />
            </div>
        )}
        {pendingVideoDelete && (
            <p className="text-red-500 text-center text-sm sm:text-base">Video will be removed upon submission.</p>
        )}
        {editVideoFile && (
            <div className="flex flex-col items-center">
                <button
                    onClick={() => setEditVideoFile(null)}
                    className="text-red-500 hover:text-red-600 flex items-center text-sm sm:text-md pb-2"
                >
                    <FaTrash className="mr-2" /> Remove Preview Video
                </button>
                <video
                    src={URL.createObjectURL(editVideoFile)}
                    controls
                    className="w-full max-h-64 object-cover rounded-lg"
                />
            </div>
        )}
    </div>
)}
                    </form>
                    )}
                </div>
    
                {/* Search and List of Educational Tips */}
<div className="max-w-8/12 px-4 sm:px-8 md:px-16 lg:px-32 xl:px-52">
    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 items-center mt-4 my-5">
        <input
            type="text"
            placeholder="Search Tips"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 rounded-md text-white outline-none focus:ring-2 focus:ring-yellow-500 bg-[#2c2c2c] resize-none"
        />
        <button
            onClick={handleSearch}
            className="text-white p-2 rounded-full hover:text-yellow-500 transition duration-200"
        >
            <FaSearch className="w-6 h-6" />
        </button>
    </div>

    {/* Render Tips List */}
    <div className="space-y-6 my-5">
        {filteredTips.length === 0 ? (
            <p className="text-yellow-500 text-center">No results found</p>
        ) : (
            filteredTips.map((tip: Tip) => (
                <div key={tip.id} className="bg-[#383838] flex flex-col p-4 rounded-lg shadow-lg space-y-4 text-white relative">
                    {/* Title and buttons container */}
                    <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
                        <h3 className="text-xl sm:text-2xl font-semibold text-center text-yellow-500 flex-1">{tip.title}</h3>
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
                                    onClick={() => handleDeleteTip(tip.id)}
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
                    {tip.imageUrl && <img src={tip.imageUrl} alt={tip.title} className="w-full max-h-80 rounded-lg object-cover" />}
                
                    {/* Content and category */}
                    <LinkIt component={renderLink} regex={urlRegex}>
                        <p className="whitespace-pre-wrap text-sm sm:text-base">{tip.content}</p>
                    </LinkIt>
                    <p className="text-yellow-500 text-sm sm:text-base">Category: {tip.category}</p>
                
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
                    {deleteTipPrompt && (
                      <div className="fixed inset-0 bg-[#484848] bg-opacity-40 flex items-center justify-center z-50">
                        <div className="bg-[#2c2c2c] p-6 rounded-lg text-white text-center">
                          <p>Are you sure you want to delete this tip? This cannot be undone!</p>
                          <div className="mt-4 flex justify-between gap-4">
                            <button
                              onClick={confirmDeleteTip}
                              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={cancelDeleteTip}
                              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                </div>
            </div>
        </Layout>
    );    
};

export default EducationalInfoAdmin;