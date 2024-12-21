import { Stack } from 'expo-router';

export default function PaperLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: false,
          presentation: 'modal',
          animation: 'fade',
        }}
      />
    </Stack>
  );
} 