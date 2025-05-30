// app/collaborative/[id]/drink-plan/page.tsx (Collaborative Project Drink Plan Page)
"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { onSnapshot, collection, doc, getDoc, updateDoc, arrayUnion, arrayRemove, Timestamp, serverTimestamp, addDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { firestore } from "../../../firebase/config";
import Layout from "../../../../components/root/Layout";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatDistanceToNow } from 'date-fns';
import { AiOutlineClose, AiOutlinePlus, AiOutlineEdit, AiOutlineDelete } from 'react-icons/ai';
import { FaExclamationTriangle, FaExclamationCircle } from 'react-icons/fa';
import { ChatPopupButton } from "../../../../components/Chat";
import { FaTrashAlt, FaPlus, FaTimes } from "react-icons/fa";

const unitConversionMap: Record<string, number> = {
  ml: 1, cl: 10, dl: 100, liter: 1000, oz: 29.5735,
  pint: 473.176, quart: 946.353, gallon: 3785.41,
  g: 1, kg: 1000, lb: 453.592,
  dash: 0.92, drop: 0.05, pinch: 0.36,
  tsp: 4.2,
  tbsp: 12.6,
};

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
    drinkPlan: Drink[];
}

interface Drink {
    id: string;
    name: string;
    category: string;
    imageUrl: string;
    alcoholContent: { abv: number; proof: number };
    flavorProfile: string[];
    ingredients: { name: string; quantity: number; unit: string }[];
    steps: string[];
    quantity: number;
    createdBy: string;
    createdAt: any;
    updatedAt: any;
}

type ProjectIngredientWithRemainingQuantity = {
  name: string;
  quantity: number;
  unit: string;
  remainingQuantity?: number;
};

