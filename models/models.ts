import {ImageSourcePropType, TouchableOpacityProps} from 'react-native';
import {ISizeButton, IStyleTypeButton} from './StyleModel';
import {TextInputProps} from 'react-native';
import {Control, FieldValues, Path} from 'react-hook-form';

export interface IButtonProps extends TouchableOpacityProps {
  size?: ISizeButton;
  ButtonStyle: IStyleTypeButton;
  label?: string;
  noText?: boolean;
  isLoading?: boolean;
  rounded?: boolean;
  srcLeft?: ImageSourcePropType;
  srcRight?: ImageSourcePropType;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
}

export type ISizeInput = 'Default' | 'Large';
export type ITextTypeInput = 'text' | 'number' | 'password';

export interface InputProps<T extends FieldValues> extends TextInputProps {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  PlaceHolder?: string;
  error?: string;
  disabled?: boolean;
  optional?: boolean;
  info?: string;
  type?: ITextTypeInput;
  size?: ISizeInput;
  SperatedNumber?: boolean;
  centerText?: boolean;
  haveBorder?: boolean;
  hideError?: boolean;
}
