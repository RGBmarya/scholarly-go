import { TouchableOpacity, Text, StyleSheet, TouchableOpacityProps } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  disabled?: boolean;
}

export default function Button({ title, disabled, style, ...props }: ButtonProps) {
  return (
    <TouchableOpacity 
      style={[styles.button, style, disabled && styles.disabled]} 
      disabled={disabled}
      {...props}
    >
      <Text style={[styles.text, disabled && styles.disabledText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#2563eb',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    backgroundColor: '#93c5fd',
  },
  disabledText: {
    color: '#e5e7eb',
  },
}); 