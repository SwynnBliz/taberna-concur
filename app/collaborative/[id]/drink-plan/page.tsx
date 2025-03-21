// app/collaborative/[id]/drink-plan/page.tsx (Collaborative Project Drink Plan Page)
"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { onSnapshot, collection, doc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { firestore } from "../../../firebase/config";
import Layout from "../../../../components/root/Layout";
import Link from "next/link";
import { usePathname } from "next/navigation"; 

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
  "dash", "drop", "pinch", "sprig", "cube",

  // Countable Items (Fruits, Garnishes, etc.)
  "piece", "slice", "wedge", "twist"
];

const unitConversionMap: Record<string, number> = {
  ml: 1, cl: 10, dl: 100, liter: 1000, oz: 29.5735,
  pint: 473.176, quart: 946.353, gallon: 3785.41,
  g: 1, kg: 1000, lb: 453.592,
  dash: 0.92, drop: 0.05, pinch: 0.36, sprig: 2, cube: 4.5
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

interface Drink {
    id: string;
    name: string;
    category: string;
    imageUrl: string;
    alcoholContent: { abv: number; proof: number };
    flavorProfile: string[];
    ingredients: { name: string; quantity: number; unit: string }[];
    steps: string[];
    createdBy: string;
    createdAt: number;
}

const ProjectSettingsPage = () => {
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
  const [expandedDrink, setExpandedDrink] = useState<string | null>(null);

  if (!projectId) {
    return <h1 className="text-white text-center text-2xl p-6">Project Id does not exist</h1>;
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
    if (!projectId) return;

    const projectRef = doc(firestore, "projects", projectId);
    const unsubscribe = onSnapshot(projectRef, async (snapshot) => {
    if (snapshot.exists()) {
        const projectData = snapshot.data();
        setProject(projectData);
    }
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
              createdBy: data.createdBy || "",
              createdAt: data.createdAt || Date.now(),
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

  const calculateDrinkScore = (drink: Drink, project: Project) => {
    if (!drink || !project) return { score: 0, flavorMatchDetails: [], ingredientMatchDetails: [] };
  
    const flavorWeight = project.priorityPercentage.flavors / 100;
    const ingredientWeight = project.priorityPercentage.ingredients / 100;
  
    const { score: flavorMatchScore, details: flavorMatchDetails } = calculateFlavorMatch(drink.flavorProfile, project.flavorProfile);
    const { score: ingredientMatchScore, details: ingredientMatchDetails } = calculateIngredientMatch(drink.ingredients, project.ingredients);
  
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
    projectIngredients: { name: string; quantity: number; unit: string }[]
  ) => {
    if (!drinkIngredients.length || !projectIngredients.length) return { score: 0, details: [] };
  
    let totalMatch = 0;
    let totalIngredients = drinkIngredients.length;
    let details: { ingredient: string; drinkQuantity: string; projectQuantity: string; matchPercentage: string }[] = [];
  
    drinkIngredients.forEach((drinkIng) => {
      const matchingProjectIng = projectIngredients.find(projIng => projIng.name.toLowerCase() === drinkIng.name.toLowerCase());
  
      if (matchingProjectIng) {
        const projectUnit = matchingProjectIng.unit; // Use the project's unit
        const drinkBaseUnit = unitConversionMap[drinkIng.unit] ?? 1;
        const projectBaseUnit = unitConversionMap[projectUnit] ?? 1;
  
        // Convert drink quantity to project's unit
        const drinkQuantityInProjectUnit = (drinkIng.quantity * drinkBaseUnit) / projectBaseUnit;
        const projectQuantityBase = matchingProjectIng.quantity;
  
        let matchRatio = projectQuantityBase >= drinkQuantityInProjectUnit ? 1 : projectQuantityBase / drinkQuantityInProjectUnit;
        totalMatch += matchRatio;
  
        details.push({
          ingredient: drinkIng.name,
          drinkQuantity: `${drinkQuantityInProjectUnit.toFixed(2)} ${projectUnit}`, // Use project unit
          projectQuantity: `${matchingProjectIng.quantity} ${projectUnit}`,
          matchPercentage: (matchRatio * 100).toFixed(1) + "%"
        });
      } else {
        // If missing in the project, default to the drink's unit
        details.push({
          ingredient: drinkIng.name,
          drinkQuantity: `${drinkIng.quantity} ${drinkIng.unit}`,
          projectQuantity: "Missing",
          matchPercentage: "0%"
        });
      }
    });
  
    const score = (totalMatch / totalIngredients) * 100;
    return { score, details };
  };  
    
  const scoredDrinks = drinks.map(drink => {
    const { score, flavorMatchDetails, ingredientMatchDetails } = calculateDrinkScore(drink, project);
    return { ...drink, score, flavorMatchDetails, ingredientMatchDetails };
  });
  
  const filteredDrinks = scoredDrinks
  .filter(drink =>
    drink.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (selectedCategory === "" || drink.category === selectedCategory)
  )
  .sort((a, b) => b.score - a.score); // Sort by highest score

  if (!project) return <div className="text-white p-6">Loading project...</div>;

  return (
    <Layout>
      <div className="p-6 min-h-screen max-w-5xl">
        <div className="mx-auto h-12 flex border-b-2 border-white mb-4">
            {/* Drink Plan Tab */}
            <Link
                href={`/collaborative/${projectId}/drink-plan`}
                className={`p-3 text-lg flex-1 text-center rounded-tl-lg rounded-tr-lg transition-all duration-300 
                  ${/^\/collaborative\/[^/]+\/drink-plan$/.test(pathname) ? "bg-yellow-500 text-white" : "bg-transparent text-white hover:bg-gray-500"}`}
            >
                Drink Plan
            </Link>

            {/* Summary Tab */}
            <Link
                href={`/collaborative/${projectId}/settings`}
                className={`p-3 text-lg flex-1 text-center rounded-tl-lg rounded-tr-lg transition-all duration-300 
                  ${/^\/collaborative\/[^/]+\/summary$/.test(pathname) ? "bg-yellow-500 text-white" : "bg-transparent text-white hover:bg-gray-500"}`}
            >
                Summary
            </Link>

            {/* Logs Tab */}
            <Link
                href={`/collaborative/${projectId}/drink-plan`}
                className={`p-3 text-lg flex-1 text-center rounded-tl-lg rounded-tr-lg transition-all duration-300 
                  ${/^\/collaborative\/[^/]+\/logs$/.test(pathname) ? "bg-yellow-500 text-white" : "bg-transparent text-white hover:bg-gray-500"}`}
            >
                Logs
            </Link>

            {/* Settings */}
            <Link
                href={`/collaborative/${projectId}/settings`}
                className={`p-3 text-lg flex-1 text-center rounded-tl-lg rounded-tr-lg transition-all duration-300 
                    ${/^\/collaborative\/[^/]+\/settings$/.test(pathname) ? "bg-yellow-500 text-white" : "bg-transparent text-white hover:bg-gray-500"}`}
            >
                Settings
            </Link>
        </div>

        {/* Drink Display */}
        {isLoading ? (
            <div className="text-center text-white text-md my-5">
                Loading Drink Database...
            </div>
        ) : (
            <div className="grid grid-cols-3 gap-6 my-5">
                {filteredDrinks.map((drink, index) => (
                    <div key={drink.id || `drink-${index}`} className="relative w-full">
                        {/* Drink Card */}
                        <div 
                            className="bg-[#383838] p-4 rounded-lg shadow-lg text-white cursor-pointer hover:bg-[#484848] hover:shadow-xl transform hover:scale-105 transition-transform duration-200 ease-in-out h-56 flex flex-col justify-between"
                        >
                            <img src={drink.imageUrl} alt={drink.name} className="w-full h-32 object-cover rounded-lg" />
                            <div className="mt-2">
                              <div className="text-sm font-semibold text-white mb-1">Match Score: {drink.score.toFixed(1)}%</div>
                              <div className="w-full bg-gray-700 rounded-full h-2.5">
                                <div 
                                  className="h-2.5 rounded-full bg-yellow-400 transition-all duration-300"
                                  style={{ width: `${drink.score}%` }}
                                ></div>
                              </div>
                            </div>
                            <button
                              className="text-sm text-yellow-300 underline cursor-pointer mt-1"
                              onClick={() => setExpandedDrink(expandedDrink === drink.id ? null : drink.id)}
                            >
                              {expandedDrink === drink.id ? "Hide Details" : "View Details"}
                            </button>

                            {expandedDrink === drink.id && (
                              <div className="mt-2 p-2 bg-gray-800 rounded-md text-sm">
                                <strong>Flavor Match:</strong>
                                {drink.flavorMatchDetails.length > 0 ? (
                                 <div className="flex flex-wrap gap-2">
                                  {project.flavorProfile.length > 0 ? (
                                    project.flavorProfile.map((flavor: string, index: number) => (
                                      <span 
                                        key={index} 
                                        className={`px-2 py-1 rounded-md text-sm font-semibold ${
                                          drink.flavorProfile.includes(flavor) ? "bg-yellow-500 text-white" : "bg-gray-600 text-gray-300"
                                        }`}
                                      >
                                        {flavor}
                                      </span>
                                    ))
                                  ) : <span className="text-gray-400">No flavors defined</span>}
                                </div>                                                            
                                ) : <p className="text-gray-400">No flavor match</p>}
                              
                                <strong>Project Flavor Profile:</strong>
                                <p className="text-gray-300">
                                  {project.flavorProfile.length > 0 ? (
                                    project.flavorProfile.map((flavor: string, index: number) => (
                                    <span 
                                      key={index} 
                                      className={`px-2 py-1 rounded-md ${drink.flavorProfile.includes(flavor) ? "text-yellow-300" : "text-gray-400"}`}
                                    >
                                      {flavor}
                                    </span>
                                  ))          
                                  ) : <span className="text-gray-400">No flavors defined</span>}
                                </p>
                              
                                <strong>Drink Flavor Profile:</strong>
                                <p className="text-gray-300">
                                  {drink.flavorProfile.length > 0 ? (
                                    drink.flavorProfile.map((flavor, index) => (
                                      <span key={index} className={`px-2 py-1 rounded-md ${project.flavorProfile.includes(flavor) ? "text-yellow-300" : "text-gray-400"}`}>
                                        {flavor}
                                      </span>
                                    ))
                                  ) : <span className="text-gray-400">No flavors listed</span>}
                                </p>
                              
                                <strong>Ingredient Match:</strong>
                                {drink.ingredientMatchDetails.length > 0 ? (
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
                                    {drink.ingredientMatchDetails.map((ing, index) => (
                                      <tr key={index} className="border-b border-gray-700">
                                        <td className="py-1">{ing.ingredient}</td>
                                        <td className="py-1 text-white">{ing.drinkQuantity}</td>
                                        <td className={`py-1 ${ing.projectQuantity === "Missing" ? "text-red-400" : "text-white"}`}>
                                          {ing.projectQuantity}
                                        </td>
                                        <td className={`py-1 font-semibold ${parseFloat(ing.matchPercentage) > 50 ? "text-green-400" : "text-yellow-400"}`}>
                                          {ing.matchPercentage}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>                                
                                ) : <p className="text-gray-400">No ingredient match</p>}
                              </div>                            
                            )}

                            <p className="text-gray-300">{drink.category}</p>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </Layout>
  );  
};

export default ProjectSettingsPage;