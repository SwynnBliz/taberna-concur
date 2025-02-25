'use client';
import Layout from "../../../components/root/Layout";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getDoc, doc, deleteDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { app, firestore } from "../../../app/firebase/config";
import { AiOutlineDelete } from "react-icons/ai";
import { formatDistanceToNow } from 'date-fns'; 

interface Project {
  id: string;
  name: string;
  createdBy: string;
  members: string[];
  createdAt: Date;
  flavorProfile: string[];
  ingredients: { name: string; quantity: number; unit: string }[];
}

interface User {
  id: string;
  profilePhoto: string;
  username: string;
  bio: string;
  contactNumber: string;
  visibility: 'public' | 'private';
  role: 'admin' | 'user';
}

const ProjectViewPage = () => {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const auth = getAuth(app);

  // Function to fetch project data and members' usernames
  const fetchProjectData = async (projectId: string) => {
    try {
      const projectRef = doc(firestore, "projects", projectId);
      const projectSnapshot = await getDoc(projectRef);
  
      if (projectSnapshot.exists()) {
        const projectData = projectSnapshot.data() as Project;
        
        // Fetch createdBy username
        let createdByUsername = "Unknown";
        if (projectData.createdBy) {
          const userRef = doc(firestore, "users", projectData.createdBy);
          const userSnapshot = await getDoc(userRef);
          if (userSnapshot.exists()) {
            createdByUsername = userSnapshot.data()?.username || "Unknown";
          }
        }
  
        // Fetch members' usernames
        const memberUsernames: string[] = [];
        for (const memberId of projectData.members) {
          const userRef = doc(firestore, "users", memberId);
          const userSnapshot = await getDoc(userRef);
          if (userSnapshot.exists()) {
            memberUsernames.push(userSnapshot.data()?.username);
          }
        }
  
        setProject({
          ...projectData,
          createdBy: createdByUsername,
        });
        setMembers(memberUsernames);
      } else {
        setError("Project not found.");
      }
    } catch (error) {
      console.error("Error fetching project data:", error);
      setError("Failed to fetch project data.");
    }
  };  

  // Fetch project when the page loads and the project ID is available
  useEffect(() => {
    if (id && typeof id === "string") {
      fetchProjectData(id);
    }
  }, [id]);

  // Handle project deletion
  const handleDeleteProject = async () => {
    if (!project) return;

    const userId = auth.currentUser?.uid;
    if (!userId || project.createdBy !== userId) {
      alert("You are not authorized to delete this project.");
      return;
    }

    try {
      const projectRef = doc(firestore, "projects", project.id);
      await deleteDoc(projectRef);
      alert("Project deleted successfully.");
      window.location.href = "/collaborative";
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("Failed to delete project.");
    }
  };

  const formatTimestamp = (timestamp: any) => {
    
    return timestamp && timestamp.seconds
      ? formatDistanceToNow(new Date(timestamp.seconds * 1000), { addSuffix: true })
      : 'Invalid date';
  };
  
  if (error) {
    return (
        <Layout>
            <div className="p-6 flex items-center justify-center text-center">
                <p className="text-xl text-white">{error}</p>
            </div>
        </Layout>
    );
  }

  if (!project) {
    return (
        <Layout>
            <div className="p-6 flex items-center justify-center text-center">
                <p className="text-xl text-white">Loading project...</p>
            </div>
        </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 min-h-screen text-white rounded-lg shadow-lg">
        <h1 className="text-yellow-400 text-4xl font-bold mb-8">{project.name}</h1>
  
        {/* Project Info */}
        <div className="mb-6 bg-[#2c2c2c] p-4 rounded-lg">
          <p className="text-lg"><span className="font-semibold text-yellow-300">Created By:</span> {project.createdBy}</p>
          <p className="text-lg"><span className="font-semibold text-yellow-300">Created At:</span> {formatTimestamp(project.createdAt)}</p>
        </div>
  
        {/* Flavor Profile */}
        <div className="mb-6 bg-[#2c2c2c] p-4 rounded-lg">
          <h3 className="text-xl font-semibold text-yellow-300">Flavor Profile:</h3>
          <div className="flex flex-wrap gap-2 mt-2">
            {project.flavorProfile.length > 0 ? (
              project.flavorProfile.map((flavor, index) => (
                <span key={index} className="px-4 py-1 bg-yellow-500 text-gray-900 rounded-full text-sm font-semibold">
                  {flavor}
                </span>
              ))
            ) : (
              <p className="text-gray-400">No flavors listed</p>
            )}
          </div>
        </div>
  
        {/* Ingredients */}
        <div className="mb-6 bg-[#2c2c2c] p-4 rounded-lg">
          <h3 className="text-xl font-semibold text-yellow-300">Ingredients:</h3>
          <ul className="mt-2 space-y-3">
            {project.ingredients.length > 0 ? (
              project.ingredients.map((ingredient, index) => (
                <li key={index} className="flex justify-between bg-[#383838] p-3 rounded-lg shadow-md">
                  <span className="font-medium">{ingredient.name}</span>
                  <span className="text-yellow-300">{ingredient.quantity} {ingredient.unit}</span>
                </li>
              ))
            ) : (
              <p className="text-gray-400">No ingredients listed</p>
            )}
          </ul>
        </div>
  
        {/* Members */}
        <div className="mb-6 bg-[#2c2c2c] p-4 rounded-lg">
          <h3 className="text-xl font-semibold text-yellow-300">Members:</h3>
          <ul className="list-disc pl-5 mt-2">
            {members.length > 0 ? (
              members.map((member, index) => (
                <li key={index} className="text-white">{member}</li>
              ))
            ) : (
              <p className="text-gray-400">No members found</p>
            )}
          </ul>
        </div>
  
        {/* Delete Button */}
        <div className="flex justify-center mt-8">
          <button
            onClick={handleDeleteProject}
            className="bg-red-500 text-white justify-center py-2 px-6 rounded-lg w-full hover:bg-red-600 transition duration-300 ease-in-out flex items-center gap-2"
          >
            <AiOutlineDelete size={20} />
            Delete Project
          </button>
        </div>
      </div>
    </Layout>
  );  
};

export default ProjectViewPage;