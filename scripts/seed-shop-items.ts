// Script to seed shop items in Firestore
// Run this in your browser console or create a temporary page to execute it

import { getFirestore } from 'firebase/firestore';
import { seedShopItems } from '@/firebase';

// Your shop items with Firestore Storage URLs
const shopItems = [
  {
    id: "plushie",
    name: "Cute Plushie", 
    price: 100,
    imageUrl: "https://firebasestorage.googleapis.com/v0/b/studio-8158823289-aa6bd.firebasestorage.app/o/shop%2Fplushie.png?alt=media&token=59ea1046-e3f1-4538-a0d0-0ef1652454c5"
  },
  {
    id: "lamp",
    name: "Heart Lamp",
    price: 150, 
    imageUrl: "https://firebasestorage.googleapis.com/v0/b/studio-8158823289-aa6bd.firebasestorage.app/o/shop%2Flamp.png?alt=media&token=64b08ed5-24b7-4630-be86-531080e6390a"
  },
  {
    id: "plant",
    name: "Potted Plant",
    price: 75,
    imageUrl: "https://firebasestorage.googleapis.com/v0/b/studio-8158823289-aa6bd.firebasestorage.app/o/shop%2Fplant.png?alt=media&token=dd5cf497-c64b-4e34-8fa8-6a33381c68b0"
  },
  {
    id: "rug", 
    name: "Heart Rug",
    price: 200,
    imageUrl: "https://firebasestorage.googleapis.com/v0/b/studio-8158823289-aa6bd.firebasestorage.app/o/shop%2Frug.png?alt=media&token=cb093ea0-e87e-4fdb-84af-e41e8b6abf4d"
  }
];

// To run this script:
// 1. Replace YOUR_PROJECT_ID with your actual Firebase project ID
// 2. Make sure your images are uploaded to Firebase Storage in the /shop/ folder
// 3. Run: seedShopItems(getFirestore(), shopItems)

export { shopItems };
