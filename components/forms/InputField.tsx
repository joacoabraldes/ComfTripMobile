import React, { forwardRef } from 'react';
import {TextInput, View, TextInputProps, Platform, StyleSheet, TouchableOpacity, Text} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppColors } from '@/hooks/useAppColors';

interface InputFieldProps extends TextInputProps {
  containerStyle?: any;
  showPasswordToggle?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
    messageError?: any;
}

const InputField = forwardRef<TextInput, InputFieldProps>(
  ({ containerStyle, showPasswordToggle, showPassword, onTogglePassword, messageError, style, ...props }, ref) => {
    const AppColors = useAppColors();
    const styles = getStyles(AppColors);
    
    return (
        <View>
      <View style={[styles.inputBox, containerStyle]}>
        <TextInput
          ref={ref}
          style={[styles.textInput, showPasswordToggle && styles.textInputWithToggle, style]}
          placeholderTextColor={AppColors.textMuted}
          secureTextEntry={showPasswordToggle && !showPassword}
          {...props}
        />
        {showPasswordToggle && (
          <TouchableOpacity
            onPress={onTogglePassword}
            style={styles.eyeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={AppColors.primary}
            />
          </TouchableOpacity>
        )}
      </View>{messageError && (
            <Text style={styles.errorText}>{messageError}</Text>
        )}
            </View>
    );
  }
);

InputField.displayName = 'InputField';

const getStyles = (AppColors: ReturnType<typeof useAppColors>) => StyleSheet.create({
  inputBox: {
    width: '100%',
    backgroundColor: AppColors.backgroundInputMuted,
    borderRadius: 10,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  textInput: {
    fontSize: 16,
    lineHeight: 20,
    color: AppColors.text,
    paddingHorizontal: 22,
    paddingVertical: 0,
    height: '100%',
    textAlignVertical: Platform.OS === 'android' ? 'center' : 'auto',
    minHeight: 24,
  },
  textInputWithToggle: {
    paddingRight: 60,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    height: '100%',
    justifyContent: 'center',
  },
    errorText: {
        color: AppColors.error,
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
    },
});

export default InputField;

