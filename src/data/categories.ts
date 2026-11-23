import { Brain, Atom, Landmark, Cpu, Palette, TrendingUp, type LucideIcon } from "lucide-react";
import psychologyImg from "@/assets/feed-psychology.jpg";
import scienceImg from "@/assets/feed-science.jpg";
import historyImg from "@/assets/feed-history.jpg";
import technologyImg from "@/assets/feed-technology.jpg";
import creativityImg from "@/assets/feed-creativity.jpg";
import businessImg from "@/assets/feed-business.jpg";

export type CategoryId =
  "psychology" | "science" | "history" | "technology" | "creativity" | "business";

export interface Category {
  id: CategoryId;
  name: string;
  realm: string;
  icon: LucideIcon;
  image: string;
  /** Player level needed to enter this realm on the World map */
  unlockLevel: number;
  blurb: string;
}

export const CATEGORIES: Category[] = [
  {
    id: "psychology",
    name: "Psychology",
    realm: "The Mindscape",
    icon: Brain,
    image: psychologyImg,
    unlockLevel: 1,
    blurb: "Biases, memory and the hidden rules of behavior.",
  },
  {
    id: "science",
    name: "Science",
    realm: "Cosmic Reach",
    icon: Atom,
    image: scienceImg,
    unlockLevel: 1,
    blurb: "From quantum weirdness to the edge of the universe.",
  },
  {
    id: "technology",
    name: "Technology",
    realm: "Circuit Spire",
    icon: Cpu,
    image: technologyImg,
    unlockLevel: 1,
    blurb: "How machines think, connect and change us.",
  },
  {
    id: "history",
    name: "History",
    realm: "Ember Ruins",
    icon: Landmark,
    image: historyImg,
    unlockLevel: 3,
    blurb: "Empires, lost inventions and turning points.",
  },
  {
    id: "creativity",
    name: "Creativity",
    realm: "Prism Tides",
    icon: Palette,
    image: creativityImg,
    unlockLevel: 4,
    blurb: "Where ideas come from, and how to have better ones.",
  },
  {
    id: "business",
    name: "Business",
    realm: "Gilded Metropolis",
    icon: TrendingUp,
    image: businessImg,
    unlockLevel: 5,
    blurb: "Pricing psychology, startup lore and strategy.",
  },
];

export function getCategory(id: CategoryId): Category {
  const c = CATEGORIES.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown category ${id}`);
  return c;
}
