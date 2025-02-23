// app/admin-drink/page.tsx (Admin Drink Page)
'use client';
import { firestore } from '../firebase/config';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import Layout from '../../components/root/Layout';
import { useState } from "react";
import { FaTrashAlt, FaPlus } from "react-icons/fa";

interface Drink {
    id: string;
    name: string;
    category: string;
    imageUrl: string;
    alcoholContent: { abv: number; proof: number };
    flavorProfile: string[];
    costPerQuantity: { cost: number; unit: string };
    ingredients: { name: string; quantity: number; unit: string }[];
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

const AdminDrink = () => {
    const [drink, setDrink] = useState<Drink>({
        id: "",
        name: "",
        category: "Brandy",
        imageUrl: "",
        alcoholContent: { abv: 0, proof: 0 },
        flavorProfile: ["Fruity"],
        costPerQuantity: { cost: 0, unit: "bottle" },
        ingredients: [{ name: "", quantity: 0, unit: "ml" }],
        createdBy: "",
        createdAt: Date.now(),
    });

    const addDrink = async () => {
        if (!drink.name || !drink.category || !drink.imageUrl || drink.alcoholContent.abv <= 0 ||
            drink.flavorProfile.length === 0 || !drink.ingredients[0].name || drink.ingredients[0].quantity <= 0) {
            alert("Please fill out all required fields!");
            return;
        }

        try {
            await addDoc(collection(firestore, "drinks"), {
                ...drink,
                createdAt: serverTimestamp(),
            });
            alert("Drink added successfully!");
        } catch (error) {
            console.error("Error adding drink: ", error);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setDrink({ ...drink, [e.target.name]: e.target.value });
    };

    const handleFlavorProfileAdd = () => {
        if (drink.flavorProfile.length < flavorOptions.length) {
            setDrink({ ...drink, flavorProfile: [...drink.flavorProfile, ""] });
        }
    };

    const handleFlavorProfileChange = (index: number, value: string) => {
        const updatedProfiles = [...drink.flavorProfile];
        updatedProfiles[index] = value;
        setDrink({ ...drink, flavorProfile: updatedProfiles });
    };

    const handleFlavorProfileRemove = (index: number) => {
        // Prevent removing the first flavor profile
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
        // Prevent removing the first ingredient
        if (index > 0) {
            const updatedIngredients = drink.ingredients.filter((_, i) => i !== index);
            setDrink({ ...drink, ingredients: updatedIngredients });
        }
    };

    return (
        <Layout>
            <div className="p-8">
                <div className="max-w-xl mx-auto p-6 bg-[#383434] shadow-md rounded-lg">
                    <h2 className="text-xl font-bold mb-4 text-yellow-500">Add a Drink</h2>

                    {/* Name */}
                    <label className="font-semibold text-white">Drink Name</label>
                    <input type="text" name="name" value={drink.name} onChange={handleChange} className="w-full p-2 border rounded mb-3" />

                    {/* Category */}
                    <label className="font-semibold text-white">Category</label>
                    <select name="category" value={drink.category} onChange={handleChange} className="w-full p-2 border rounded mb-3">
                        {["Brandy", "Beer", "Gin", "Liqueur", "Rum", "Spirit", "Tequila", "Vodka", "Whiskey", "Wine"].map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>

                    {/* Image URL */}
                    <label className="font-semibold text-white">Image URL</label>
                    <input type="text" name="imageUrl" value={drink.imageUrl} onChange={handleChange} className="w-full p-2 border rounded mb-3" />

                    {/* Alcohol Content */}
                    <label className="font-semibold text-white">Alcohol Content</label>
                    <div className="flex gap-3 mb-3">
                        <input type="number" name="abv" placeholder="ABV %" value={drink.alcoholContent.abv}
                            onChange={(e) => setDrink({
                                ...drink, alcoholContent: { abv: parseFloat(e.target.value), proof: parseFloat(e.target.value) * 2 }
                            })}
                            className="w-1/2 p-2 border rounded"
                        />
                        <input type="number" name="proof" placeholder="Proof" value={drink.alcoholContent.proof} disabled className="w-1/2 p-2 border rounded bg-gray-200" />
                    </div>

                    {/* Flavor Profile */}
                    <label className="font-semibold text-white">Flavor Profile</label>
                    {drink.flavorProfile.map((flavor, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                            <select value={flavor} onChange={(e) => handleFlavorProfileChange(index, e.target.value)} className="w-full p-2 border rounded">
                                {flavorOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                            {index > 0 && (
                                <button onClick={() => handleFlavorProfileRemove(index)} className="text-red-500"><FaTrashAlt /></button>
                            )}
                        </div>
                    ))}
                    <button onClick={handleFlavorProfileAdd} className="w-full bg-yellow-500 text-white py-2 rounded mt-2 flex items-center justify-center gap-2 hover:bg-yellow-600 transition">
                        <FaPlus /> Add Flavor
                    </button>

                    {/* Ingredients */}
                    <label className="font-semibold text-white">Ingredients</label>
                    {drink.ingredients.map((ingredient, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                            <input type="text" placeholder="Ingredient Name" value={ingredient.name} onChange={(e) => handleIngredientChange(index, "name", e.target.value)} className="w-1/2 p-2 border rounded" />
                            <input type="number" placeholder="Quantity" value={ingredient.quantity} onChange={(e) => handleIngredientChange(index, "quantity", parseFloat(e.target.value))} className="w-1/4 p-2 border rounded" />
                            <select value={ingredient.unit} onChange={(e) => handleIngredientChange(index, "unit", e.target.value)} className="w-1/4 p-2 border rounded">
                                {measurementOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                            </select>
                            {index > 0 && (
                                <button onClick={() => handleIngredientRemove(index)} className="text-red-500"><FaTrashAlt /></button>
                            )}
                        </div>
                    ))}
                    <button onClick={handleIngredientAdd} className="w-full bg-yellow-500 text-white py-2 rounded mt-2 flex items-center justify-center gap-2 hover:bg-yellow-600 transition">
                        <FaPlus /> Add Ingredient
                    </button>

                    {/* Cost Per Quantity */}
                    <label className="font-semibold flex items-center text-white">Cost</label>
                    <input type="number" name="cost" value={drink.costPerQuantity.cost} onChange={(e) => setDrink({ ...drink, costPerQuantity: { ...drink.costPerQuantity, cost: parseFloat(e.target.value) } })} className="w-full p-2 border rounded mb-3" />

                    {/* Submit Button */}
                    <button onClick={addDrink} className="w-full bg-blue-500 text-white py-2 rounded mt-3 hover:bg-blue-600 transition">Add Drink</button>
                </div>
            </div>
        </Layout>
    );
};

export default AdminDrink;
