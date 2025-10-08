import React from 'react';
import {Text, TextProps, StyleSheet, TextStyle} from 'react-native';
import {colors} from '../../theme/colors';

export type TextType =
  | 'LargeTitle'
  | 'Title1'
  | 'Title2'
  | 'Title3'
  | 'Headline'
  | 'Body'
  | 'Callout'
  | 'Subhead'
  | 'Footnote'
  | 'Caption1'
  | 'Caption2';

export type TextColor =
  | 'labels.primary'
  | 'labels.secondary'
  | 'labels.tertiary'
  | 'labels.quaternary'
  | 'text'
  | 'text-secondary'
  | 'system.red'
  | 'system.green'
  | 'system.blue'
  | 'system.black'
  | 'system.gray'
  | 'system.white';

export interface IBaseTextProps extends TextProps {
  type?: TextType;
  color?: TextColor;
  weight?: TextStyle['fontWeight'];
  align?: TextStyle['textAlign'];
  children: React.ReactNode;
}

export const typeStyles: Record<
  TextType,
  {fontSize: number; lineHeight: number; fontWeight: TextStyle['fontWeight']}
> = {
  LargeTitle: {fontSize: 34, lineHeight: 41, fontWeight: 'bold'},
  Title1: {fontSize: 28, lineHeight: 34, fontWeight: '600'},
  Title2: {fontSize: 22, lineHeight: 28, fontWeight: '600'},
  Title3: {fontSize: 20, lineHeight: 25, fontWeight: '600'},
  Headline: {fontSize: 17, lineHeight: 22, fontWeight: '600'},
  Body: {fontSize: 17, lineHeight: 22, fontWeight: '400'},
  Callout: {fontSize: 16, lineHeight: 21, fontWeight: '400'},
  Subhead: {fontSize: 15, lineHeight: 20, fontWeight: '400'},
  Footnote: {fontSize: 13, lineHeight: 18, fontWeight: '400'},
  Caption1: {fontSize: 12, lineHeight: 16, fontWeight: '400'},
  Caption2: {fontSize: 11, lineHeight: 13, fontWeight: '400'},
};

export function BaseText({
  type = 'Body',
  color = 'text',
  weight,
  align = 'left',
  style,
  children,
  ...rest
}: IBaseTextProps) {
  const baseStyle = typeStyles[type];

  // handle dot notation in color like "labels.primary"
  const resolvedColor =
    color.split('.').reduce((acc: any, key: string) => acc?.[key], colors) ||
    colors.text;

  return (
    <Text
      style={[
        styles.baseText,
        {
          fontSize: baseStyle.fontSize,
          lineHeight: baseStyle.lineHeight,
          fontWeight: weight || baseStyle.fontWeight,
          color: resolvedColor,
          textAlign: align,
        },
        style,
      ]}
      {...rest}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  baseText: {
    // Base text styles can be added here if needed
  },
});
