// app/post-view/[id]/page.tsx (Post View Page)
'use client';
import Layout from '../../../components/root/Layout'; // Layout component
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation'; // For dynamic route params
import { collection, query, orderBy, onSnapshot, updateDoc, doc, increment, getDoc, deleteDoc, where } from 'firebase/firestore';
import { firestore } from '../../firebase/config'; // Import Firestore instance
import { getAuth } from 'firebase/auth'; // For getting the current logged-in user's UID
import useBannedWords from '../../../components/forum/hooks/useBannedWords';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns'; // Import the function from date-fns
import { FaThumbsUp, FaThumbsDown, FaTrash, FaEdit, FaBookmark, FaComment } from 'react-icons/fa'; // Importing React Icons

const ProfileView = () => {
  const { id } = useParams(); // Get the `id` from the dynamic route

  return (
    <>
      Post Page: User Id: {`${id}`};
    </>
  );
};

export default ProfileView;
