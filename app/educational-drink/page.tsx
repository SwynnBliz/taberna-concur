// app/admin-drink/page.tsx (Admin Drink Page)
'use client';
import { firestore, auth } from '../firebase/config';
import { collection, addDoc, onSnapshot, serverTimestamp, setDoc, doc, deleteDoc } from "firebase/firestore";
import Layout from '../../components/root/Layout';
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation"; 
import Link from 'next/link';

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

const flavorOptions = [
  "Fruity", "Smoky", "Spicy", "Sweet", "Sour", "Bitter",
  "Dry", "Herbal", "Floral", "Nutty", "Caramel",
  "Oaky", "Vanilla", "Chocolate", "Malty", "Creamy"
];

const measurementOptions = [
  "ml", "liter", "cl", "dl", "oz", "pint", "quart", "gallon",
  "g", "kg", "lb", "piece", "cube", "dash", "slice", "sprig"
];


const UserDrink = () => {
    const [drinks, setDrinks] = useState<Drink[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const pathname = usePathname()
    const [isLoading, setIsLoading] = useState(true);

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
    
    const filteredDrinks = drinks.filter(drink =>
        drink.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (selectedCategory === "" || drink.category === selectedCategory)
    );

    return (
        <Layout>
            <div className="flex flex-col">
                <div className="mt-6 w-8/12 mx-auto h-12 flex border-b-2 border-white mb-4">
                    {/* Tips & Tricks Tab */}
                    <Link
                        href="/educational"
                        className={`p-3 text-lg flex-1 text-center rounded-tl-lg rounded-tr-lg transition-all duration-300 
                            ${pathname === "/educational" ? "bg-yellow-500 text-black" : "bg-transparent text-white hover:bg-gray-700"}`}
                    >
                        Tips & Tricks
                    </Link>

                    {/* Drink Database Tab */}
                    <Link
                        href="/drink"
                        className={`p-3 text-lg flex-1 text-center rounded-tl-lg rounded-tr-lg transition-all duration-300 
                            ${pathname === "/educational-drink" ? "bg-yellow-500 text-black" : "bg-transparent text-white hover:bg-gray-700"}`}
                    >
                        Drink Database
                    </Link>
                </div>
    
                <div className="max-w-8/12 px-52">
                    <div className="flex space-x-2 items-center mt-4 my-5">
                        {/* Search Input */}
                        <input
                            type="text"
                            placeholder="Search Drinks"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full p-2 rounded-md text-white outline-none focus:ring-2 focus:ring-yellow-500 bg-[#2c2c2c]"
                        />

                        {/* Category Dropdown */}
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="p-2 rounded-md text-white bg-[#2c2c2c] outline-none focus:ring-2 focus:ring-yellow-500"
                        >
                            <option value="">All Categories</option>
                            {["Brandy", "Beer", "Gin", "Liqueur", "Rum", "Spirit", "Tequila", "Vodka", "Whiskey", "Wine"].map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                        
                    {/* Drink Display */}
                    {isLoading ? (
                        <div className="text-center text-white text-md my-5">
                            Loading Drink Database...
                        </div>
                    ) : filteredDrinks.length === 0 ? (
                            <p className="text-white text-center">No drinks found</p>
                    ) : (
                        <div className="grid grid-cols-3 gap-6 my-5 w-full">
                            {filteredDrinks.map((drink, index) => (
                                <div key={drink.id || `drink-${index}`} className="relative w-full">                                
                                    {/* Drink Card */}
                                    <Link href={drink.id ? `/educational-drink-view/${drink.id}` : "#"}>
                                        <div 
                                            className="bg-[#383434] p-4 rounded-lg shadow-lg text-white cursor-pointer hover:bg-[#504848] hover:shadow-xl transform hover:scale-105 transition-transform duration-200 ease-in-out h-56 flex flex-col justify-between"
                                        >
                                            <img src={drink.imageUrl} alt={drink.name} className="w-full h-32 object-cover rounded-lg" />
                                            <h3 className="text-lg font-semibold text-yellow-500 mt-2">{drink.name}</h3>
                                            <p className="text-gray-300">{drink.category}</p>
                                        </div>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default UserDrink;