const ProjectDrinkPlanPage = () => {
  const params = useParams();
  const projectId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [project, setProject] = useState<any>(null);
  const [authUser, setAuthUser] = useState<any>(null);
  const router = useRouter();
  const auth = getAuth();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [expandedDrink, setExpandedDrink] = useState<Drink & { 
    score: number; 
    flavorMatchDetails: string[];
    ingredientMatchDetails: {
        ingredient: string;
        drinkQuantity: string;
        projectQuantity: string;
        matchPercentage: string;
    }[];
  } | null>(null);
  const [selectedDrink, setSelectedDrink] = useState<Drink & { 
    score: number; 
    flavorMatchDetails: string[];
    ingredientMatchDetails: {
        ingredient: string;
        drinkQuantity: string;
        projectQuantity: string;
        matchPercentage: string;
    }[];
  } | null>(null);
  const [usernames, setUsernames] = useState<Record<string, string>>({});
  const [showDrinkModal, setShowDrinkModal] = useState(false);
  const [drinkQuantity, setDrinkQuantity] = useState(selectedDrink?.quantity || 1);
  const [drinkPlan, setDrinkPlan] = useState<any[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"website" | "project">("website");
  const [projectDrinks, setProjectDrinks] = useState<Drink[]>([]);
  const [showCreateProjectDrinkModal, setShowCreateProjectDrinkModal] = useState(false);
  const initialDrinkState: Drink = {
    id: "",
    name: "",
    category: "Brandy",
    imageUrl: "",
    alcoholContent: { abv: 0, proof: 0 },
    flavorProfile: ["Bitter"],
    ingredients: [{ name: "", quantity: 0, unit: "ml" }],
    steps: [""],
    quantity: 1,
    createdBy: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const [drink, setDrink] = useState<Drink>(initialDrinkState);
  const [selectedProjectDrink, setSelectedProjectDrink] = useState<Drink | null>(null);
  const [showProjectDeleteModal, setShowProjectDeleteModal] = useState(false);

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
    if (!projectId) return;
  
    setIsLoading(true);
  
    const projectRef = doc(firestore, "projects", projectId);
    const unsubscribe = onSnapshot(projectRef, (snapshot) => {
      if (snapshot.exists()) {
        setProject(snapshot.data());
        setDrinkPlan(snapshot.data().drinkPlan || []);
        setProjectDrinks(snapshot.data().drinkDatabase || []);
      } else {
        setProject(null);
        setDrinkPlan([]);
        setProjectDrinks  ([]);
      }
      setIsLoading(false);
    });
  
    return () => unsubscribe();
  }, [projectId]);  

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onSnapshot(
      collection(firestore, "drinks"),
      (snapshot) => {
        if (isMounted) {
          const drinksData = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name || "",
              category: data.category || "",
              imageUrl: data.imageUrl || "",
              alcoholContent: data.alcoholContent || { abv: 0, proof: 0 },
              flavorProfile: data.flavorProfile || [],
              ingredients: data.ingredients || [],
              steps: data.steps || [],
              quantity: data.quantity || "",
              createdBy: data.createdBy || "",
              createdAt: data.createdAt || Timestamp.now(),
              updatedAt: data.updatedAt || Timestamp.now(),
            };
          });

          setDrinks(drinksData);
          setIsLoading(false);
        }
      },
      (error) => {
        if (isMounted) {
          console.error("Error loading drinks data:", error);
          setIsLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const fetchUsernames = async () => {
      if (!drinks.length) return;
  
      const userIds = Array.from(new Set(drinks.map(drink => drink.createdBy)));
      const userMap: Record<string, string> = {};
  
      await Promise.all(
        userIds.map(async (userId) => {
          if (userId) {
            const userRef = doc(firestore, "users", userId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              userMap[userId] = userSnap.data().username || "Unknown";
            }
          }
        })
      );
  
      setUsernames(userMap);
    };
  
    fetchUsernames();
  }, [drinks]);

  useEffect(() => {
    if (!expandedDrink || !project) return;
  
    const { score, ingredientMatchDetails } = calculateDrinkScore(expandedDrink, project, drinkQuantity);
  
    setExpandedDrink((prev) => prev ? {
      ...prev,
      score,
      ingredientMatchDetails,
    } : null);
  }, [drinkQuantity]);

  // To reset the quantity if the selected drink changes:
  useEffect(() => {
    if (selectedDrink) {
      setDrinkQuantity(selectedDrink.quantity);
    }
  }, [selectedDrink]);

  const calculateDrinkScore = (drink: Drink, project: Project, drinkQuantity: number) => {
    if (!drink || !project) return { score: 0, flavorMatchDetails: [], ingredientMatchDetails: [] };
  
    const flavorWeight = project.priorityPercentage.flavors / 100;
    const ingredientWeight = project.priorityPercentage.ingredients / 100;
    const { score: flavorMatchScore, details: flavorMatchDetails } = calculateFlavorMatch(drink.flavorProfile, project.flavorProfile);
    
    const { score: ingredientMatchScore, details: ingredientMatchDetails } = calculateIngredientMatch(
      drink.ingredients, 
      project.ingredients, 
      drinkQuantity, 
      project.drinkPlan,
      false
    );
  
    const finalScore = (flavorWeight * flavorMatchScore) + (ingredientWeight * ingredientMatchScore);
  
    return { score: finalScore, flavorMatchDetails, ingredientMatchDetails };
  };  
  
  const calculateFlavorMatch = (drinkFlavorProfile: string[], projectFlavorProfile: string[]) => {
    if (!drinkFlavorProfile.length || !projectFlavorProfile.length) return { score: 0, details: [] };
  
    const matchingFlavors = drinkFlavorProfile.filter(flavor => projectFlavorProfile.includes(flavor));
    const score = (matchingFlavors.length / projectFlavorProfile.length) * 100;
  
    return { score, details: matchingFlavors };
  };
  
  const calculateIngredientMatch = (
    drinkIngredients: { name: string; quantity: number; unit: string }[],
    projectIngredients: { name: string; quantity: number; unit: string }[],
    drinkQuantity: number,
    drinkPlan: Drink[],
    isSelectedDrinkModal: boolean // New parameter to differentiate between modals
  ) => {
    if (!drinkIngredients.length || !projectIngredients.length) return { score: 0, details: [] };
  
    let totalMatch = 0;
    let totalWeight = 0;
    let details: { ingredient: string; drinkQuantity: string; projectQuantity: string; matchPercentage: string }[] = [];
  
    // 1. Calculate the project ingredients based on whether it’s the selectedDrink modal
    const updatedProjectIngredients = projectIngredients.map(projectIng => {
      // If it's the selectedDrink modal, use the original project ingredient quantity (no subtraction)
      if (isSelectedDrinkModal) {
        return projectIng; // No subtraction for selectedDrink modal
      }
  
      // If it's not the selectedDrink modal, perform subtraction (as for the expandDrink modal)
      const usedQuantity = (Array.isArray(drinkPlan) ? drinkPlan : []).reduce((accum, drink) => {
        const matchingIng = drink.ingredients.find((ing) => ing.name.toLowerCase() === projectIng.name.toLowerCase());
        if (matchingIng) {
          const drinkBaseUnit = unitConversionMap[matchingIng.unit] ?? 1;
          const projectBaseUnit = unitConversionMap[projectIng.unit] ?? 1;
          // Convert drink ingredient quantity to project ingredient unit
          return accum + (matchingIng.quantity * drink.quantity * drinkBaseUnit) / projectBaseUnit;
        }
        return accum;
      }, 0);
  
      const remainingQuantity = Math.max(0, projectIng.quantity - usedQuantity);
      return { ...projectIng, remainingQuantity };
    });
  
    // 2. Compare the drink's ingredients to the updated project ingredient quantities
    drinkIngredients.forEach((drinkIng) => {
      const matchingProjectIng = updatedProjectIngredients.find(
        (projIng) => projIng.name.toLowerCase() === drinkIng.name.toLowerCase()
      );
  
      if (matchingProjectIng) {
        const drinkBaseUnit = unitConversionMap[drinkIng.unit] ?? 1;
        const projectUnit = matchingProjectIng.unit ?? drinkIng.unit;
        const projectBaseUnit = unitConversionMap[projectUnit] ?? 1;
  
        const adjustedDrinkQuantity = drinkIng.quantity * drinkQuantity;
        const drinkQuantityInProjectUnit = (adjustedDrinkQuantity * drinkBaseUnit) / projectBaseUnit;
  
        // Cast `matchingProjectIng` to `ProjectIngredientWithRemainingQuantity`
        const projectQuantityBase = isSelectedDrinkModal
          ? matchingProjectIng.quantity
          : (matchingProjectIng as ProjectIngredientWithRemainingQuantity).remainingQuantity ?? matchingProjectIng.quantity;
  
        let matchRatio = projectQuantityBase >= drinkQuantityInProjectUnit
          ? 1
          : projectQuantityBase / drinkQuantityInProjectUnit;
        totalMatch += matchRatio * drinkQuantityInProjectUnit;
        totalWeight += drinkQuantityInProjectUnit;
  
        details.push({
          ingredient: drinkIng.name,
          drinkQuantity: `${drinkQuantityInProjectUnit.toFixed(2)} ${projectUnit}`,
          projectQuantity: `${projectQuantityBase.toFixed(2)} ${projectUnit}`,
          matchPercentage: (matchRatio * 100).toFixed(1) + "%",
        });
      } else {
        // Handle ingredients that do not have a match in the project
        const adjustedDrinkQuantity = drinkIng.quantity * drinkQuantity;
        details.push({
          ingredient: drinkIng.name,
          drinkQuantity: `${adjustedDrinkQuantity.toFixed(2)} ${drinkIng.unit}`,
          projectQuantity: "",
          matchPercentage: "0.0%",
        });
      }
    });
  
    const score = totalWeight > 0 ? (totalMatch / totalWeight) * 100 : 0;
    return { score, details };
  };
    
  const scoredDrinks = drinks.map(drink => {
    const { score, flavorMatchDetails, ingredientMatchDetails } = calculateDrinkScore(drink, project, 1);
    return { ...drink, score, flavorMatchDetails, ingredientMatchDetails };
  });
  
  const filteredDrinks = scoredDrinks
  .filter(drink =>
    drink.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (selectedCategory === "" || drink.category === selectedCategory)
  )
  .sort((a, b) => b.score - a.score);

  const scoredProjectDrinks = projectDrinks.map((drink) => {
    const { score, flavorMatchDetails, ingredientMatchDetails } = calculateDrinkScore(drink, project, 1);
    return { ...drink, score, flavorMatchDetails, ingredientMatchDetails };
  });

  const sourceDrinks = activeTab === "website" ? filteredDrinks : scoredProjectDrinks;

  const formatTimestamp = (timestamp: any) => {
      return timestamp && timestamp.seconds
        ? formatDistanceToNow(new Date(timestamp.seconds * 1000), { addSuffix: true })
        : 'Invalid date';
  };

  const handleExpandDrink = (drink: Drink) => {
    if (!project) return;
  
    const { score, flavorMatchDetails, ingredientMatchDetails } = calculateDrinkScore(drink, project, 1);
  
    setDrinkQuantity(1);
    setExpandedDrink({
      ...drink,
      score,
      flavorMatchDetails,
      ingredientMatchDetails,
    });
  };

  const handleAddDrink = async () => {
    if (!expandedDrink) return;
    if (!projectId) {
      console.error("Project ID is undefined.");
      return;
    }
  
    // Check for duplicates based on multiple fields (id, name, and quantity)
    const isDuplicate = drinkPlan.some((drink) =>
      drink.id === expandedDrink.id &&
      drink.name === expandedDrink.name
    );
  
    if (isDuplicate) {
      alert("This drink is already in the plan.");
      return;
    }
  
    const unmodifiedIngredients = expandedDrink.ingredients;
  
    // Remove ingredientMatchDetails from expandedDrink before adding to Firestore
    const { ingredientMatchDetails, ...drinkWithoutMatches } = expandedDrink;
  
    // Create the log entry with more details and the current userId
    const logEntry = {
      action: 'ADD',
      description: `Added drink: ${expandedDrink.name} [${drinkQuantity}] times`,
      timestamp: Timestamp.now(),
      createdBy: authUser?.uid,
      drinkDetails: {
        name: expandedDrink.name,
        category: expandedDrink.category,
        quantity: drinkQuantity,
        flavorProfile: expandedDrink.flavorProfile.join(', '),
        ingredients: unmodifiedIngredients.map((ingredient) => ({
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
        })),
      },
    };
  
    // Update Firestore
    try {
      const projectRef = doc(firestore, "projects", projectId as string);
      await updateDoc(projectRef, {
        drinkPlan: arrayUnion({
          ...drinkWithoutMatches,
          quantity: drinkQuantity,
          ingredients: unmodifiedIngredients,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        }),
        logs: arrayUnion(logEntry),
      });
  
      setExpandedDrink(null);
      setDrinkQuantity(1);
  
      alert("Drink successfully added to the plan!");
    } catch (error) {
      console.error("Error updating drink plan:", error);
      alert("Failed to add drink. Please try again.");
    }
  };  

  const handleUpdateMode = () => {
    setIsUpdating(true); 
  };

  const handleCancelUpdate = () => {
    setIsUpdating(false); 
  };

  const handleUpdateDrink = async () => {
    if (!selectedDrink) return;
    if (!projectId) {
      console.error("Project ID is undefined.");
      return;
    }
  
    // Update the drink quantity and ingredient quantities based on drinkQuantity
    const updatedIngredients = selectedDrink.ingredients.map((ingredient) => ({
      ...ingredient,
      quantity: ingredient.quantity,
    }));
  
    const updatedDrink = {
      ...selectedDrink,
      quantity: drinkQuantity,
      ingredients: updatedIngredients,
      updatedAt: Timestamp.now(),
    };
  
    const logEntry = {
      action: 'UPDATE',
      description: `Updated drink: ${selectedDrink.name} to quantity [${drinkQuantity}]`,
      timestamp: Timestamp.now(),
      createdBy: authUser?.uid,
      drinkDetails: {
        name: selectedDrink.name,
        category: selectedDrink.category,
        quantity: drinkQuantity,
        flavorProfile: selectedDrink.flavorProfile.join(', '),
        ingredients: updatedIngredients.map((ingredient) => ({
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
        })),
      },
    };
  
    try {
      const projectRef = doc(firestore, "projects", projectId as string);
      await updateDoc(projectRef, {
        drinkPlan: arrayRemove(selectedDrink),
      });
  
      await updateDoc(projectRef, {
        drinkPlan: arrayUnion(updatedDrink),
        logs: arrayUnion(logEntry),
      });
  
      setSelectedDrink(null);
      setDrinkQuantity(1);
      setIsUpdating(false);
  
      alert("Drink successfully updated in the plan!");
    } catch (error) {
      console.error("Error updating drink plan:", error);
      alert("Failed to update drink. Please try again.");
    }
  };  

  const handleConfirmDelete = async () => {
    if (!selectedDrink) return;
    if (!projectId) {
      console.error("Project ID is undefined.");
      return;
    }
  
    const logEntry = {
      action: 'DELETE',
      description: `Deleted drink: ${selectedDrink.name}`,
      timestamp: Timestamp.now(),
      createdBy: authUser?.uid,
      drinkDetails: {
        name: selectedDrink.name,
        category: selectedDrink.category,
        quantity: selectedDrink.quantity,
        flavorProfile: selectedDrink.flavorProfile.join(', '),
        ingredients: selectedDrink.ingredients.map((ingredient) => ({
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
        })),
      },
    };
  
    try {
      const projectRef = doc(firestore, "projects", projectId as string);
      await updateDoc(projectRef, {
        drinkPlan: arrayRemove(selectedDrink),
        logs: arrayUnion(logEntry),
      });
  
      setSelectedDrink(null);
      setShowDeleteModal(false);
      alert("Drink successfully deleted from the plan!");
    } catch (error) {
      console.error("Error deleting drink plan:", error);
      alert("Failed to delete drink. Please try again.");
    }
  };

  const addDrinkToProjectDatabase = async () => {
    const isInvalid = (
      !drink.name.trim() ||
      !drink.category ||
      !drink.imageUrl ||
      isNaN(Number(drink.alcoholContent.abv)) || Number(drink.alcoholContent.abv) <= 0 ||
      drink.flavorProfile.length < 1 ||
      drink.ingredients.some(i => !i.name.trim() || isNaN(Number(i.quantity)) || Number(i.quantity) <= 0) ||
      drink.steps.some(s => !s.trim())
    );
  
    if (isInvalid) {
      alert("Please fill out all required fields with valid values.");
      return;
    }
  
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to add a drink.");
      return;
    }

    if (!projectId) {
      alert("Project ID is missing.");
      return;
    }    
  
    try {
      const projectRef = doc(firestore, "projects", projectId);
      await updateDoc(projectRef, {
        drinkDatabase: arrayUnion({
          ...drink,
          createdBy: user.uid,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        }),
      });
  
      alert("Drink added to project database!");
      setDrink(initialDrinkState);
      setShowCreateProjectDrinkModal(false);
    } catch (error) {
      console.error("Error adding drink to project database:", error);
      alert("Something went wrong.");
    }
  };  

  const handleImageUpload = async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'post-image-upload');

      try {
          const res = await fetch(
              `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, 
              { method: 'POST', body: formData }
          );
          const data = await res.json();
          setDrink((prev) => ({ ...prev, imageUrl: data.secure_url }));
      } catch (error) {

      }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setDrink({ ...drink, [e.target.name]: e.target.value });
  };

  // Add Drink Function
  const handleFlavorProfileAdd = () => {
      if (drink.flavorProfile.length < flavorOptions.length) {
          setDrink({ 
              ...drink, 
              flavorProfile: [...drink.flavorProfile, flavorOptions[0]]
          });
      }
  };

  const handleFlavorProfileChange = (index: number, value: string) => {
      const updatedProfiles = [...drink.flavorProfile];
      updatedProfiles[index] = value.trim() ? value : flavorOptions[0];
      setDrink({ ...drink, flavorProfile: updatedProfiles });
  };

  const handleFlavorProfileRemove = (index: number) => {
      if (index > 0) {
          const updatedProfiles = drink.flavorProfile.filter((_, i) => i !== index);
          setDrink({ ...drink, flavorProfile: updatedProfiles });
      }
  };

  const handleIngredientAdd = () => {
      setDrink({ ...drink, ingredients: [...drink.ingredients, { name: "", quantity: 0, unit: "ml" }] });
  };

  const handleIngredientChange = (index: number, field: string, value: string | number) => {
      const updatedIngredients = [...drink.ingredients];
      updatedIngredients[index] = { ...updatedIngredients[index], [field]: value };
      setDrink({ ...drink, ingredients: updatedIngredients });
  };

  const handleIngredientRemove = (index: number) => {
      if (index > 0) {
          const updatedIngredients = drink.ingredients.filter((_, i) => i !== index);
          setDrink({ ...drink, ingredients: updatedIngredients });
      }
  };

  const handleStepAdd = () => {
      setDrink({ ...drink, steps: [...drink.steps, ""] });
  };

  const handleStepChange = (index: number, value: string) => {
      const updatedSteps = [...drink.steps];
      updatedSteps[index] = value;
      setDrink({ ...drink, steps: updatedSteps });
  };

  const handleStepRemove = (index: number) => {
      if (drink.steps.length > 1) {
          const updatedSteps = drink.steps.filter((_, i) => i !== index);
          setDrink({ ...drink, steps: updatedSteps });
      }
  };

  const handleDeleteProjectDrink = async (selectedDrink: Drink) => {
    if (!projectId) {
      console.error("Project ID is undefined.");
      return;
    }
  
    try {
      const projectRef = doc(firestore, "projects", projectId);
  
      // Fetch the current project document
      const projectSnap = await getDoc(projectRef);
      if (!projectSnap.exists()) {
        console.error("Project not found.");
        return;
      }
  
      const projectData = projectSnap.data();
      const drinkDatabase = projectData.drinkDatabase || [];
  
      // Find the correct index of the selected drink in the original drinkDatabase
      const drinkIndex = drinkDatabase.findIndex(
        (drink: Drink) =>
          drink.name === selectedDrink.name &&
          drink.category === selectedDrink.category &&
          drink.quantity === selectedDrink.quantity
      );
  
      if (drinkIndex === -1) {
        console.error("Selected drink not found in the database.");
        alert("Failed to delete drink. Drink not found.");
        return;
      }
  
      // Remove the drink at the specified index
      const updatedDrinkDatabase = drinkDatabase.filter(
        (_: any, index: number) => index !== drinkIndex
      );
  
      console.log("Updated drinkDatabase:", updatedDrinkDatabase);
  
      // Create a log entry
      const logEntry = {
        action: 'DELETE',
        description: `Deleted project drink: ${selectedDrink.name}`,
        timestamp: Timestamp.now(),
        createdBy: authUser?.uid,
      };
  
      // Update the Firestore document with the filtered array
      await updateDoc(projectRef, {
        drinkDatabase: updatedDrinkDatabase,
        logs: arrayUnion(logEntry),
      });
  
      alert("Drink successfully deleted from the project database!");
    } catch (error) {
      console.error("Error deleting project drink:", error);
      alert("Failed to delete drink. Please try again.");
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

        {/* Total Drinks Counter */}
        <div className="flex justify-end mb-4">
          <div className="text-white text-lg font-semibold">
            Total Drinks: {drinkPlan.reduce((total, drink) => total + (drink.quantity || 0), 0)}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...drinkPlan]
          .sort((a, b) => b.score - a.score)
          .map((drink, index) => (
            <div
              key={drink.id || `drink-${index}`}
              className="bg-[#383838] p-3 rounded-lg shadow-lg text-white cursor-pointer hover:bg-[#484848] hover:shadow-xl transform hover:scale-105 transition-transform duration-200 ease-in-out h-56 flex flex-col justify-between"
              onClick={() => setSelectedDrink(drink)}
            >
              <div className="text-lg font-semibold text-yellow-500 text-center mb-2">
                {drink.name}
              </div>
              <img
                src={drink.imageUrl}
                alt={drink.name}
                className="w-full h-32 object-cover rounded-lg"
              />
              <div className="mt-2">
                <div className="text-sm font-semibold text-white mb-1">
                  Match Score:{" "}
                  <span
                    className={`${
                      drink.score >= 80
                        ? "text-green-500"
                        : drink.score >= 60
                        ? "text-yellow-500"
                        : drink.score >= 40
                        ? "text-orange-500"
                        : "text-red-500"
                    }`}
                  >
                    {drink.score.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full bg-yellow-500 transition-all duration-300"
                    style={{ width: `${drink.score}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Drink Details Modal */}
        {selectedDrink && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 p-4 z-40">
            <div className="bg-[#383838] p-6 mt-12 rounded-lg shadow-lg text-white w-full max-w-3xl max-h-[85vh] overflow-auto relative">
              {/* Top Right Controls */}
              <div className="absolute top-4 right-4 flex items-center gap-3">
                {/* Quantity Controls: Only show when in update mode */}
                {isUpdating && (
                  <div className="flex items-center gap-2 rounded-md">
                    <button
                      className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                      onClick={() => setDrinkQuantity((prev) => Math.max(1, prev - 1))}
                    >
                      −
                    </button>
                    <span className="text-lg mx-2 font-semibold">{drinkQuantity}</span>
                    <button
                      className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                      onClick={() => setDrinkQuantity((prev) => prev + 1)}
                    >
                      +
                    </button>
                  </div>
                )}

                {/* Cancel Button (only when in update mode) */}
                {isUpdating && (
                  <button
                    className="bg-gray-400 text-white px-4 py-2 rounded-md hover:bg-gray-500 flex items-center gap-2"
                    onClick={handleCancelUpdate}
                  >
                    <AiOutlineClose className="w-5 h-5" /> {/* Close Icon */}
                    Cancel
                  </button>
                )}

                {/* Update / Save Button */}
                <button
                  className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 flex items-center gap-2"
                  onClick={isUpdating ? handleUpdateDrink : handleUpdateMode}
                >
                  <AiOutlineEdit className="w-5 h-5" /> {/* Edit Icon */}
                  {isUpdating ? "Save" : "Update"}
                </button>

                {/* Delete Drink Button */}
                {!isUpdating && (
                  <button
                    className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 flex items-center gap-2"
                    onClick={() => setShowDeleteModal(true)}
                  >
                    <AiOutlineDelete className="w-5 h-5" /> {/* Delete Icon */}
                    Delete
                  </button>
                )}

                {/* Close Button */}
                <button
                  className="text-gray-400 hover:text-yellow-500 transition-colors"
                  onClick={() => {
                    setSelectedDrink(null);
                    setIsUpdating(false);
                  }}
                >
                  <AiOutlineClose className="w-6 h-6" />
                </button>
              </div>

              {/* Image & Info */}
              <div className="flex flex-col md:flex-row gap-6 items-center">
                {/* Drink Image */}
                <img
                  src={selectedDrink.imageUrl}
                  alt={selectedDrink.name}
                  className="w-full md:w-1/3 h-64 object-cover rounded-lg"
                />

                {/* Drink Info */}
                <div className="flex-1 space-y-2">
                  <h2 className="text-3xl font-bold text-yellow-500">{selectedDrink.name}</h2>
                  <p className="text-lg text-gray-300">{selectedDrink.category}</p>
                  <p className="text-gray-300">
                    Alcohol Content: {selectedDrink.alcoholContent.abv}% ABV | {selectedDrink.alcoholContent.proof} Proof
                  </p>
                  <p className="text-gray-300">
                    Flavor Profile: {selectedDrink.flavorProfile.join(", ")}
                  </p>
                  <p className="text-gray-300">
                    Quantity: {selectedDrink.quantity}
                  </p>
                  <p className="text-sm text-gray-400">
                    Created by: {usernames[selectedDrink?.createdBy] ?? "Unknown"} | {formatTimestamp(selectedDrink?.createdAt)} | {formatTimestamp(selectedDrink?.updatedAt)}
                  </p>
                </div>
              </div>

              {/* Section: Ingredients & Steps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <h2 className="text-xl font-semibold text-yellow-500">Ingredients</h2>
                  <ul className="list-disc list-inside space-y-1">
                    {selectedDrink.ingredients.map((ingredient, index) => (
                      <li key={index}>
                        {ingredient.name} - {ingredient.quantity} {ingredient.unit}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-yellow-500">Preparation Steps</h2>
                  <ol className="list-decimal list-inside space-y-1">
                    {selectedDrink.steps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* Section: Drink Score & Flavor Match */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {/* Drink Score Section */}
                <div>
                  <h2 className="text-xl font-semibold text-yellow-500">Drink Score</h2>
                  <p
                    className={`text-md font-bold ${
                      selectedDrink.score >= 80
                        ? "text-green-500"
                        : selectedDrink.score >= 60
                        ? "text-yellow-500"
                        : selectedDrink.score >= 40
                        ? "text-orange-500"
                        : "text-red-500"
                    }`}
                  >
                    {selectedDrink.score.toFixed(1)}%
                  </p>
                  <div className="w-2/3 bg-gray-700 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full bg-yellow-500 transition-all duration-300"
                      style={{ width: `${selectedDrink.score}%` }}
                    ></div>
                  </div>
                </div>

                {/* Flavor Match Section */}
                <div>
                  <h2 className="text-xl font-semibold text-yellow-500">Flavor Match</h2>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {project.flavorProfile.length > 0 ? (
                      project.flavorProfile.map((flavor: string, index: number) => (
                        <span
                          key={index}
                          className={`px-2 py-1 rounded-md text-sm font-semibold ${
                            selectedDrink.flavorProfile.includes(flavor)
                              ? "bg-yellow-500 text-white"
                              : "bg-gray-600 text-gray-300"
                          }`}
                        >
                          {flavor}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400">No flavors defined</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Ingredient Match Section */}
              <div className="mt-6">
                <h2 className="text-xl font-semibold text-yellow-500">Ingredient Match</h2>
                {selectedDrink ? (
                  <div>
                    {/* Calculate Ingredient Match Details */}
                    {selectedDrink.ingredients && selectedDrink.ingredients.length > 0 ? (
                      <table className="w-full text-sm mt-2">
                        <thead>
                          <tr className="text-gray-400 border-b border-gray-600">
                            <th className="text-left py-1">Ingredient</th>
                            <th className="text-left py-1">Drink</th>
                            <th className="text-left py-1">Project</th>
                            <th className="text-left py-1">Match</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedDrink.ingredients.map((ingredient, index) => {
                            // Calculate ingredient match for this ingredient
                            const matchDetails = calculateIngredientMatch(
                              [ingredient],
                              project.ingredients,
                              drinkQuantity,
                              project.drinkPlan,
                              true
                            );

                            return matchDetails.details.map((ingDetail, detailIndex) => {
                              const projectQty = parseFloat(ingDetail.projectQuantity);
                              const drinkQty = parseFloat(ingDetail.drinkQuantity);

                              return (
                                <tr key={detailIndex} className="border-b border-gray-700">
                                  <td className="py-1">{ingDetail.ingredient}</td>
                                  <td className="py-1 text-white">
                                    <div className="flex justify-start w-full whitespace-nowrap">
                                      {ingDetail.drinkQuantity}
                                      {drinkQty > projectQty && projectQty !== 0 && (
                                        <span className="text-yellow-500 ml-2 mt-1">
                                          <FaExclamationCircle />
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td
                                    className={`py-1 flex items-center w-1/3 ${
                                      isNaN(projectQty) || projectQty === 0
                                        ? "text-red-400"
                                        : "text-white"
                                    }`}
                                  >
                                    <div className="flex justify-start w-full whitespace-nowrap">
                                      <span>
                                        {isNaN(projectQty) || projectQty === 0
                                          ? "Missing"
                                          : ingDetail.projectQuantity}
                                      </span>
                                      {(isNaN(projectQty) || projectQty === 0) && (
                                        <span className="text-red-500 ml-2 mt-1">
                                          <FaExclamationTriangle />
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td
                                    className={`py-1 font-semibold ${
                                      parseFloat(ingDetail.matchPercentage) > 50
                                        ? "text-green-400"
                                        : "text-yellow-400"
                                    }`}
                                  >
                                    {ingDetail.matchPercentage}
                                  </td>
                                </tr>
                              );
                            });
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-gray-400">No ingredient match</p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400">Select a drink to view ingredient match details.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 p-4 z-50">
            <div className="bg-[#383838] p-6 rounded-lg shadow-lg text-white w-full max-w-md">
              <h2 className="text-xl font-semibold text-yellow-500 text-center mb-4">Confirm Deletion</h2>
              <p className="text-center text-gray-300 mb-6">
                Are you sure you want to delete the drink <span className="text-yellow-500 font-bold">{selectedDrink?.name}</span>?
              </p>
              <div className="flex justify-between gap-4 px-20">
                <button
                  className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
                  onClick={handleConfirmDelete}
                >
                  Yes
                </button>
                <button
                  className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                  onClick={() => setShowDeleteModal(false)}
                >
                  No
                </button>
              </div>
            </div>
          </div>
        )}
  
        <button
          className="fixed bottom-6 right-24 bg-yellow-500 text-white p-4 rounded-full shadow-lg hover:bg-yellow-600 transition-all"
          onClick={() => setShowDrinkModal(true)}
        >
          <AiOutlinePlus className="w-6 h-6" />
        </button>

        {authUser && projectId && <ChatPopupButton projectId={projectId} userId={authUser.uid} isOpen={isOpen} setIsOpen={setIsOpen} />}
  
        {/* Drink Selection Modal */}
        {showDrinkModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 p-4 z-30">
            <div className="bg-[#383838] mt-12 p-6 rounded-lg shadow-lg text-white w-full max-w-3xl max-h-[85vh] overflow-auto relative">
              {/* Close Button */}
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-yellow-500 transition-colors"
                onClick={() => setShowDrinkModal(false)}
              >
                <AiOutlineClose className="w-6 h-6" />
              </button>
  
              <div className="flex justify-between items-center mb-4">
                <div className="flex space-x-4">
                  <button
                    onClick={() => setActiveTab("website")}
                    className={`px-4 py-2 rounded-md font-semibold ${
                      activeTab === "website" ? "bg-yellow-500 text-white" : "bg-gray-700 text-gray-300"
                    }`}
                  >
                    Website Drinks
                  </button>
                  <button
                    onClick={() => setActiveTab("project")}
                    className={`px-4 py-2 rounded-md font-semibold ${
                      activeTab === "project" ? "bg-yellow-500 text-white" : "bg-gray-700 text-gray-300"
                    }`}
                  >
                    Project Drinks
                  </button>
                </div>

                {activeTab === "project" && (
                  <button
                    onClick={() => setShowCreateProjectDrinkModal(true)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-3 py-1 rounded-md text-sm flex items-center gap-2 mr-10"
                  >
                    <AiOutlinePlus className="w-4 h-4" />
                    Add Drink
                  </button>
                )}
              </div>

              {/* Add Project Drink Modal */}
              {showCreateProjectDrinkModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                  <div className="bg-[#383838] p-6 rounded-lg shadow-lg w-full max-w-2xl h-[calc(100vh-10rem)] overflow-y-auto relative">
                    <button
                      className="absolute top-4 right-4 text-gray-400 hover:text-yellow-500"
                      onClick={() => {
                        setDrink(initialDrinkState);
                        setShowCreateProjectDrinkModal(false);
                      }}
                    >
                      <AiOutlineClose className="w-6 h-6" />
                    </button>
                     {showCreateProjectDrinkModal && (
                      <div className="w-full max-w-xl mx-auto p-4 md:p-6 bg-[#383838] shadow-md rounded-lg relative">
                          {/* Clear Button */}
                          <button
                              type="button"
                              onClick={() => setDrink(initialDrinkState)}
                              className="text-yellow-500 hover:text-yellow-600 flex items-center space-x-2 sm:top-4 sm:right-4 absolute top-2 right-2"
                          >
                              <span className="text-sm md:text-base">Clear</span>
                              <FaTimes className="text-sm md:text-base" />
                          </button>
  
                          {/* Name */}
                          <label className="font-semibold text-white text-sm md:text-base">Drink Name</label>
                          <input 
                              type="text" 
                              name="name" 
                              value={drink.name} 
                              onChange={handleChange} 
                              className="w-full p-2 bg-[#2c2c2c] text-white outline-none focus:ring-2 focus:ring-yellow-500 rounded mb-3 text-sm md:text-base"
                          />
  
                          {/* Category */}
                          <div className="flex flex-col space-y-2">
                              <label className="font-semibold text-white text-sm md:text-base">Category</label>
                              <select 
                                  name="category" 
                                  value={drink.category} 
                                  onChange={handleChange} 
                                  className="w-full p-2 bg-[#2c2c2c] text-white outline-none focus:ring-2 focus:ring-yellow-500 rounded text-sm md:text-base"
                              >
                                  {["Brandy", "Beer", "Gin", "Liqueur", "Rum", "Spirit", "Tequila", "Vodka", "Whiskey", "Wine"].map((cat) => (
                                      <option key={cat} value={cat}>{cat}</option>
                                  ))}
                              </select>
                          </div>
  
                          {/* Image URL */}
                          <div className="flex flex-col space-y-2 mt-3">
                              <label className="font-semibold text-white text-sm md:text-base">Select Image</label>
                              <input 
                                  type="file" 
                                  accept="image/*" 
                                  className="bg-[#2c2c2c] text-white outline-none focus:ring-2 focus:ring-yellow-500 rounded w-full p-2 text-sm md:text-base"
                                  onChange={(e) => e.target.files && handleImageUpload(e.target.files[0])} 
                              />
                          </div>
  
                          {/* Alcohol Content */}
                          <div className="flex flex-col space-y-2">
                              <label className="font-semibold text-white text-sm md:text-base">Alcohol Content</label>
                              <div className="flex flex-col md:flex-row gap-2 md:gap-3 mb-3">
                                  {/* ABV Input */}
                                  <input
                                      type="number"
                                      name="abv"
                                      placeholder="ABV %"
                                      value={drink.alcoholContent.abv || ""}
                                      onChange={(e) => {
                                          const value = e.target.value;
                                          const abv = value === "" ? 0 : parseFloat(value);
                                          setDrink({
                                              ...drink,
                                              alcoholContent: { abv, proof: abv * 2 },
                                          });
                                      }}
                                      className="w-full md:w-1/2 p-2 bg-[#2c2c2c] text-white outline-none focus:ring-2 focus:ring-yellow-500 rounded text-sm md:text-base"
                                  />
                                  
                                  {/* Proof Input (Disabled) */}
                                  <input 
                                      type="number" 
                                      name="proof" 
                                      placeholder="Proof" 
                                      value={drink.alcoholContent.proof} 
                                      disabled 
                                      className="w-full md:w-1/2 p-2 bg-[#484848] text-white outline-none focus:ring-2 focus:ring-yellow-500 rounded text-sm md:text-base"
                                  />
                              </div>
                          </div>
  
                            {/* Flavor Profile */}
                            <div className="flex flex-col space-y-2">
                                <label className="font-semibold text-white text-sm md:text-base">Flavor Profile</label>
                                {drink.flavorProfile.map((flavor, index) => (
                                    <div key={index} className="flex flex-wrap gap-1 md:gap-2 mb-2 items-center">
                                        {/* Flavor Select Dropdown */}
                                        <select 
                                            value={flavor} 
                                            onChange={(e) => handleFlavorProfileChange(index, e.target.value)} 
                                            className="w-full md:w-auto flex-1 p-2 bg-[#2c2c2c] text-white outline-none focus:ring-2 focus:ring-yellow-500 rounded text-sm md:text-base"
                                        >
                                            {flavorOptions.map((option) => (
                                                <option key={option} value={option}>{option}</option>
                                            ))}
                                        </select>

                                        {/* Remove Flavor Button (Only for additional flavors) */}
                                        {index > 0 && (
                                            <button 
                                                onClick={() => handleFlavorProfileRemove(index)} 
                                                className="text-red-500 hover:text-red-600 p-2"
                                            >
                                                <FaTrashAlt />
                                            </button>
                                        )}
                                    </div>
                                ))}

                                {/* Add Flavor Button */}
                                <button 
                                    onClick={handleFlavorProfileAdd} 
                                    className="w-full bg-gray-500 text-white py-2 rounded flex items-center justify-center gap-2 hover:bg-gray-600 transition mb-3 text-sm md:text-base"
                                >
                                    <FaPlus /> Add Flavor
                                </button>
                            </div>

                            {/* Ingredients */}
                            <label className="font-semibold text-white">Ingredients</label>
                            {drink.ingredients.map((ingredient, index) => (
                                <div key={index} className="flex gap-2 mb-2">
                                    <input type="text" placeholder="Ingredient Name" value={ingredient.name} onChange={(e) => handleIngredientChange(index, "name", e.target.value)} className="w-1/2 p-2 bg-[#2c2c2c] text-white outline-none focus:ring-2 focus:ring-yellow-500 rounded" />
                                    <input
                                        type="number"
                                        placeholder="Quantity"
                                        value={ingredient.quantity || ""}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            handleIngredientChange(index, "quantity", value === "" ? 0 : parseFloat(value));
                                        }} 
                                        className="w-1/4 p-2 bg-[#2c2c2c] text-white outline-none focus:ring-2 focus:ring-yellow-500 rounded"
                                    />
                                    <select value={ingredient.unit} onChange={(e) => handleIngredientChange(index, "unit", e.target.value)} className="w-1/4 p-2 bg-[#2c2c2c] text-white outline-none focus:ring-2 focus:ring-yellow-500 rounded">
                                        {measurementOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                                    </select>
                                    {index > 0 && (
                                        <button onClick={() => handleIngredientRemove(index)} className="text-red-500 hover:text-red-600"><FaTrashAlt /></button>
                                    )}
                                </div>
                            ))}
                            <button onClick={handleIngredientAdd} className="w-full bg-gray-500 text-white py-2 rounded mt-2 flex items-center justify-center gap-2 hover:bg-gray-600 transition mb-3">
                                <FaPlus /> Add Ingredient
                            </button>

                            {/* Step Instruction */}
                            <label className="font-semibold text-white">Step-by-Step Instructions</label>
                            {drink.steps.map((step, index) => (
                                <div key={index} className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        placeholder={`Step ${index + 1}`}
                                        value={step}
                                        onChange={(e) => handleStepChange(index, e.target.value)}
                                        className="w-full p-2 bg-[#2c2c2c] text-white outline-none focus:ring-2 focus:ring-yellow-500 rounded"
                                    />
                                    {index > 0 && (
                                        <button onClick={() => handleStepRemove(index)} className="text-red-500 hover:text-red-600">
                                            <FaTrashAlt />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                onClick={handleStepAdd}
                                className="w-full bg-gray-500 text-white py-2 rounded mt-2 flex items-center justify-center gap-2 hover:bg-gray-600 transition"
                            >
                                <FaPlus /> Add Step
                            </button>

                            {/* Submit Button */}
                            <button onClick={addDrinkToProjectDatabase} className="w-full bg-yellow-500 text-white py-2 rounded mt-3 hover:bg-yellow-600 transition">Add Drink</button>
                        </div>
                      )}
                  </div>
                </div>
              )}

              {/* Drinks Grid */}
              {isLoading ? (
                <div className="text-center text-white text-md my-5">Loading Drink Database...</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 my-5">
                  {sourceDrinks.map((drink, index) => (
                    <div key={drink.id || `drink-${index}`} className="relative w-full">
                      {/* Drink Card */}
                      <div
                        className="bg-[#484848] p-3 rounded-lg shadow-lg text-white cursor-pointer hover:bg-[#585858] hover:shadow-xl transform hover:scale-105 transition-transform duration-200 ease-in-out h-56 flex flex-col justify-between"
                        onClick={() => handleExpandDrink(drink)}
                      >
                        <div className="text-md font-semibold text-yellow-500 text-center mb-2">{drink.name}</div>
                        <img src={drink.imageUrl} alt={drink.name} className="w-full h-32 object-cover rounded-lg" />
                        <div className="mt-2">
                          <div className="text-sm font-semibold text-white mb-1">
                            Match Score:{" "}
                            <span
                              className={`${
                                drink.score >= 80
                                  ? "text-green-500"
                                  : drink.score >= 60
                                  ? "text-yellow-500"
                                  : drink.score >= 40
                                  ? "text-orange-500"
                                  : "text-red-500"
                              }`}
                            >
                              {drink.score.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2.5">
                            <div
                              className="h-2.5 rounded-full bg-yellow-500 transition-all duration-300"
                              style={{ width: `${drink.score}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Delete Button (Only for Project Drinks) */}
                      {activeTab === "project" && (
                        <button
                          className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProjectDrink(drink);
                            setShowProjectDeleteModal(true);
                          }}
                        >
                          <AiOutlineDelete className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {showProjectDeleteModal && selectedProjectDrink && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 p-4 z-50">
            <div className="bg-[#383838] p-6 rounded-lg shadow-lg text-white w-full max-w-md">
              <h2 className="text-xl font-semibold text-yellow-500 text-center mb-4">Confirm Deletion</h2>
              <p className="text-center text-gray-300 mb-6">
                Are you sure you want to delete the drink{" "}
                <span className="text-yellow-500 font-bold">{selectedProjectDrink.name}</span>?
              </p>
              <div className="flex justify-between gap-4 px-20">
                <button
                  className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
                  onClick={async () => {
                    if (selectedProjectDrink) {
                      await handleDeleteProjectDrink(selectedProjectDrink);
                    }
                    setShowProjectDeleteModal(false);
                  }}
                >
                  Yes
                </button>
                <button
                  className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                  onClick={() => setShowProjectDeleteModal(false)}
                >
                  No
                </button>
              </div>
            </div>
          </div>
        )}
  
        {/* Add Drink Modal */}
        {expandedDrink && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 p-4 z-40">
            <div className="bg-[#383838] p-6 mt-12 rounded-lg shadow-lg text-white w-full max-w-3xl max-h-[85vh] overflow-auto relative">
              {/* Top Right Controls */}
              <div className="absolute top-4 right-4 flex items-center gap-3">
                {/* Quantity Selector */}
                <div className="flex items-center gap-2 p-2 rounded-md">
                  <button
                    className="bg-gray-500 text-white px-3 py-1 rounded-md hover:bg-gray-600"
                    onClick={() => setDrinkQuantity((prev) => Math.max(1, prev - 1))}
                  >
                    −
                  </button>
                  <span className="text-lg mx-2 font-semibold">{drinkQuantity}</span>
                  <button
                    className="bg-gray-500 text-white px-3 py-1 rounded-md hover:bg-gray-600"
                    onClick={() => setDrinkQuantity((prev) => prev + 1)}
                  >
                    +
                  </button>
                </div>

                {/* Add Drink Button */}
                <button
                    className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 flex items-center gap-2"
                    onClick={handleAddDrink}
                  >
                    <AiOutlinePlus className="w-5 h-5" />
                    Add
                  </button>

                {/* Close Button */}
                <button
                  className="text-gray-400 hover:text-yellow-500 transition-colors"
                  onClick={() => setExpandedDrink(null)}
                >
                  <AiOutlineClose className="w-6 h-6" />
                </button>
              </div>

              {/* Image & Info */}
              <div className="flex flex-col md:flex-row gap-6 items-center">
                {/* Drink Image */}
                <img
                  src={expandedDrink.imageUrl}
                  alt={expandedDrink.name}
                  className="w-full md:w-1/3 h-64 object-cover rounded-lg"
                />

                {/* Drink Info */}
                <div className="flex-1 space-y-2">
                  <h2 className="text-3xl font-bold text-yellow-500">{expandedDrink.name}</h2>
                  <p className="text-lg text-gray-300">{expandedDrink.category}</p>
                  <p className="text-gray-300">
                    Alcohol Content: {expandedDrink.alcoholContent.abv}% ABV | {expandedDrink.alcoholContent.proof} Proof
                  </p>
                  <p className="text-gray-300">
                    Flavor Profile: {expandedDrink.flavorProfile.join(", ")}
                  </p>
                  <p className="text-sm text-gray-400">
                    Created by: {usernames[expandedDrink?.createdBy] ?? "Unknown"} | {formatTimestamp(expandedDrink?.createdAt)}
                  </p>
                </div>
              </div>

              {/* Section: Ingredients & Steps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <h2 className="text-xl font-semibold text-yellow-500">Ingredients</h2>
                  <ul className="list-disc list-inside space-y-1">
                    {expandedDrink?.ingredients.map((ingredient, index) => (
                      <li key={index}>
                        {ingredient.name} - {ingredient.quantity} {ingredient.unit}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-yellow-500">Preparation Steps</h2>
                  <ol className="list-decimal list-inside space-y-1">
                    {expandedDrink?.steps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* Section: Drink Score & Flavor Match */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {/* Drink Score Section */}
                <div>
                  <h2 className="text-xl font-semibold text-yellow-500">Drink Score</h2>
                  <p
                    className={`text-md font-bold ${
                      expandedDrink.score >= 80
                        ? "text-green-500"
                        : expandedDrink.score >= 60
                        ? "text-yellow-500"
                        : expandedDrink.score >= 40
                        ? "text-orange-500"
                        : "text-red-500"
                    }`}
                  >
                    {expandedDrink.score.toFixed(1)}%
                  </p>
                  <div className="w-2/3 bg-gray-700 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full bg-yellow-500 transition-all duration-300"
                      style={{ width: `${expandedDrink.score}%` }}
                    ></div>
                  </div>
                </div>

                {/* Flavor Match Section */}
                <div>
                  <h2 className="text-xl font-semibold text-yellow-500">Flavor Match</h2>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {project.flavorProfile.length > 0 ? (
                      project.flavorProfile.map((flavor: string, index: number) => (
                        <span
                          key={index}
                          className={`px-2 py-1 rounded-md text-sm font-semibold ${
                            expandedDrink.flavorProfile.includes(flavor)
                              ? "bg-yellow-500 text-white"
                              : "bg-gray-600 text-gray-300"
                          }`}
                        >
                          {flavor}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400">No flavors defined</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Ingredient Match Section */}
              <div className="mt-6">
                <h2 className="text-xl font-semibold text-yellow-500">Ingredient Match</h2>
                {expandedDrink?.ingredientMatchDetails.length > 0 ? (
                  <table className="w-full text-sm mt-2">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-600">
                        <th className="text-left py-1">Ingredient</th>
                        <th className="text-left py-1">Drink</th>
                        <th className="text-left py-1">Project</th>
                        <th className="text-left py-1">Match</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expandedDrink?.ingredientMatchDetails.map((ing, index) => {
                        const projectQty = parseFloat(ing.projectQuantity);
                        const drinkQty = parseFloat(ing.drinkQuantity);

                        return (
                          <tr key={index} className="border-b border-gray-700">
                            <td className="py-1">{ing.ingredient}</td>
                            <td className="py-1 text-white">
                              <div className="flex justify-start w-full">
                                {ing.drinkQuantity}
                                {drinkQty > projectQty && projectQty !== 0 && (
                                  <span className="text-yellow-400 ml-2 mt-1">
                                    <FaExclamationCircle />
                                  </span>
                                )}
                              </div>
                            </td>
                            <td
                              className={`py-1 flex items-center w-1/3 ${
                                isNaN(projectQty) || projectQty === 0 ? "text-red-400" : "text-white"
                              }`}
                            >
                              <div className="flex justify-start w-full">
                                <span>
                                  {isNaN(projectQty) || projectQty === 0 ? "Missing" : ing.projectQuantity}
                                </span>
                                {(isNaN(projectQty) || projectQty === 0) && (
                                  <span className="text-red-400 ml-2 mt-1">
                                    <FaExclamationTriangle />
                                  </span>
                                )}
                              </div>
                            </td>
                            <td
                              className={`py-1 font-semibold ${
                                parseFloat(ing.matchPercentage) > 50 ? "text-green-400" : "text-yellow-400"
                              }`}
                            >
                              {ing.matchPercentage}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-gray-400">No ingredient match</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );  
};

export default ProjectDrinkPlanPage;
