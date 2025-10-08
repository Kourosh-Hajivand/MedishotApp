import React from 'react';
import {View, ScrollView, TouchableOpacity, StyleSheet} from 'react-native';
import {BaseText} from '../components';
import {SafeAreaView} from 'react-native-safe-area-context';
import {spacing} from '../styles/spaces';
import colors from '../theme/colors.shared.js';

export const AlbumScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container} className="flex-1 bg-white">
      <View style={styles.content} className="flex-1 px-4">
        <View style={styles.header} className="py-4">
          <BaseText type="LargeTitle" weight={700} color="labels.primary">
            Album
          </BaseText>
        </View>

        <ScrollView
          style={styles.scrollView}
          className="flex-1"
          showsVerticalScrollIndicator={false}></ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing['4'],
  },
  header: {
    paddingVertical: spacing['4'],
  },
  scrollView: {
    flex: 1,
  },
});
