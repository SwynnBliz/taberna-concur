// app/admin-educational-drink/page.tsx (Admin Educational Drink Page)
'use client';
import { firestore, auth } from '../firebase/config';
import { collection, addDoc, onSnapshot, serverTimestamp, setDoc, doc, deleteDoc } from "firebase/firestore";
import Layout from '../../components/root/Layout';
import { useEffect, useState } from "react";
import { FaTrashAlt, FaPlus, FaTimes, FaEllipsisH, FaTrash, FaEdit } from "react-icons/fa";
import Link from 'next/link';
import { AiOutlineClose } from 'react-icons/ai';

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

// Options for flavor and measurement
const flavorOptions = [
    "Bitter", "Briny", "Caramel", "Chocolate", "Creamy", "Dry", "Floral",
    "Fruity", "Herbal", "Malty", "Nutty", "Oaky", "Salty", "Smoky", 
    "Sour", "Spicy", "Strong", "Sweet", "Vanilla"
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
  


const AdminDrink = () => {
    const [drinks, setDrinks] = useState<Drink[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [showCreateForm, setShowCreateForm] = useState(false);
    const initialDrinkState: Drink = {
        id: "",
        name: "",
        category: "Brandy",
        imageUrl: "",
        alcoholContent: { abv: 0, proof: 0 },
        flavorProfile: ["Bitter"],
        ingredients: [{ name: "", quantity: 0, unit: "ml" }],
        steps: [""],
        createdBy: "",
        createdAt: Date.now(),
    };
    const [drink, setDrink] = useState<Drink>(initialDrinkState);
    const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
    const [showUpdatePopup, setShowUpdatePopup] = useState(false);
    const [selectedDrink, setSelectedDrink] = useState<Drink | null>(null);
    const [showDeletePopup, setShowDeletePopup] = useState(false);
    const [newImage, setNewImage] = useState<File | null>(null);
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
    
    const addDrink = async () => {
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
    
        try {
            await addDoc(collection(firestore, "drinks"), {
                ...drink,
                createdBy: user.uid,
                createdAt: serverTimestamp(),
            });
            alert("Drink added successfully!");
            setDrink(initialDrinkState);
            setShowCreateForm(false);
        } catch (error) {
            console.error("Error adding drink: ", error);
        }
    };

    const filteredDrinks = drinks.filter(drink =>
        drink.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (selectedCategory === "" || drink.category === selectedCategory)
    );

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
            setDrink({ ...drink, flavorProfile: [...drink.flavorProfile, ""] });
        }
    };

    const handleFlavorProfileChange = (index: number, value: string) => {
        const updatedProfiles = [...drink.flavorProfile];
        updatedProfiles[index] = value;
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

    // Update Drink Function
    const handleFlavorProfileAddToUpdate = () => {
        if (selectedDrink && selectedDrink.flavorProfile.length < flavorOptions.length) {
            setSelectedDrink({ 
                ...selectedDrink, 
                flavorProfile: [...selectedDrink.flavorProfile, ""]
            });
        }
    };
    
    const handleFlavorProfileChangeToUpdate = (index: number, value: string) => {
        if (!selectedDrink) return;
        const updatedProfiles = [...selectedDrink.flavorProfile];
        updatedProfiles[index] = value;
        setSelectedDrink({ ...selectedDrink, flavorProfile: updatedProfiles });
    };
    
    const handleFlavorProfileRemoveToUpdate = (index: number) => {
        if (selectedDrink && index > 0) {
            const updatedProfiles = selectedDrink.flavorProfile.filter((_, i) => i !== index);
            setSelectedDrink({ ...selectedDrink, flavorProfile: updatedProfiles });
        }
    };

    const handleIngredientAddToUpdate = () => {
        if (selectedDrink) {
            setSelectedDrink({
                ...selectedDrink, 
                ingredients: [...selectedDrink.ingredients, { name: "", quantity: 0, unit: "ml" }]
            });
        }
    };
    
    const handleIngredientChangeToUpdate = (index: number, field: string, value: string | number) => {
        if (!selectedDrink) return;
        const updatedIngredients = [...selectedDrink.ingredients];
        updatedIngredients[index] = { ...updatedIngredients[index], [field]: value };
        setSelectedDrink({ ...selectedDrink, ingredients: updatedIngredients });
    };
    
    const handleIngredientRemoveToUpdate = (index: number) => {
        if (selectedDrink && index > 0) {
            const updatedIngredients = selectedDrink.ingredients.filter((_, i) => i !== index);
            setSelectedDrink({ ...selectedDrink, ingredients: updatedIngredients });
        }
    };

    const handleStepAddToUpdate = () => {
        if (!selectedDrink) return;
        setSelectedDrink({
            ...selectedDrink,
            steps: [...(selectedDrink.steps || []), ""],
        });
    };
    
    const handleStepChangeToUpdate = (index: number, value: string) => {
        if (!selectedDrink || !Array.isArray(selectedDrink.steps)) return;
        const updatedSteps = [...selectedDrink.steps];
        updatedSteps[index] = value;
        setSelectedDrink({ ...selectedDrink, steps: updatedSteps });
    };
    
    const handleStepRemoveToUpdate = (index: number) => {
        if (!selectedDrink || !Array.isArray(selectedDrink.steps) || selectedDrink.steps.length <= 1) return;
        const updatedSteps = selectedDrink.steps.filter((_, i) => i !== index);
        setSelectedDrink({ ...selectedDrink, steps: updatedSteps });
    };  

    const toggleDropdown = (id: string) => {
        setDropdownOpen(prev => (prev === id ? null : id));
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            setTimeout(() => {
                const target = event.target as HTMLElement | null;
                if (target && !target.closest(".dropdown-container") && !target.closest(".dropdown-button")) {
                    setDropdownOpen(null);
                }
            },);
        };
    
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);
    
    const updateDrink = async (updatedDrink: Drink) => {
        try {
            await setDoc(doc(firestore, "drinks", updatedDrink.id), updatedDrink);
            setDrinks((prevDrinks) =>
                prevDrinks.map((drink) => 
                    drink.id === updatedDrink.id ? updatedDrink : drink
                )
            );
    
            alert("Drink updated successfully!");
            setShowUpdatePopup(false);
        } catch (error) {
            console.error("Error updating drink: ", error);
        }
    };
    
    const deleteDrink = async (drinkId: string) => {
        try {
            await deleteDoc(doc(firestore, "drinks", drinkId));
            alert("Drink deleted successfully!");
            setShowDeletePopup(false);
        } catch (error) {
            console.error("Error deleting drink: ", error);
        }
    };

    return (
        <Layout>
            <div className="flex flex-col px-4">
                <div className="mt-6 w-full md:w-8/12 mx-auto flex flex-wrap md:flex-nowrap justify-between items-center border-b-2 border-white pb-2 mb-4 gap-2">
                    <h1 className="text-lg md:text-xl text-white">Manage Drinks</h1>
                    <button
                        onClick={() => setShowCreateForm(!showCreateForm)}
                        className="text-white p-2 rounded-full hover:bg-yellow-500 transition duration-200 flex items-center"
                    >
                        <FaPlus className="inline mr-2" /> Add Drink
                    </button>
                </div>
                
                <div className="flex flex-col justify-center items-center mx-auto w-full md:w-6/12 px-4">
                {showCreateForm && (
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
                            <button onClick={addDrink} className="w-full bg-yellow-500 text-white py-2 rounded mt-3 hover:bg-yellow-600 transition">Add Drink</button>
                        </div>
                    )}
                </div>
    
                <div className="max-w-8/12 px-4 md:px-52">
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 items-center mt-4 my-5">
                        {/* Search Input */}
                        <input
                            type="text"
                            placeholder="Search Drinks"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full sm:w-auto flex-1 p-2 rounded-md text-white outline-none focus:ring-2 focus:ring-yellow-500 bg-[#2c2c2c]"
                        />

                        {/* Category Dropdown */}
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full sm:w-auto p-2 rounded-md text-white bg-[#2c2c2c] outline-none focus:ring-2 focus:ring-yellow-500"
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
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 my-5 w-full">
                            {filteredDrinks.map((drink, index) => (
                                <div key={drink.id || `drink-${index}`} className="relative w-full">
                                    <div className="absolute top-2 right-2 z-10">
                                        {/* Dropdown Button */}
                                        <button 
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation(); 
                                                toggleDropdown(drink.id);
                                            }} 
                                            className={`p-2 rounded-full bg-black bg-opacity-40 dropdown-button 
                                                ${dropdownOpen === drink.id ? "text-yellow-500" : "text-white hover:text-yellow-500"}`}
                                        >
                                            <FaEllipsisH />
                                        </button>
                                
                                        {/* Dropdown Menu */}
                                        {dropdownOpen === drink.id && (
                                            <div className="absolute top-full right-0 mt-1 w-max bg-[#2c2c2c] text-white rounded-md shadow-lg z-40 dropdown-container">
                                                {/* Triangle Pointer */}
                                                <div className="absolute -top-2 right-3 w-4 h-4 rotate-45 bg-[#2c2c2c]"></div>
                                
                                                {/* Update Button */}
                                                <button 
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setSelectedDrink(drink);
                                                        setShowUpdatePopup(true);
                                                        setDropdownOpen(null);
                                                    }} 
                                                    className="flex items-center px-4 py-2 w-full hover:bg-[#383838] hover:rounded-md group"
                                                >
                                                    <FaEdit className="w-4 h-4 mr-2" />
                                                    <span className="whitespace-nowrap">Update</span>
                                                </button>

                                                {/* Delete Button */}
                                                <button 
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setSelectedDrink(drink);
                                                        setShowDeletePopup(true);
                                                        setDropdownOpen(null);
                                                    }} 
                                                    className="flex items-center px-4 py-2 w-full hover:bg-[#383838] hover:rounded-md group text-red-500 hover:text-red-600"
                                                >
                                                    <FaTrash className="w-4 h-4 mr-2" />
                                                    <span className="whitespace-nowrap">Delete</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                
                                    {/* Drink Card */}
                                    <Link href={drink.id ? `/educational-drink-view/${drink.id}` : "#"}>
                                        <div 
                                            className="bg-[#383838] p-4 rounded-lg shadow-lg text-white cursor-pointer hover:bg-[#484848] hover:shadow-xl transform hover:scale-105 transition-transform duration-200 ease-in-out h-56 flex flex-col justify-between"
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

                    {/* Update Drink Popup */}
                    {showUpdatePopup && selectedDrink && (
                        <div className="fixed inset-0 bg-[#484848] bg-opacity-40 flex items-center justify-center z-50">
                            <div className="max-w-xl w-full max-h-[70vh] overflow-y-auto p-6 bg-[#383838] shadow-md rounded-lg relative mt-20">
                                <h2 className="text-xl font-bold mb-4 text-yellow-500">Update Drink</h2>
                                <div className="space-y-4">
                                    {/* Name */}
                                    <div className="mb-2">
                                        <label className="font-semibold text-white">Drink Name</label>
                                        <input type="text" value={selectedDrink?.name || ""} onChange={(e) => setSelectedDrink({ ...selectedDrink, name: e.target.value })} className="w-full p-2 bg-[#2c2c2c] text-white outline-none focus:ring-2 focus:ring-yellow-500 rounded" />
                                    </div>

                                    {/* Category */}
                                    <div className="mb-2"> 
                                        <label className="font-semibold text-white">Category</label>
                                        <select value={selectedDrink?.category || ""} onChange={(e) => setSelectedDrink({ ...selectedDrink, category: e.target.value })} className="w-full p-2 bg-[#2c2c2c] text-white outline-none focus:ring-2 focus:ring-yellow-500 rounded">
                                            {["Brandy", "Beer", "Gin", "Liqueur", "Rum", "Spirit", "Tequila", "Vodka", "Whiskey", "Wine"].map((cat) => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    {/* Image Upload Section */}
                                    <div className="mb-2">
                                        <label className="font-semibold text-white block mb-2">Update Image</label>

                                        {/* Image Container (Flexbox for side-by-side layout) */}
                                        <div className="flex items-center gap-4">
                                            {/* Left: Current Image */}
                                            <div className="flex-1">
                                                {selectedDrink?.imageUrl ? (
                                                    <div className="relative w-full flex justify-center">
                                                        <img 
                                                            src={selectedDrink.imageUrl} 
                                                            alt="Current Drink" 
                                                            className="w-full h-40 object-cover rounded border border-gray-500"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-40 flex items-center justify-center border border-gray-500 rounded text-gray-400">
                                                        No Image
                                                    </div>
                                                )}
                                            </div>

                                            {/* Right: New Image Preview */}
                                            <div className="flex-1 relative">
                                                {newImage ? (
                                                    <div className="relative w-full flex justify-center">
                                                        <img 
                                                            src={URL.createObjectURL(newImage)} 
                                                            alt="New Preview" 
                                                            className="w-full h-40 object-cover rounded border border-gray-500"
                                                        />
                                                        {/* Remove Button */}
                                                        <button 
                                                            onClick={() => setNewImage(null)}
                                                            className="absolute top-2 right-2 bg-[#2c2c2c] text-white rounded-full p-1 hover:bg-yellow-500"
                                                        >
                                                            <AiOutlineClose size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-40 flex items-center justify-center border border-gray-500 rounded text-gray-400">
                                                        No Preview
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Upload Image Button */}
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className="mt-2 mb-2 text-white bg-[#2c2c2c] w-full p-2 outline-none focus:ring-2 focus:ring-yellow-500 rounded"
                                            onChange={(e) => e.target.files && setNewImage(e.target.files[0])} 
                                        />
                                    </div>
                                    
                                    {/* Flavor Profile */}
                                    <div className="space-y-2"> 
                                        <label className="font-semibold text-white">Flavor Profile</label>
                                        {(selectedDrink?.flavorProfile || []).map((flavor, index) => (
                                            <div key={index} className="flex gap-2">
                                                <select value={flavor} onChange={(e) => handleFlavorProfileChangeToUpdate(index, e.target.value)} className="w-full p-2 bg-[#2c2c2c] text-white outline-none focus:ring-2 focus:ring-yellow-500 rounded">
                                                    {flavorOptions.map((option) => <option key={option} value={option} className="">{option}</option>)}
                                                </select>
                                                {index > 0 && (
                                                    <button onClick={() => handleFlavorProfileRemoveToUpdate(index)} className="text-red-500 hover:text-red-600"><FaTrashAlt /></button>
                                                )}
                                            </div>
                                        ))}
                                        <button onClick={handleFlavorProfileAddToUpdate} className="w-full bg-gray-500 text-white py-2 rounded flex items-center justify-center gap-2 hover:bg-gray-600 transition">
                                            <FaPlus /> Add Flavor
                                        </button>
                                    </div>

                                    {/* Ingredients */}
                                    <div className="space-y-2"> 
                                        <label className="font-semibold text-white">Ingredients</label>
                                        {(selectedDrink?.ingredients || []).map((ingredient, index) => (
                                            <div key={index} className="flex gap-2">
                                                <input type="text" placeholder="Ingredient Name" value={ingredient.name || ""} onChange={(e) => handleIngredientChangeToUpdate(index, "name", e.target.value)} className="w-1/2 p-2 bg-[#2c2c2c] text-white outline-none focus:ring-2 focus:ring-yellow-500 rounded" />
                                                <input type="number" placeholder="Quantity" value={ingredient.quantity || ""} onChange={(e) => handleIngredientChangeToUpdate(index, "quantity", parseFloat(e.target.value) || 0)} className="w-1/4 p-2 bg-[#2c2c2c] text-white outline-none focus:ring-2 focus:ring-yellow-500 rounded" />
                                                <select value={ingredient.unit || ""} onChange={(e) => handleIngredientChangeToUpdate(index, "unit", e.target.value)} className="w-1/4 p-2 bg-[#2c2c2c] text-white outline-none focus:ring-2 focus:ring-yellow-500 rounded">
                                                    {measurementOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                                                </select>
                                                {index > 0 && (
                                                    <button onClick={() => handleIngredientRemoveToUpdate(index)} className="text-red-500 hover:text-red-600"><FaTrashAlt /></button>
                                                )}
                                            </div>
                                        ))}
                                        <button onClick={handleIngredientAddToUpdate} className="w-full bg-gray-500 text-white py-2 rounded flex items-center justify-center gap-2 hover:bg-gray-600 transition">
                                            <FaPlus /> Add Ingredient
                                        </button>
                                    </div>

                                    {/* Step Instructions */}
                                    <div className="space-y-2"> 
                                        <label className="font-semibold text-white">Step-by-Step Instructions</label>
                                        {(selectedDrink?.steps || []).map((step, index) => (
                                            <div key={index} className="flex gap-2">
                                                <input type="text" placeholder={`Step ${index + 1}`} value={step || ""} onChange={(e) => handleStepChangeToUpdate(index, e.target.value)} className="w-full p-2 bg-[#2c2c2c] text-white outline-none focus:ring-2 focus:ring-yellow-500 rounded" />
                                                {index > 0 && (
                                                    <button onClick={() => handleStepRemoveToUpdate(index)} className="text-red-500 hover:text-red-600"><FaTrashAlt /></button>
                                                )}
                                            </div>
                                        ))}
                                        <button onClick={handleStepAddToUpdate} className="w-full bg-gray-500 text-white py-2 rounded flex items-center justify-center gap-2 hover:bg-gray-600 transition">
                                            <FaPlus /> Add Step
                                        </button>
                                    </div>

                                    {/* Save & Cancel Buttons */}
                                    <div className="flex justify-between mt-4">
                                    <button 
                                        onClick={() => setShowUpdatePopup(false)} 
                                        className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={() => updateDrink(selectedDrink)} 
                                        className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition"
                                    >
                                        Save
                                    </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Delete Confirmation Modal */}
                    {showDeletePopup && selectedDrink && (
                        <div className="fixed inset-0 bg-[#484848] bg-opacity-40 flex items-center justify-center z-50">
                            <div className="bg-[#2c2c2c] p-6 rounded-lg text-white text-center">
                                <p>Are you sure you want to delete {selectedDrink.name}? This cannot be undone!</p>
                                <div className="mt-4 flex justify-between gap-4">
                                    <button
                                        onClick={async () => {
                                            if (!selectedDrink.id) return;
                                            await deleteDrink(selectedDrink.id);
                                            setShowDeletePopup(false);
                                        }}
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
                </div>
            </div>
        </Layout>
    );
};

export default AdminDrink;
