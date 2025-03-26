'use client';
import Layout from '../../components/root/Layout';
import { useEffect, useState } from 'react';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app } from '../firebase/config';
import emailjs from 'emailjs-com';
import { motion } from 'framer-motion';

const ContactSupport = () => {
    const [content, setContent] = useState<string | null>(null);

    useEffect(() => {
        const fetchContent = async () => {
            const firestore = getFirestore(app);
            const contentRef = doc(firestore, 'pages', 'about-us');
            const contentDoc = await getDoc(contentRef);

            if (contentDoc.exists()) {
                const data = contentDoc.data();
                if (data && data.content) {
                    setContent(data.content);
                }
            }
    };

    fetchContent();
}, []);

const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Prevent page refresh
    
    const form = e.target as HTMLFormElement;
    const email = form.email.value;
    const category = form.category.value;
    const message = form.message.value;
    emailjs.send(
        'service_20rlf32',
        'template_skac5mc', 
        {
            user_email: email,
            category: category,
            message: message,
        },
        'S-Eb9sJdpd9LF_mUy'
    ).then((response) => {
        alert("Message Sent Successfully!");
    }).catch((error) => {
        alert("Failed to send message.");
        console.error(error);
    });

    form.reset();
};
    return (
        <Layout>
            {/* Content */}
            <div className="overflow:auto w-full h-full flex flex-col items-center justify-center bg-[#1F1F1F] text-yellow-400 px-4 sm:px-8 md:px-12 lg:px-20 xl:px-32"
                style={{ backgroundImage: "url('/Background.png')", backgroundSize: "cover" }}>
                <div className="bg-gray-800 bg-opacity-90 backdrop-blur-lg text-yellow-400 p-8 sm:p-10 md:p-12 rounded-2xl shadow-2xl w-full max-w-6xl border border-yellow-500 relative">
                    <h2 className="text-4xl sm:text-5xl font-extrabold mb-6 text-center text-yellow-300 drop-shadow-lg animate-pulse">
                        Contact Support
                    </h2>
                    {/* Contain */}
                    <div className="flex flex-col space-y-4 items-center">
                        <form onSubmit={handleSubmit} className="flex flex-col space-y-4 items-center w-full min-w-[90%]">
                            <input type="email" name="email" placeholder="Email Address" className="border-gray-300 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500 outline-none text-black mb-4 p-3 text-lg rounded w-full" required />
                            <select name="category" className="border-gray-300 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500 outline-none text-black mb-4 p-3 text-lg rounded w-full" required>
                                <option value="bugs">Bugs</option>
                                <option value="technical-assistance">Technical Assistance</option>
                                <option value="other">Other</option>
                            </select>
                            <textarea name="message" placeholder="Reason for the message" className="border-gray-300 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500 outline-none text-black mb-4 p-3 text-lg rounded h-32 w-full" required></textarea>
                            <motion.button type="submit" className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-yellow-500 text-black text-sm font-sans font-semibold rounded-md shadow-xl 
                                hover:shadow-yellow-500/80"
                            style={{ fontFamily: 'Arial' }}
                            whileHover={{ scale: 1.1 }}>Submit</motion.button>
                        </form>
                    </div>
                </div>
                <div className="text-yellow-400 text-center my-6 text-lg font-semibold">
                    OR
                </div>
                <div className="bg-gray-800 bg-opacity-90 backdrop-blur-lg text-yellow-400 p-8 sm:p-10 md:p-12 rounded-2xl shadow-2xl w-full max-w-6xl border border-yellow-500 relative">
                    <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-center text-yellow-300 drop-shadow-lg">
                        Directly contact us at:
                    </h2>
                    <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
                        <motion.button
                            className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-blue-600 text-white text-sm font-sans font-semibold rounded-md shadow-xl 
                                hover:shadow-blue-600/80 flex items-center justify-center space-x-2"
                            whileHover={{ scale: 1.1 }}
                            onClick={() => window.open('https://www.facebook.com/TabernaConcur', '_blank')}
                        >
                            <img src="/facebook-icon.png" alt="Facebook" className="w-5 h-5" />
                            <span>Facebook</span>
                        </motion.button>
                        <motion.button
                            className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-red-600 text-white text-sm font-sans font-semibold rounded-md shadow-xl 
                                hover:shadow-red-600/80 flex items-center justify-center space-x-2"
                            whileHover={{ scale: 1.1 }}
                            onClick={() => window.open('mailto:tabernaconcur@gmail.com', '_blank')}
                        >
                            <img src="/gmail-icon.png" alt="Gmail" className="w-5 h-5" />
                            <span>Gmail</span>
                        </motion.button>
                    </div>
                </div>
            </div>
        </Layout>
        
    );
};

export default ContactSupport;