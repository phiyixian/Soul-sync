import { PlaceHolderImages } from "./placeholder-images";
import type { ImagePlaceholder } from "./placeholder-images";

export type Status = {
  id: "idle" | "sleeping" | "eating" | "studying" | "showering";
  label: string;
  image: ImagePlaceholder;
  description: string;
};

export const statuses: Status[] = [
  { id: "idle", label: "Chilling", image: PlaceHolderImages.find(img => img.id === "avatar-idle")!, description: "is just chilling right now!" },
  { id: "sleeping", label: "Sleeping", image: PlaceHolderImages.find(img => img.id === "avatar-sleeping")!, description: "is fast asleep. Shhh!" },
  { id: "eating", label: "Eating", image: PlaceHolderImages.find(img => img.id === "avatar-eating")!, description: "is enjoying a tasty meal." },
  { id: "studying", label: "Studying", image: PlaceHolderImages.find(img => img.id === "avatar-studying")!, description: "is hitting the books." },
  { id: "showering", label: "Showering", image: PlaceHolderImages.find(img => img.id === "avatar-showering")!, description: "is taking a shower." },
];

export type ShopItem = {
  id: string;
  name: string;
  price: number;
  image: ImagePlaceholder;
};

export const shopItems: ShopItem[] = [
  { id: "plushie", name: "Cute Plushie", price: 100, image: PlaceHolderImages.find(img => img.id === "shop-plushie")! },
  { id: "lamp", name: "Heart Lamp", price: 150, image: PlaceHolderImages.find(img => img.id === "shop-lamp")! },
  { id: "plant", name: "Potted Plant", price: 75, image: PlaceHolderImages.find(img => img.id === "shop-plant")! },
  { id: "rug", name: "Heart Rug", price: 200, image: PlaceHolderImages.find(img => img.id === "shop-rug")! },
];

export type AvatarOption = {
    id: string;
    image: ImagePlaceholder;
}

export const avatarOptions = {
    hair: [
        { id: "hair-1", image: PlaceHolderImages.find(img => img.id === "hair-1")! },
        { id: "hair-2", image: PlaceHolderImages.find(img => img.id === "hair-2")! },
    ],
    eyes: [
        { id: "eyes-1", image: PlaceHolderImages.find(img => img.id === "eyes-1")! },
        { id: "eyes-2", image: PlaceHolderImages.find(img => img.id === "eyes-2")! },
    ],
    clothes: [
        { id: "clothes-1", image: PlaceHolderImages.find(img => img.id === "clothes-1")! },
        { id: "clothes-2", image: PlaceHolderImages.find(img => img.id === "clothes-2")! },
    ]
}
