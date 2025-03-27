// app/collaborative/[id]/settings/page.tsx (Collaborative Project Settings Page)
"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, getDocs, deleteDoc, updateDoc, onSnapshot, setDoc, collection } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { firestore } from "../../../firebase/config";
import { FaTrashAlt, FaEdit, FaSave, FaTimes, FaPlus } from "react-icons/fa";
import Layout from "../../../../components/root/Layout";
import Link from "next/link";
import { usePathname } from "next/navigation"; 

// Options for flavor and measurement
const flavorOptions = [
  "Bitter", "Briny", "Caramel", "Chocolate", "Citrusy", "Creamy", "Dry", 
  "Earthy", "Floral", "Fruity", "Herbal", "Malty", "Nutty", "Oaky", 
  "Rich", "Robust", "Salty", "Savory", "Smoky", "Sour", "Spicy", 
  "Strong", "Sweet", "Tangy", "Tart", "Umami", "Vanilla", "Woody"
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

const unitConversionMap: Record<string, number> = {
  ml: 1, cl: 10, dl: 100, liter: 1000, oz: 29.5735,
  pint: 473.176, quart: 946.353, gallon: 3785.41,
  g: 1, kg: 1000, lb: 453.592,
  dash: 0.92, drop: 0.05, pinch: 0.36,
  tsp: 4.2,
  tbsp: 12.6,
};

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

const ProjectSettingsPage = () => {
  const params = useParams();
  const projectId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [project, setProject] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [flavorProfile, setFlavorProfile] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<{ name: string; quantity: number; unit: string }[]>([]);
  const [authUser, setAuthUser] = useState<any>(null);
  const router = useRouter();
  const auth = getAuth();
  const [originalProject, setOriginalProject] = useState<any>(null);
  const [memberNames, setMemberNames] = useState<{ [key: string]: string }>({});
  const [editedMembers, setEditedMembers] = useState<string[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const pathname = usePathname();
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [priorityPercentage, setPriorityPercentage] = useState({ 
    ingredients: 50, 
    flavors: 50 
  });
  const [isLoading, setIsLoading] = useState(true);

  if (!projectId) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <h1 className="text-red-500 text-center text-2xl p-6">Project Id does not exist</h1>;
        </div>
      </Layout>
    );
  }

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
    if (project) {
        setEditedMembers(project.members);
        setInvitedEmails(project.invitedEmails);
        setIsLoading(false);
    }
  }, [project]);

  useEffect(() => {
    if (project?.priorityPercentage) {
      setPriorityPercentage({
        ingredients: project.priorityPercentage.ingredients,
        flavors: project.priorityPercentage.flavors,
      });
    }
  }, [project]);

  useEffect(() => {
    if (!projectId) return;
  
    const projectRef = doc(firestore, "projects", projectId);
    const unsubscribe = onSnapshot(projectRef, async (snapshot) => {
      if (snapshot.exists()) {
        const projectData = snapshot.data();
        setProject(projectData);
        setOriginalProject(projectData);
        setProjectName(projectData.name);
        setFlavorProfile(projectData.flavorProfile);
        setIngredients(projectData.ingredients);
        
        if (projectData.members.length > 0) {
          await fetchUserNames(projectData.members);
        }
      } else {
        setProject(null);
      }
  
      setIsLoading(false);
    });
  
    return () => unsubscribe();
  }, [projectId]);  
  
  const fetchUserNames = async (memberIds: string[]) => {
    const memberData: { [key: string]: string } = {};
  
    await Promise.all(memberIds.map(async (userId) => {
      const userRef = doc(firestore, "users", userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        memberData[userId] = userSnap.data().username || "Unknown";
      }
    }));
  
    setMemberNames(memberData);
  };

  const handleUpdateProject = async () => {
    if (!authUser || authUser.uid !== project.createdBy) return;

    try {
        const projectRef = doc(firestore, "projects", projectId);
        await updateDoc(projectRef, {
            name: projectName,
            flavorProfile,
            ingredients,
            members: editedMembers,
            invitedEmails,
            priorityPercentage,
        });

        // Identify new invites
        const newInvites = invitedEmails.filter(email => !project.invitedEmails.includes(email));
        await Promise.all(newInvites.map(email =>
            setDoc(doc(collection(firestore, "invitations")), {
                projectId,
                email,
                projectName,
            })
        ));

        // Identify removed invites
        const removedInvites = project.invitedEmails.filter((email: string) => !invitedEmails.includes(email));

        // Delete invitations for removed emails
        if (removedInvites.length > 0) {
            const invitationsRef = collection(firestore, "invitations");
            const snapshot = await getDocs(invitationsRef);

            const deletionPromises = snapshot.docs
                .filter(doc => removedInvites.includes(doc.data().email) && doc.data().projectId === projectId)
                .map(doc => deleteDoc(doc.ref));

            await Promise.all(deletionPromises);
        }

        setIsEditing(false);
    } catch (error) {
        console.error("Error updating project:", error);
    }
  };

  const handleCancelEdit = () => {
    setProjectName(originalProject.name);
    setFlavorProfile(originalProject.flavorProfile);
    setIngredients(originalProject.ingredients);
    setEditedMembers(originalProject.members);
    setInvitedEmails(originalProject.invitedEmails);
    setIsEditing(false);
  };

  const handlePriorityChange = (value: number) => {
    setPriorityPercentage({
      ingredients: 100 - value,
      flavors: value
    });
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

  const handleRemoveMember = (memberId: string) => {
    if (!isEditing) return;
    setEditedMembers(editedMembers.filter(id => id !== memberId));
  };

  const handleDeleteProject = async () => {
    if (!authUser || authUser.uid !== project.createdBy) return;

    try {
      const projectRef = doc(firestore, "projects", projectId);
      await deleteDoc(projectRef);
      alert("Project deleted successfully!");
      router.replace("/collaborative");
    } catch (error) {
      console.error("Error deleting project:", error);
    }
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
      <div className="p-6 min-h-screen w-full">
      <div className="mx-auto w-full h-12 flex border-b-2 border-white mb-4">
          {/* Tabs */}
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
        
        <div className="mx-auto bg-[#383838] p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl text-yellow-500 font-bold mt-2">
              {isEditing ? (
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="bg-[#2c2c2c] text-white p-2 rounded-md w-full focus:ring-2 focus:ring-yellow-500 outline-none"
                />
              ) : (
                project.name
              )}
            </h1>
  
            {authUser && authUser.uid === project.createdBy && (
              <div className="flex gap-3">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleCancelEdit}
                      className="bg-gray-500 text-white px-3 py-2 rounded-md flex items-center gap-2 hover:bg-gray-600 transition"
                    >
                      <FaTimes /> Cancel
                    </button>
                    <button
                      onClick={handleUpdateProject}
                      className="bg-yellow-500 text-white px-3 py-2 rounded-md flex items-center gap-2 hover:bg-yellow-600 transition"
                    >
                      <FaSave /> Save
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="bg-yellow-500 text-white px-3 py-2 rounded-md flex items-center gap-2 hover:bg-yellow-600 transition"
                    >
                      <FaEdit /> Edit
                    </button>

                    {/* Delete Button Only When Not Editing */}
                    <button
                      onClick={() => setShowDeletePopup(true)}
                      className="bg-red-500 text-white px-3 py-2 rounded-md flex items-center gap-2 hover:bg-red-600 transition"
                    >
                      <FaTrashAlt /> Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Delete Project Modal Popup */}
          {showDeletePopup && (
            <div className="fixed inset-0 bg-[#484848] bg-opacity-40 flex items-center justify-center z-50">
              <div className="bg-[#2c2c2c] p-6 rounded-lg text-white text-center">
                <p>Are you sure you want to delete this project? This cannot be undone!</p>
                <div className="mt-4 flex justify-between gap-4">
                  <button
                    onClick={handleDeleteProject}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setShowDeletePopup(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Priority Slider */}
          <div className="mt-4">
            <h2 className="text-lg text-white">Flavor vs. Ingredient Priority:</h2>

            {isEditing ? (
              <>
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
                  <span className="text-[#FF8C00]">Flavors: {priorityPercentage.flavors}%</span>, 
                  <span className="text-[#E63946]"> Ingredients: {priorityPercentage.ingredients}%</span>
                </p>
              </>
            ) : (
              <p className="text-gray-300">
                Flavors: {priorityPercentage.flavors}%, Ingredients: {priorityPercentage.ingredients}%
              </p>
            )}
          </div>
  
          {/* Flavor Profile */}
          <div className="mt-4">
            <h2 className="text-lg text-white">Flavor Profile:</h2>
            {isEditing ? (
              flavorProfile.map((flavor, index) => (
                <div key={index} className="flex gap-2 mt-2">
                  <select
                    value={flavor}
                    onChange={(e) => {
                      const updatedFlavors = [...flavorProfile];
                      updatedFlavors[index] = e.target.value;
                      setFlavorProfile(updatedFlavors);
                    }}
                    className="w-full p-2 rounded text-white bg-[#2c2c2c] outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    {flavorOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  {index > 0 && (
                    <button onClick={() => handleFlavorProfileRemove(index)} className="text-red-500 hover:text-red-600">
                      <FaTrashAlt />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-300">{flavorProfile.join(", ")}</p>
            )}
            {isEditing && (
              <button
                onClick={handleFlavorProfileAdd}
                className="w-full bg-gray-500 text-white py-2 rounded mt-2 flex items-center justify-center gap-2 hover:bg-gray-600 transition"
              >
                <FaPlus /> Add Flavor
              </button>
            )}
          </div>
  
          {/* Ingredients */}
          <div className="mt-4">
            <h2 className="text-lg text-white">Ingredients:</h2>
            {isEditing ? (
              ingredients.map((ingredient, index) => (
                <div key={index} className="flex gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="Ingredient Name"
                    value={ingredient.name}
                    onChange={(e) => handleIngredientChange(index, "name", e.target.value)}
                    className="w-1/2 p-2 rounded text-white bg-[#2c2c2c] outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                  <input
                    type="number"
                    placeholder="Quantity"
                    value={ingredient.quantity || ""}
                    onChange={(e) => handleIngredientChange(index, "quantity", parseFloat(e.target.value))}
                    className="w-1/4 p-2 rounded text-white bg-[#2c2c2c] outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                  <select
                    value={ingredient.unit}
                    onChange={(e) => handleIngredientChange(index, "unit", e.target.value)}
                    className="w-1/4 p-2 rounded text-white bg-[#2c2c2c] outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    {measurementOptions.map((unit) => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                  {index > 0 && (
                    <button onClick={() => handleIngredientRemove(index)} className="text-red-500 hover:text-red-600">
                      <FaTrashAlt />
                    </button>
                  )}
                </div>
              ))
            ) : (
                <ul className="text-gray-300 list-disc pl-5">
                {ingredients.map((ingredient, index) => (
                    <li key={index}>
                    {ingredient.name} - {ingredient.quantity} {ingredient.unit}
                    </li>
                ))}
                </ul>
            )}
            {isEditing && (
              <button
                onClick={handleIngredientAdd}
                className="w-full bg-gray-500 text-white py-2 rounded mt-2 flex items-center justify-center gap-2 hover:bg-gray-600 transition"
              >
                <FaPlus /> Add Ingredient
              </button>
            )}
          </div>
  
        {/* Members Section */}
        <div className="mt-4">
            <h2 className="text-lg text-white">Members:</h2>
            <ul className="text-gray-300 list-disc pl-5">
                {editedMembers.map((memberId: string, index: number) => (
                    <li key={index}>
                        <div className="flex justify-between items-center">
                            {memberNames[memberId] || "Loading..."}
                            {authUser && authUser.uid === project.createdBy && isEditing && (
                                <button 
                                    onClick={() => handleRemoveMember(memberId)} 
                                    className="text-red-500 hover:text-red-600"
                                >
                                    <FaTrashAlt />
                                </button>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        </div>

        {/* Invited Emails Section */}
        <div className="mt-4">
            <h2 className="text-lg text-white">Invited Emails:</h2>
            {isEditing ? (
                <div>

                    <div className="flex gap-2 mb-2 mt-2">
                        <input
                            type="email"
                            placeholder="Enter email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            className="w-full p-2 rounded text-white bg-[#2c2c2c] outline-none focus:ring-2 focus:ring-yellow-500"
                        />
                        <button
                        onClick={() => {
                            if (inviteEmail && !invitedEmails.includes(inviteEmail)) {
                            setInvitedEmails([...invitedEmails, inviteEmail]);
                            setInviteEmail("");
                            }
                        }}
                        className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600 transition">
                            Add
                        </button>
                    </div>

                    <ul>
                        {invitedEmails.map((email, index) => (
                        <li key={index} className="text-gray-300 bg-[#2c2c2c] p-2 mb-2 rounded flex justify-between">
                            {email}
                            <button
                                onClick={() => setInvitedEmails(invitedEmails.filter((_, i) => i !== index))}
                                className="text-red-500 hover:text-red-600"
                            >
                                <FaTrashAlt />
                            </button>
                        </li>
                        ))}
                    </ul>
                </div>
            ) : (
                <ul className="text-gray-300 list-disc pl-5">
                    {project.invitedEmails?.map((email: string, index: number) => (
                        <li key={index}>{email}</li>
                    ))}
                </ul>
            )}
        </div>
      </div>
     </div>
    </Layout>
  );  
};

export default ProjectSettingsPage;