import React from 'react';
import {TouchableOpacity, View, StyleProp, ViewStyle, StyleSheet} from 'react-native';
import {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {BaseText} from '../text/BaseText';
import {GalleryWideIcon, MenuIcon, PlusBoldIcon} from '../../assets/icons';
import BaseButton from '../button/BaseButton';
import colors from '../../theme/colors';
import {spacing} from '../../styles/spaces';

interface CustomTabBarProps extends BottomTabBarProps {
  onAddPress?: () => void;
}

const CustomTabBar: React.FC<CustomTabBarProps> = ({
  state,
  descriptors,
  navigation,
  onAddPress,
}) => {
  const insets = useSafeAreaInsets();

  const focusedRoute = state.routes[state.index];
  const focusedDescriptor = descriptors[focusedRoute.key];
  const tabBarStyle = focusedDescriptor.options.tabBarStyle as
    | StyleProp<ViewStyle>
    | undefined;

  return (
    <View
      style={[
        styles.container,
        tabBarStyle,
        {
          bottom: insets.bottom + 12,
        },
      ]}
      className="border border-system-gray5 px-4 py-2 rounded-full bg-white ">
      <View style={styles.tabContainer} className="flex-row items-center gap-1">
        {state.routes.map((route, index) => {
          const {options} = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };
          const tabIcons: Record<string, React.ReactElement> = {
            Patients: (
              <MenuIcon
                width={20}
                height={20}
                color={isFocused ? colors.system.blue : colors.labels.secondary}
                strokeWidth={0}
              />
            ),
            Album: (
              <GalleryWideIcon
                width={20}
                height={20}
                color={isFocused ? colors.system.blue : colors.labels.secondary}
                strokeWidth={0}
              />
            ),
          };
          const iconElement = tabIcons[route.name] || (
            <GalleryWideIcon width={20} height={20} strokeWidth={0} />
          );

          return (
            <TouchableOpacity style={styles.tabButton} onPress={onPress} key={index}>
              <View style={styles.tabContent} className="items-center justify-center gap-1">
                {iconElement}
                <BaseText
                  color={isFocused ? 'system.blue' : 'labels.secondary'}
                  type="Caption1">
                  {label}
                </BaseText>
              </View>
            </TouchableOpacity>
          );
        })}

        <BaseButton
          size="Large"
          ButtonStyle="Filled"
          rounded
          style={styles.addButton}
          className="ml-3"
          onPress={onAddPress}
          label="Add Patient"
          leftIcon={
            <PlusBoldIcon
              width={16}
              height={16}
              fill="#FFFFFF"
              strokeWidth={0}
            />
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.system.gray5,
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['2'],
    borderRadius: 999,
    backgroundColor: colors.background,
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['1'],
  },
  tabButton: {
    width: 80,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['1'],
  },
  addButton: {
    marginLeft: spacing['3'],
  },
});

export default CustomTabBar;
