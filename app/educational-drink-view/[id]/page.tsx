'use client';
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { firestore } from '../../firebase/config';
import { doc, getDoc } from "firebase/firestore";
import Layout from '../../../components/root/Layout';
import { FaArrowLeft } from "react-icons/fa";
import { formatDistanceToNow } from 'date-fns';

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

const DrinkViewPage = () => {
    const { id } = useParams();
    const [drink, setDrink] = useState<Drink | null>(null);
    const [createdByName, setCreatedByName] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        if (!id || Array.isArray(id)) return;

        const fetchDrink = async () => {
            try {
                const drinkRef = doc(firestore, "drinks", id);
                const drinkSnap = await getDoc(drinkRef);
        
                if (drinkSnap.exists()) {
                    const drinkData = drinkSnap.data() as Drink;
                    setDrink({ ...drinkData, id: drinkSnap.id });
        
                    if (drinkData.createdBy) {
                        const userRef = doc(firestore, "users", drinkData.createdBy);
                        const userSnap = await getDoc(userRef);
                        if (userSnap.exists()) {
                            setCreatedByName(userSnap.data().username || "Unknown");
                        } else {
                            setCreatedByName("Unknown");
                        }
                    }
                } else {
                    console.error("Drink not found!");
                }
            } catch (error) {
                console.error("Error fetching drink:", error);
            }
        };        

        fetchDrink();
    }, [id]);

    const formatTimestamp = (timestamp: any) => {
        return timestamp && timestamp.seconds
          ? formatDistanceToNow(new Date(timestamp.seconds * 1000), { addSuffix: true })
          : 'Invalid date';
    };

    if (!drink) {
        return (
            <Layout>
                <div className="text-center text-white text-lg mt-5">Loading drink details...</div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-4xl mx-auto mt-8 mb-8 bg-[#383434] p-6 rounded-lg shadow-lg text-white relative">
                {/* Go Back Button */}
                <button 
                    onClick={() => router.back()} 
                    className="absolute top-4 right-4 text-yellow-500 hover:text-yellow-600 transition"
                >
                    <FaArrowLeft size={24} />
                </button>

                {/* Top Section: Image & Info */}
                <div className="flex flex-col md:flex-row gap-6 items-center">
                    {/* Drink Image */}
                    <img src={drink.imageUrl} alt={drink.name} className="w-full md:w-1/3 h-64 object-cover rounded-lg" />

                    {/* Drink Info */}
                    <div className="flex-1 space-y-2">
                        <h1 className="text-3xl font-bold text-yellow-500">{drink.name}</h1>
                        <p className="text-lg text-gray-300">{drink.category}</p>
                        <p className="text-gray-300">Alcohol Content: {drink.alcoholContent.abv}% ABV | {drink.alcoholContent.proof} Proof</p>
                        <p className="text-gray-300">Flavor Profile: {drink.flavorProfile.join(", ")}</p>
                        <p className="text-sm text-gray-400">Created by: {createdByName} | {formatTimestamp(drink.createdAt)}</p>
                    </div>
                </div>

                {/* Bottom Section: Ingredients & Steps */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    {/* Ingredients List */}
                    <div>
                        <h2 className="text-xl font-semibold text-yellow-500">Ingredients</h2>
                        <ul className="list-disc list-inside space-y-1">
                            {drink.ingredients.map((ingredient, index) => (
                                <li key={index}>
                                    {ingredient.name} - {ingredient.quantity} {ingredient.unit}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Steps List */}
                    <div>
                        <h2 className="text-xl font-semibold text-yellow-500">Preparation Steps</h2>
                        <ol className="list-decimal list-inside space-y-1">
                            {drink.steps.map((step, index) => (
                                <li key={index}>{step}</li>
                            ))}
                        </ol>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default DrinkViewPage;