// This file is a fallback for using MaterialIcons on Android and web.

import { SFSymbol } from 'expo-font/build/SFSymbol';

interface IconSymbolProps {
  name: string;
  size?: number;
  color?: string;
}

export function IconSymbol({ name, size = 24, color = '#000' }: IconSymbolProps) {
  return <SFSymbol name={name} size={size} color={color} />;
}
