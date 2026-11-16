import React from 'react';
import {
  Target,
  Plane,
  Smartphone,
  Car,
  Home,
  ShoppingBag,
  Heart,
  GraduationCap,
} from 'lucide-react';

export const GOAL_ICON_OPTIONS = [
  { id: 'target', label: 'Umum', icon: Target },
  { id: 'plane', label: 'Liburan', icon: Plane },
  { id: 'smartphone', label: 'Gadget/HP', icon: Smartphone },
  { id: 'car', label: 'Kendaraan', icon: Car },
  { id: 'home', label: 'Rumah', icon: Home },
  { id: 'shopping-bag', label: 'Belanja', icon: ShoppingBag },
  { id: 'heart', label: 'Acara/Nikah', icon: Heart },
  { id: 'graduation-cap', label: 'Pendidikan', icon: GraduationCap },
];

export default function GoalIcon({ name = 'target', className = 'w-5 h-5' }) {
  const match = GOAL_ICON_OPTIONS.find((item) => item.id === name);
  const IconComp = match ? match.icon : Target;
  return <IconComp className={className} />;
}
