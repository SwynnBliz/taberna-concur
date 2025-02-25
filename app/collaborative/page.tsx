'use client';
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, setDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import Layout from "../../components/root/Layout";
import { app, firestore } from "../../app/firebase/config";
import { AiOutlinePlus } from "react-icons/ai";
import { FaTrashAlt, FaPlus  } from "react-icons/fa";
import Link from "next/link";  // Import the Link component

// Options for flavor and measurement
const flavorOptions = [
  "Fruity", "Smoky", "Spicy", "Sweet", "Sour", "Bitter",
  "Dry", "Herbal", "Floral", "Nutty", "Caramel",
  "Oaky", "Vanilla", "Chocolate", "Malty", "Creamy"
];

const measurementOptions = [
  "ml", "liter", "cl", "dl", "oz", "pint", "quart", "gallon",
  "g", "kg", "lb", "piece", "cube", "dash", "slice", "sprig"
];

// Project Interface with flavorProfile and ingredients
interface Project {
  id: string;
  name: string;
  createdBy: string;
  members: string[];
  createdAt: Date;
  flavorProfile: string[];
  ingredients: { name: string; quantity: number; unit: string }[];
}

const CollaborativePage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [flavorProfile, setFlavorProfile] = useState<string[]>(["Fruity"]);
  const [ingredients, setIngredients] = useState<{ name: string; quantity: number; unit: string }[]>([
    { name: "", quantity: 0, unit: "ml" },
  ]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const auth = getAuth(app);

  // Real-time listener to fetch projects the user is a member of
  const fetchProjects = (userId: string) => {
    const projectsRef = collection(firestore, "projects");
    const q = query(projectsRef, where("members", "array-contains", userId));

    // Real-time listener using onSnapshot
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const userProjects: Project[] = querySnapshot.docs.map((doc) => {
        return {
          id: doc.id,
          ...doc.data(),
        } as Project;
      });

      // Sort the projects alphabetically by name
      const sortedProjects = userProjects.sort((a, b) => {
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
      });

      setProjects(sortedProjects);
    });

    // Return unsubscribe function to stop listening when no longer needed
    return unsubscribe;
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
        const unsubscribeProjects = fetchProjects(user.uid);
        // Clean up listener when the user is logged out
        return () => unsubscribeProjects();
      } else {
        setIsAuthenticated(false);
      }
    });

    // Clean up listener for authentication state change
    return () => unsubscribeAuth();
  }, []);

  const handleCreateProject = async () => {
    if (!projectName) return alert("Project name is required.");
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const projectData: Omit<Project, 'id'> = {
      name: projectName,
      createdBy: userId,
      members: [userId],
      createdAt: new Date(),
      flavorProfile,
      ingredients
    };

    try {
      const projectRef = doc(collection(firestore, "projects"));
      await setDoc(projectRef, projectData);
      const newProject: Project = { ...projectData, id: projectRef.id };

      setProjects((prevProjects) => {
        const isProjectExist = prevProjects.some((project) => project.id === newProject.id);
        if (!isProjectExist) {
          const updatedProjects = [...prevProjects, newProject];
          return updatedProjects.sort((a, b) => a.name.localeCompare(b.name));
        }
        return prevProjects;
      });

      setIsModalOpen(false);
      setProjectName('');
      setFlavorProfile(["Fruity"]);
      setIngredients([{ name: "", quantity: 0, unit: "ml" }]);
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project.");
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setProjectName('');
    setFlavorProfile(["Fruity"]);
    setIngredients([{ name: "", quantity: 0, unit: "ml" }]);
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

  return (
    <Layout>
      <div className="p-6 min-h-screen">
        <h1 className="text-yellow-500 text-3xl font-bold mb-6">Collaborative Projects</h1>
        
        <div className="grid grid-cols-3 gap-8">
          {/* Create Project Box */}
          <div
            onClick={() => setIsModalOpen(true)}
            className="flex justify-center items-center bg-[#383838] text-black rounded-xl p-10 cursor-pointer shadow-lg hover:bg-yellow-500 transition duration-300 ease-in-out"
            style={{ height: '300px' }}
          >
            <AiOutlinePlus size={80} color="white" />
          </div>

          {/* Existing Project Boxes */}
          {projects.map((project, index) => (
            <Link key={index} href={`/collaborative/${project.id}`}>
              <div
                className="flex flex-col justify-between items-center bg-[#2c2c2c] text-white rounded-xl p-8 cursor-pointer hover:bg-yellow-500 transition duration-300 ease-in-out shadow-lg"
                style={{ height: '300px' }}
              >
                <div className="text-xl font-semibold text-white">{project.name}</div>
                <div className="text-sm mt-2 text-gray-300">Members: {project.members.length}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Create Project Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 flex mt-32 mb-10 justify-center items-center bg-[#484848] bg-opacity-40 z-50"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-[#383838] text-white p-6 rounded-xl shadow-xl max-w-xl w-full h-auto overflow-y-auto"
            style={{ maxHeight: '80vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-semibold mb-4 text-yellow-500">Create a New Project</h2>
            
            <label className="font-semibold text-white">Project Name</label>
            <input
              type="text"
              className="bg-[#2c2c2c] text-white outline-none focus:ring-2 focus:ring-yellow-500 p-3 w-full rounded-md mb-4"
              placeholder="Enter project name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
            
            {/* Flavor Profile */}
            <label className="font-semibold text-white">Flavor Profile</label>
            {flavorProfile.map((flavor, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <select value={flavor} onChange={(e) => handleFlavorProfileChange(index, e.target.value)} className="w-full p-2 rounded bg-[#2c2c2c] outline-none focus:ring-2 focus:ring-yellow-500">
                  {flavorOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                {index > 0 && (
                  <button onClick={() => handleFlavorProfileRemove(index)} className="text-red-500"><FaTrashAlt /></button>
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
                  <button onClick={() => handleIngredientRemove(index)} className="text-red-500"><FaTrashAlt /></button>
                )}
              </div>
            ))}
            <button onClick={handleIngredientAdd} className="w-full bg-gray-500 text-white py-2 rounded mt-2 flex items-center justify-center gap-2 hover:bg-gray-600 transition">
              <FaPlus /> Add Ingredient
            </button>

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