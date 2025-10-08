import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {PatientsScreen, AlbumScreen} from '../screens';
import CustomTabBar from '../components/navigation/CustomTabBar';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from './AppNavigator';

export type TabParamList = {
  Patients: undefined;
  Album: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

export const TabNavigator: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleAddPatient = () => {
    navigation.navigate('AddPatientModal', {screen: 'AddPatientForm'});
  };

  return (
    <Tab.Navigator
      tabBar={props => (
        <CustomTabBar {...props} onAddPress={handleAddPatient} />
      )}
      screenOptions={{
        headerShown: false,
        animation: 'shift',
      }}
      initialRouteName="Patients">
      <Tab.Screen
        name="Patients"
        component={PatientsScreen}
        options={{
          tabBarLabel: 'Patients',
        }}
      />
      <Tab.Screen
        name="Album"
        component={AlbumScreen}
        options={{
          tabBarLabel: 'Album',
        }}
      />
    </Tab.Navigator>
  );
};
