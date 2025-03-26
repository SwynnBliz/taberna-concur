// app/collaborative/page.tsx (Collaborative Page)
'use client';
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import Layout from "../../components/root/Layout";
import { app, firestore } from "../../app/firebase/config";
import { AiOutlinePlus } from "react-icons/ai";
import { FaTrashAlt, FaPlus, FaCheck } from "react-icons/fa";
import { AiOutlineClose } from "react-icons/ai";
import { formatDistanceToNow } from 'date-fns';
import Link from "next/link";

// Options for flavor and measurement
const flavorOptions = [
  "Bitter", "Caramel", "Chocolate", "Creamy", "Dry", "Floral",
  "Fruity", "Herbal", "Malty", "Nutty", "Oaky", "Smoky",
  "Sour", "Spicy", "Sweet", "Vanilla"
];
  
const measurementOptions = [
  // Volume (Liquids)
  "ml", "cl", "dl", "liter", "oz", "pint", "quart", "gallon",

  // Weight (Solids)
  "g", "kg", "lb", 

  // Small Additives (Common in Bartending)
  "dash", "drop", "pinch", 

  // Countable Items (Fruits, Garnishes, etc.)
  "piece", "slice", "wedge", "twist", "tsp", "tbsp"
];

interface Project {
  id: string;
  name: string;
  createdBy: string;
  members: string[];
  invitedEmails: string[];
  createdAt: Date;
  flavorProfile: string[];
  ingredients: { name: string; quantity: number; unit: string }[];
  priorityPercentage: { ingredients: number; flavors: number };
}

