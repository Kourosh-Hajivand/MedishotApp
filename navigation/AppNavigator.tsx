import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {MainScreen} from '../screens/MainScreen';
import {
  AuthFlowModalNavigator,
  AuthFlowStackParamList,
} from './AuthFlowModalNavigator';
import {
  AddPatientModalNavigator,
  AddPatientStackParamList,
} from './AddPatientModalNavigator';
import {WelcomeScreen} from '../screens/WelcomeScreen';
import {useAuth} from '../utils/hook/useAuth';
import {navigationRef} from './navigationRef';

export type RootStackParamList = {
  Welcome: undefined;
  Main: undefined;
  AuthFlowModal: {
    screen: keyof AuthFlowStackParamList;
  };
  AddPatientModal: {
    screen: keyof AddPatientStackParamList;
  };
};

const RootStack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const {isAuthenticated} = useAuth();

  if (isAuthenticated === null) return null;

  return (
    <NavigationContainer ref={navigationRef}>
      <RootStack.Navigator screenOptions={{headerShown: false}}>
        <RootStack.Group>
          {!isAuthenticated ? (
            <RootStack.Screen name="Welcome" component={WelcomeScreen} />
          ) : (
            <RootStack.Screen name="Main" component={MainScreen} />
          )}
        </RootStack.Group>

        <RootStack.Group
          screenOptions={{presentation: 'modal', gestureEnabled: false}}>
          <RootStack.Screen
            name="AuthFlowModal"
            component={AuthFlowModalNavigator}
          />
          <RootStack.Screen
            name="AddPatientModal"
            component={AddPatientModalNavigator}
          />
        </RootStack.Group>
      </RootStack.Navigator>
    </NavigationContainer>
  );
};
