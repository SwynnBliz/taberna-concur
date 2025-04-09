"use client"
import { useState, useEffect, useRef } from 'react';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import Layout from "../../../../components/root/Layout";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { FaExclamationCircle, FaExclamationTriangle, FaPrint } from 'react-icons/fa';
import { doc, onSnapshot } from 'firebase/firestore';
import { firestore } from "../../../firebase/config";
import { PieChart, Pie, Tooltip, Cell, Legend } from "recharts";
import { useReactToPrint } from "react-to-print";
import { ChatPopupButton } from "../../../../components/Chat";

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

const ProjectSummaryPage = () => {
  const params = useParams();
  const projectId = Array.isArray(params.id) ? params.id[0] : params.id;
  const pathname = usePathname();
  const [project, setProject] = useState<Project | null>(null);
  const router = useRouter();
  const [authUser, setAuthUser] = useState<any>(null);
  const auth = getAuth();
  const [flavorCounts, setFlavorCounts] = useState<any>({});
  const [ingredientTotals, setIngredientTotals] = useState<any[]>([]);
  const [isClient, setIsClient] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const reactToPrintFn = useReactToPrint({ contentRef });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
  
    // Real-time listener for the project document
    const unsubscribe = onSnapshot(projectRef, (docSnap) => {
      if (docSnap.exists()) {
        const fetchedProject = docSnap.data() as Project;
        setProject(fetchedProject);

        // Flavor profile count
        const flavorCountMap: { [key: string]: number } = {};
        fetchedProject.drinkPlan.forEach((drink: Drink) => {
          drink.flavorProfile.forEach((flavor: string) => {
            flavorCountMap[flavor] = (flavorCountMap[flavor] || 0) + 1;
          });
        });
        setFlavorCounts(flavorCountMap);

        const drinkIngredients = normalizeAndCombineIngredients(fetchedProject.drinkPlan, fetchedProject);
    
        const projectIngredientsMap = fetchedProject.ingredients.reduce((acc: any, { name, quantity, unit }: any) => {
          acc[name] = { total: quantity, unit };
          return acc;
        }, {});  
    
        // Compare drinks and project ingredients
        const ingredientComparison = Object.keys(drinkIngredients).map((name) => {
          const drinkTotal = drinkIngredients[name]?.total || 0;
          const drinkUnit = drinkIngredients[name]?.unit;
        
          const projectEntry = projectIngredientsMap[name];
          const projectTotal = projectEntry ? projectEntry.total : 0;
          const projectUnit = projectEntry ? projectEntry.unit : "Missing";
        
          // Get list of drinks using this ingredient
          const drinksUsingIngredient = fetchedProject.drinkPlan
            .filter((drink) => drink.ingredients.some((ingredient) => ingredient.name === name))
            .map((drink) => drink.name);
        
          return {
            name,
            drinkAmount: `${drinkTotal.toFixed(2)} ${drinkUnit}`, 
            projectAmount: projectEntry ? `${projectTotal.toFixed(2)} ${projectUnit}` : "Missing",
            drinksUsing: drinksUsingIngredient,
          };
        });        
    
        setIngredientTotals(ingredientComparison);
      } else {
        console.log("No such project!");
      }
    });

    return () => unsubscribe();
  }, [projectId]);

  // Pie chart data for flavor profile
  const flavorLabels = Object.keys(flavorCounts);
  
  const colorPalette = [
    "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40", "#E74C3C",
    "#2ECC71", "#3498DB", "#F1C40F", "#9B59B6", "#1ABC9C", "#E67E22", "#16A085",
    "#27AE60", "#2980B9"
  ];
  
  const pieChartData = Object.keys(flavorCounts).map((flavor, index) => ({
    name: flavor,
    value: flavorCounts[flavor],
    color: colorPalette[index % colorPalette.length],
  }));

  const normalizeAndCombineIngredients = (drinks: Drink[], project: Project) => {
    const combinedIngredients: Record<string, { total: number; unit: string }> = {};
  
    // Create a unit reference map from project ingredients
    const projectUnitMap: Record<string, string> = {};
    project.ingredients.forEach(({ name, unit }) => {
      projectUnitMap[name] = unit.toLowerCase();
    });
  
    const drinkUnitUsage: Record<string, Record<string, number>> = {};
  
    drinks.forEach((drink) => {
      drink.ingredients.forEach(({ name, quantity, unit }) => {
        const drinkUnit = unit.toLowerCase();
  
        // Track unit occurrences per ingredient
        if (!drinkUnitUsage[name]) drinkUnitUsage[name] = {};
        drinkUnitUsage[name][drinkUnit] = (drinkUnitUsage[name][drinkUnit] || 0) + 1;
  
        const projectUnit = projectUnitMap[name] || drinkUnit;
        const conversionFactor = unitConversionMap[drinkUnit] || 1;
        const convertedQuantity = quantity * conversionFactor * drink.quantity;
  
        const finalConversionFactor = unitConversionMap[projectUnit] || 1;
        const finalQuantity = convertedQuantity / finalConversionFactor;
  
        if (!combinedIngredients[name]) {
          combinedIngredients[name] = { total: finalQuantity, unit: projectUnit };
        } else {
          combinedIngredients[name].total += finalQuantity;
        }
      });
    });
  
    // Fix missing ingredient unit selection
    Object.keys(combinedIngredients).forEach((name) => {
      if (!projectUnitMap[name]) {
        // Find most used unit in drinks
        const unitCounts = drinkUnitUsage[name] || {};
        const sortedUnits = Object.entries(unitCounts).sort((a, b) => b[1] - a[1]);
        combinedIngredients[name].unit = sortedUnits.length ? sortedUnits[0][0] : "ml"; // Fallback to ml if no units exist
      }
    });
  
    return combinedIngredients;
  };

  return (
    <Layout>
      <div className="p-6 min-h-screen w-full text-white">
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

        {authUser && projectId && <ChatPopupButton projectId={projectId} userId={authUser.uid} isOpen={isOpen} setIsOpen={setIsOpen} />}

        {/* Top Navigation */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-yellow-500">Project Summary</h1>
          <button onClick={() => reactToPrintFn()} className="flex items-center gap-2 bg-[#2c2c2c] px-4 py-2 rounded-lg text-white hover:bg-yellow-500 transition-all">
            <FaPrint className="text-xl" />
            <span>Print</span>
          </button>
        </div>

        {/* Print Area */}
        <div ref={contentRef} id="print-content" className="bg-[#383838] p-6">
          {/* Summary Content (Pie Chart, Table, Flavor Breakdown) */}
          <div className="flex flex-col gap-6">
            <div className="flex gap-6">
              {/* Pie Chart */}
              <div className="w-1/2 p-6 mr-10">
                <h2 className="text-xl font-bold mb-4 text-yellow-500">Flavor Profile Distribution</h2>
                {isClient && (
                  <PieChart width={380} height={350}>
                    <Pie
                      data={pieChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      fill="#8884d8"
                      label={({ name, percent, x, y, index }) => (
                        <text
                          x={x}
                          y={y}
                          fill={pieChartData[index].color}
                          textAnchor={x > 200 ? "start" : "end"}
                          dominantBaseline="central"
                          fontSize={12}
                          fontWeight="bold"
                        >
                          {`${name}: ${(percent * 100).toFixed(2)}%`}
                        </text>
                      )}
                      labelLine={{ stroke: "#fff" }}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                )}
              </div>

              {/* Ingredients Table */}
              <div className="w-1/2 text-white">
                <h2 className="text-xl font-bold mb-4 text-yellow-500">Ingredient Usage</h2>
                <table className="w-full border-collapse border border-gray-400 text-xs">
                  <thead>
                    <tr className="bg-gray-700">
                      <th className="border p-2">Ingredient</th>
                      <th className="border p-2">Drink Plan Total</th>
                      <th className="border p-2">Project Stock</th>
                      <th className="border p-2">Used In Drinks</th>
                    </tr>
                  </thead>
                  <tbody>
                  {ingredientTotals.map(({ name, drinkAmount, projectAmount, drinksUsing }) => (
                      <tr key={name} className="border text-center">
                        <td className="border p-2">{name}</td>
                        <td className="border p-2">
                          <span className="inline-flex items-center gap-1">
                            {drinkAmount}
                            {parseFloat(drinkAmount) > parseFloat(projectAmount) && projectAmount !== "Missing" && (
                              <FaExclamationCircle className="text-yellow-500" />
                            )}
                          </span>
                        </td>
                        <td className={`border p-2 ${projectAmount === "Missing" ? "text-red-400" : ""}`}>
                          <span className="inline-flex items-center gap-1">
                            {projectAmount}
                            {projectAmount === "Missing" && <FaExclamationTriangle className="text-red-500" />}
                          </span>
                        </td>
                        <td className="border p-2">
                          {drinksUsing.length > 0 ? drinksUsing.join(", ") : "None"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Flavor Profile Breakdown */}
            <div className="p-6 w-full">
              <h2 className="text-xl font-bold mb-4 text-yellow-500">Flavor Profile Breakdown</h2>
              <div className="grid grid-cols-4 gap-4">
                {flavorLabels.map((flavor, index) => {
                  const bgColor = pieChartData[index]?.color || "#ccc";

                  return (
                    <div key={flavor} className="p-3 rounded-lg text-center text-black font-semibold" style={{ backgroundColor: bgColor }}>
                      <p>{flavor} ({flavorCounts[flavor]} drinks)</p>
                      <ul className="text-sm mt-2">
                        {project?.drinkPlan
                          .filter((drink: Drink) => drink.flavorProfile.includes(flavor))
                          .map((drink: Drink) => (
                            <li key={drink.id} className="text-white">
                              {drink.name} (x{drink.quantity})
                            </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProjectSummaryPage;