const CollaborativePage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [flavorProfile, setFlavorProfile] = useState<string[]>(["Bitter"]);
  const [ingredients, setIngredients] = useState<{ name: string; quantity: number; unit: string }[]>([
    { name: "", quantity: 0, unit: "ml" },
  ]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const auth = getAuth(app);
  const [invitations, setInvitations] = useState<{ id: string; projectName: string }[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [priorityPercentage, setPriorityPercentage] = useState({
    ingredients: 50,
    flavors: 50
  });
  
  const fetchProjects = (userId: string) => {
    const projectsRef = collection(firestore, "projects");
    const q = query(projectsRef, where("members", "array-contains", userId));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const userProjects: Project[] = querySnapshot.docs.map((doc) => {
        return {
          id: doc.id,
          ...doc.data(),
        } as Project;
      });

      const sortedProjects = userProjects.sort((a, b) => {
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
      });

      setProjects(sortedProjects);
    });

    return unsubscribe;
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
        const unsubscribeProjects = fetchProjects(user.uid);
        const unsubscribeInvitations = fetchInvitations(user.uid);
        
        return () => {
          unsubscribeProjects();
          unsubscribeInvitations();
        };
      } else {
        setIsAuthenticated(false);
      }
    });
  
    return () => unsubscribeAuth();
  }, []);
  
  const fetchInvitations = (userId: string) => {
    const invitationsRef = collection(firestore, "invitations");
    const q = query(invitationsRef, where("email", "==", auth.currentUser?.email));
  
    return onSnapshot(q, (snapshot) => {
      const pendingInvites = snapshot.docs.map((doc) => ({
        id: doc.id,
        projectName: doc.data().projectName,
      }));
      setInvitations(pendingInvites);
    });
  };
  
  const handleAcceptInvitation = async (inviteId: string, projectName: string) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
  
    try {
      const invitationRef = doc(firestore, "invitations", inviteId);
      const invitationSnap = await getDoc(invitationRef);
  
      if (!invitationSnap.exists()) {
        console.error("Invitation does not exist.");
        return;
      }
  
      const projectId = invitationSnap.data().projectId;
      const invitedEmail = invitationSnap.data().email; // Get the invited email
      const projectRef = doc(firestore, "projects", projectId);
      const projectSnap = await getDoc(projectRef);
  
      if (!projectSnap.exists()) {
        console.error("Project not found.");
        return;
      }
  
      const projectData = projectSnap.data();
      const updatedMembers = [...(projectData.members || []), userId];
  
      // Remove the accepted email from invitedEmails array
      const updatedInvitedEmails = projectData.invitedEmails?.filter((email: string) => email !== invitedEmail) || [];
  
      // Update the project document
      await setDoc(projectRef, { 
        members: updatedMembers, 
        invitedEmails: updatedInvitedEmails 
      }, { merge: true });
  
      // Remove invitation after accepting
      await deleteDoc(invitationRef);
  
      // Update UI state
      setInvitations((prev) => prev.filter((inv) => inv.id !== inviteId));
    } catch (error) {
      console.error("Error accepting invitation:", error);
    }
  };  
  
  const handleDeclineInvitation = async (inviteId: string) => {
    try {
      const invitationRef = doc(firestore, "invitations", inviteId);
      const invitationSnap = await getDoc(invitationRef);
  
      if (!invitationSnap.exists()) {
        console.error("Invitation not found in Firestore.");
        return;
      }
  
      const projectId = invitationSnap.data().projectId;
      const invitedEmail = invitationSnap.data().email; // Get the invited email
      const projectRef = doc(firestore, "projects", projectId);
      const projectSnap = await getDoc(projectRef);
  
      if (!projectSnap.exists()) {
        console.error("Project not found.");
        return;
      }
  
      const projectData = projectSnap.data();
      const updatedInvitedEmails = projectData.invitedEmails?.filter((email: string) => email !== invitedEmail) || [];
  
      // Update the project document
      await setDoc(projectRef, { invitedEmails: updatedInvitedEmails }, { merge: true });
  
      // Remove invitation after declining
      await deleteDoc(invitationRef);
      setInvitations((prev) => prev.filter((inv) => inv.id !== inviteId));
    } catch (error) {
      console.error("Error declining invitation:", error);
    }
  };
  
  const handleCreateProject = async () => {
    if (!projectName) return alert("Project name is required.");
    const userId = auth.currentUser?.uid;
    if (!userId) return;
  
    const projectData: Omit<Project, 'id'> = {
      name: projectName,
      createdBy: userId,
      members: [userId],
      invitedEmails,
      createdAt: new Date(),
      flavorProfile,
      ingredients,
      priorityPercentage: {
        ingredients: priorityPercentage.ingredients,
        flavors: priorityPercentage.flavors
      }
    };
    
    try {
      const projectRef = doc(collection(firestore, "projects"));
      await setDoc(projectRef, projectData);
  
      // Send invitations
      await Promise.all(invitedEmails.map(email =>
        setDoc(doc(collection(firestore, "invitations")), {
          projectId: projectRef.id,
          email,
          projectName,
        })
      ));

      alert("Project created successfully!");
  
      handleCancel();
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project.");
    }
  };

  const handlePriorityChange = (value: number) => {
    setPriorityPercentage({
      ingredients: 100 - value,
      flavors: value
    });
  };  
  
  const handleCancel = () => {
    setIsModalOpen(false);
    setProjectName('');
    setFlavorProfile(["Bitter"]);
    setIngredients([{ name: "", quantity: 0, unit: "ml" }]);
    setInvitedEmails([]);
    setInviteEmail("");
    setPriorityPercentage({ ingredients: 50, flavors: 50 });
  };
  

  const handleFlavorProfileChange = (index: number, value: string) => {
    const updatedProfiles = [...flavorProfile];
    updatedProfiles[index] = value;
    setFlavorProfile(updatedProfiles);
  };

  const handleFlavorProfileAdd = () => {
    if (flavorProfile.length < flavorOptions.length) {
      setFlavorProfile([...flavorProfile, ""]);
    }
  };

  const handleFlavorProfileRemove = (index: number) => {
    const updatedProfiles = flavorProfile.filter((_, i) => i !== index);
    setFlavorProfile(updatedProfiles);
  };

  const handleIngredientChange = (index: number, field: string, value: string | number) => {
    const updatedIngredients = [...ingredients];
    updatedIngredients[index] = { ...updatedIngredients[index], [field]: value };
    setIngredients(updatedIngredients);
  };

  const handleIngredientAdd = () => {
    setIngredients([...ingredients, { name: "", quantity: 0, unit: "ml" }]);
  };

  const handleIngredientRemove = (index: number) => {
    const updatedIngredients = ingredients.filter((_, i) => i !== index);
    setIngredients(updatedIngredients);
  };

  const formatTimestamp = (timestamp: any) => {
    return timestamp && timestamp.seconds
      ? formatDistanceToNow(new Date(timestamp.seconds * 1000), { addSuffix: true })
      : 'Invalid date';
  };

  return (
    <Layout>
      <div className="p-6 min-h-screen">
        <div className="absolute top-5 right-5">
        <button onClick={() => setIsNotificationOpen(!isNotificationOpen)} className={`relative p-3 rounded-full text-white text-sm transition-colors ${isNotificationOpen ? "bg-yellow-500" : "bg-[#2c2c2c] hover:bg-yellow-500"}`}>
            Invitations
            {invitations.length > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full px-2">
                {invitations.length}
              </span>
            )}
          </button>

          {isNotificationOpen && (
            <div className="absolute right-0 mt-2 bg-[#383838] rounded-lg p-4 w-64">
              <h2 className="font-bold text-white mb-2 text-sm">Invitations</h2>
              {invitations.length > 0 ? (
                invitations.map((invite) => (
                  <div key={invite.id} className="p-2 bg-[#484848] flex justify-between mb-2 rounded-md text-sm">
                    <p className="text-white  ">{invite.projectName}</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleAcceptInvitation(invite.id, invite.projectName)} className="text-white hover:text-yellow-500"><FaCheck size={16}/></button>
                      <button onClick={() => handleDeclineInvitation(invite.id)} className="text-white hover:text-red-500"><AiOutlineClose size={16}/></button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-white text-sm">No new invitations.</p>
              )}
            </div>
          )}
        </div>
        <h1 className="text-yellow-500 text-3xl font-bold mb-6">Collaborative Projects</h1>
        
        <div className="grid grid-cols-4 gap-8">
          {/* Create Project Box */}
          <div
            onClick={() => setIsModalOpen(true)}
            className="flex justify-center items-center bg-[#383838] text-black rounded-xl p-10 cursor-pointer shadow-lg hover:bg-yellow-500 transition duration-300 ease-in-out"
            style={{ height: '180px' }}
          >
            <AiOutlinePlus size={80} color="white" />
          </div>

          {/* Existing Project Boxes */}
          {projects.map((project, index) => (
            <Link key={index} href={`/collaborative/${project.id}/drink-plan`}>
              <div
                className="flex flex-col justify-between items-center bg-[#2c2c2c] text-yellow-500 rounded-xl p-8 cursor-pointer hover:bg-yellow-500 hover:text-white transition duration-300 ease-in-out shadow-lg"
                style={{ height: '180px' }}
              >
                <div className="text-2xl font-semibold">{project.name}</div>
                <div className="text-xs font-semibold text-gray-300">Created at: {formatTimestamp(project.createdAt)}</div>
                <div className="text-xs mt-2 text-gray-300">Members: {project.members.length}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Create Project Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 flex pt-32 pb-10 justify-center items-center bg-[#484848] bg-opacity-40 z-50"
        >
          <div
            className="bg-[#383838] text-white p-6 rounded-xl shadow-xl max-w-xl w-full h-auto overflow-y-auto"
            style={{ maxHeight: '80vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-semibold mb-4 text-yellow-500">Create a New Project</h2>
            {/* Project Name */}
            <label className="font-semibold text-white">Project Name</label>
            <input
              type="text"
              className="bg-[#2c2c2c] text-white outline-none focus:ring-2 focus:ring-yellow-500 p-3 w-full rounded-md mb-4"
              placeholder="Enter project name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />

            {/* Priority Slider */}
            <label className="font-semibold text-white">Flavor vs. Ingredient Priority</label>
            <input
              type="range"
              id="priority-slider"
              min="0"
              max="100"
              value={priorityPercentage.flavors}
              onChange={(e) => handlePriorityChange(parseInt(e.target.value))}
              className="w-full cursor-pointer appearance-none h-2 rounded-lg outline-none"
              style={{
                background: `linear-gradient(to right, #FF8C00 ${priorityPercentage.flavors}%, #E63946 ${priorityPercentage.flavors}%)`,
              }}
            />
            <p className="text-white text-sm mb-4">
              <span className="text-[#FF8C00]">Flavors: {priorityPercentage.flavors}%</span>, <span className="text-[#E63946]">Ingredients: {priorityPercentage.ingredients}%</span>
            </p>

            {/* Flavor Profile */}
            <label className="font-semibold text-white">Flavor Profile</label>
            {flavorProfile.map((flavor, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <select value={flavor} onChange={(e) => handleFlavorProfileChange(index, e.target.value)} className="w-full p-2 rounded bg-[#2c2c2c] outline-none focus:ring-2 focus:ring-yellow-500">
                  {flavorOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                {index > 0 && (
                  <button onClick={() => handleFlavorProfileRemove(index)} className="text-red-500 hover:text-red-600"><FaTrashAlt /></button>
                )}
              </div>
            ))}
            <button onClick={handleFlavorProfileAdd} className="w-full bg-gray-500 text-white py-2 rounded mb-4 flex items-center justify-center gap-2 hover:bg-gray-600 transition">
              <FaPlus /> Add Flavor
            </button>

            {/* Ingredients */}
            <label className="font-semibold text-white">Ingredients</label>
            {ingredients.map((ingredient, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Ingredient Name"
                  value={ingredient.name}
                  onChange={(e) => handleIngredientChange(index, "name", e.target.value)}
                  className="w-1/2 p-2 rounded bg-[#2c2c2c] outline-none focus:ring-2 focus:ring-yellow-500"
                />
                <input
                  type="number"
                  placeholder="Quantity"
                  value={ingredient.quantity || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleIngredientChange(index, "quantity", value === "" ? 0 : parseFloat(value));
                  }} 
                  className="w-1/4 p-2 rounded bg-[#2c2c2c] outline-none focus:ring-2 focus:ring-yellow-500"
                />
                <select
                  value={ingredient.unit}
                  onChange={(e) => handleIngredientChange(index, "unit", e.target.value)}
                  className="w-1/4 p-2 rounded bg-[#2c2c2c] outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  {measurementOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                </select>
                {index > 0 && (
                  <button onClick={() => handleIngredientRemove(index)} className="text-red-500 hover:text-red-600"><FaTrashAlt /></button>
                )}
              </div>
            ))}
            <button onClick={handleIngredientAdd} className="w-full bg-gray-500 text-white py-2 rounded mt-2 mb-4 flex items-center justify-center gap-2 hover:bg-gray-600 transition">
              <FaPlus /> Add Ingredient
            </button>

            {/* Invitation for Collaborators */}
            <label className="font-semibold text-white">Invite Collaborators (Emails)</label>
              <div className="flex gap-2 mb-4">
                <input
                  type="email"
                  placeholder="Enter email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full p-2 rounded bg-[#2c2c2c] outline-none focus:ring-2 focus:ring-yellow-500"
                />
                <button
                  onClick={() => {
                    if (inviteEmail) {
                      setInvitedEmails([...invitedEmails, inviteEmail]);
                      setInviteEmail("");
                    }
                  }}
                  className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600 transition"
                >
                  Add
                </button>
              </div>
              <ul>
                {invitedEmails.map((email, index) => (
                  <li key={index} className="text-gray-300 bg-[#2c2c2c] p-2 mb-2 rounded flex justify-between">
                    {email}
                    <button onClick={() => setInvitedEmails(invitedEmails.filter((_, i) => i !== index))} className="text-red-500 hover:text-red-600"><FaTrashAlt /></button>
                  </li>
                ))}
              </ul>

            {/* Buttons */}
            <div className="flex justify-between mt-6">
              <button
                onClick={handleCancel}
                className="bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition duration-300 ease-in-out"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                className="bg-yellow-500 text-white py-2 px-4 rounded-lg hover:bg-yellow-600 transition duration-300 ease-in-out"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default CollaborativePage;