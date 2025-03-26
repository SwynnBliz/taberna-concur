"use client"
import { useState, useEffect } from 'react';
import { firestore } from "../../../firebase/config";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import Layout from "../../../../components/root/Layout";
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { FaChevronDown } from 'react-icons/fa';
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { formatDistanceToNow } from 'date-fns';

interface Log {
  action: string;
  description: string;
  timestamp: any;
  details: string;
  createdBy: string;
  drinkDetails: {
    name: string;
    category: string;
    quantity: number;
    flavorProfile: string;
    ingredients: { name: string; quantity: number; unit: string }[];
  };
}

const ProjectLogsPage = () => {
  const params = useParams();
  const projectId = Array.isArray(params.id) ? params.id[0] : params.id;
  const pathname = usePathname();
  const [project, setProject] = useState<any>(null);
  const router = useRouter();
  const [authUser, setAuthUser] = useState<any>(null);
  const auth = getAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState<Log[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [usernames, setUsernames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setAuthUser(user || null);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (project && authUser) {
      const isMember = project.members.includes(authUser.uid);
      if (!isMember) {
        router.replace("/collaborative");
      }
    }
  }, [project, authUser, router]);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    setIsLoading(true);
  
    const projectRef = doc(firestore, "projects", projectId);
  
    // Real-time listener for the project document
    const unsubscribe = onSnapshot(projectRef, (docSnap) => {
      if (docSnap.exists()) {
        const projectData = docSnap.data();
        setProject(docSnap.data());
        let logsData = projectData.logs || [];
  
        // Filter logs if necessary
        if (filter !== 'all') {
          logsData = logsData.filter((log: Log) => log.action === filter);
        }
  
        // Sort the logs by timestamp, latest first
        logsData.sort((a: Log, b: Log) => (b.timestamp.seconds - a.timestamp.seconds));
  
        // Update the logs state with the sorted logs
        setLogs(logsData);
        setIsLoading(false);
      } else {
        setIsLoading(false);
        console.log("No such project!");
      }
    });
  
    return () => unsubscribe();
  }, [projectId, filter]);  

  // Fetch username of the creator using the createdBy userId
  const fetchUsername = async (userId: string) => {
    const userRef = doc(firestore, "users", userId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      return userDoc.data().username;
    }
    return null;
  };

  useEffect(() => {
    const fetchUsernames = async () => {
      const newUsernames = new Map<string, string>();
      for (const log of logs) {
        if (log.createdBy && !newUsernames.has(log.createdBy)) {
          const username = await fetchUsername(log.createdBy);
          if (username) {
            newUsernames.set(log.createdBy, username);
          }
        }
      }
      setUsernames(newUsernames);
    };

    fetchUsernames();
  }, [logs]);

  const toggleLogExpansion = (logId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const handleFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter(event.target.value);
  };

  const formatTimestamp = (timestamp: any) => {
    return timestamp && timestamp.seconds
      ? formatDistanceToNow(new Date(timestamp.seconds * 1000), { addSuffix: true })
      : 'Invalid date';
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <p className="text-white text-center text-xl">Loading project...</p>
        </div>
      </Layout>
    );
  }
  
  if (!project) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <p className="text-red-500 text-center text-xl">Project not found.</p>
        </div>
      </Layout>
    );
  } 

  return (
    <Layout>
      <div className="p-6 min-h-screen max-w-5xl text-white">
        <div className="mx-auto w-full h-12 flex border-b-2 mb-4">
          {[ 
            { name: "Drink Plan", path: `/collaborative/${projectId}/drink-plan` },
            { name: "Summary", path: `/collaborative/${projectId}/summary` },
            { name: "Logs", path: `/collaborative/${projectId}/logs` },
            { name: "Settings", path: `/collaborative/${projectId}/settings` },
          ].map(({ name, path }) => (
            <Link
              key={name}
              href={path}
              className={`p-3 text-lg flex-1 text-center rounded-tl-lg rounded-tr-lg transition-all duration-300
                ${pathname === path ? "bg-yellow-500 text-white" : "bg-transparent text-white hover:bg-gray-500"}`}
            >
              {name}
            </Link>
          ))}
        </div>
  
        <div className="mb-4 flex justify-end items-center">
          <label htmlFor="filter" className="mr-2 text-white">Filter by action:</label>
          <select
            id="filter"
            value={filter}
            onChange={handleFilterChange}
            className="p-2 bg-[#2c2c2c] text-white rounded-md focus:ring-2 focus:ring-yellow-500 outline-none"
          >
            <option value="all">All</option>
            <option value="ADD">Add</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
          </select>
        </div>
        
        <div className="bg-[#383838] p-4 rounded-lg min-h-[60vh]">
            {logs && Array.isArray(logs) && logs.map((log, index) => (
                <div 
                key={index} 
                className="mb-4 rounded-md cursor-pointer hover:bg-[#585858] transition-all"
                onClick={() => toggleLogExpansion(index.toString())}
                >
                {/* Top part with different background */}
                <div className="flex justify-between items-center bg-[#2c2c2c] p-4 rounded-t-md">
                    <div className="flex-grow">
                    <p className="font-semibold text-yellow-500">{log.action} - {log.description}</p>
                    <p className="text-sm text-gray-300">
                        <strong>By:</strong> {usernames.get(log.createdBy) || 'Loading...'}
                    </p>
                    </div>
                    <p className="text-sm text-gray-300 mr-2">{formatTimestamp(log.timestamp)}</p>
                    <FaChevronDown 
                    className={`text-yellow-500 transition-transform duration-300 ${expandedLogs.has(index.toString()) ? 'rotate-180' : ''}`}
                    />
                </div>

                {/* Expanded log details */}
                {expandedLogs.has(index.toString()) && (
                    <div className="p-4 pt-3 bg-[#484848] rounded-b-md">
                    <p><strong>Drink Details:</strong></p>
                    <ul className="list-none text-sm">
                        <li><strong>Name:</strong> {log.drinkDetails.name}</li>
                        <li><strong>Category:</strong> {log.drinkDetails.category}</li>
                        <li><strong>Quantity:</strong> {log.drinkDetails.quantity}</li>
                        <li><strong>Flavor Profile:</strong> {log.drinkDetails.flavorProfile}</li>
                        <li><strong>Ingredients:</strong></li>
                        {log.drinkDetails.ingredients.length > 0 && (
                        <ul className="list-disc pl-5">
                            {log.drinkDetails.ingredients.map((ingredient, idx) => (
                            <li key={idx}><strong>{ingredient.name}:</strong> {ingredient.quantity} {ingredient.unit}</li>
                            ))}
                        </ul>
                        )}
                    </ul>
                    </div>
                )}
                </div>
            ))}
        </div>
      </div>
    </Layout>
  );  
};

export default ProjectLogsPage;