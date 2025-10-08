import React from 'react';
import {TouchableOpacity, View, StyleSheet} from 'react-native';
import {PlusIcon} from '../../../assets/icons';
import colors from '../../../theme/colors.shared.js';

interface FloatingActionButtonProps {
  onPress: () => void;
  size?: number;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPress,
  size = 56,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, {width: size, height: size, marginLeft: -size / 2}]}
      className="absolute bottom-24 left-1/2 bg-blue-500 rounded-full shadow-lg">
      <View style={styles.content} className="flex-1 items-center justify-center">
        <PlusIcon width={24} height={24} fill="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 96,
    alignSelf: 'center',
    backgroundColor: colors.primary[500],
    borderRadius: 999,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
