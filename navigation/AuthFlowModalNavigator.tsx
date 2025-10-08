import React from 'react';
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import {LoginScreen} from '../screens/auth/LoginScreen';
import {SelectRoleScreen} from '../screens/auth/SelectRoleScreen';
import {CreatePracticeScreen} from '../screens/auth/CreatePracticeScreen';
import {SignUpScreen} from '../screens/auth/SignUpScreen';
import {TouchableOpacity, Text} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {RootStackParamList} from './AppNavigator';
import {BackButton} from '../components';
import {SpecialtyOption} from '@/utils/data/SPECIALTIES';

export type AuthFlowStackParamList = {
  SignUp: undefined;
  Login: undefined;
  SelectRole: {token: string};
  CreatePractice: {
    practiceType: SpecialtyOption;
    token: string;
  };
};

const Stack = createNativeStackNavigator<AuthFlowStackParamList>();

// const SkipButton = () => {
//   const navigation =
//     useNavigation<NativeStackNavigationProp<RootStackParamList>>();
//   return (
//     <TouchableOpacity onPress={() => navigation.navigate('Main')}>
//       <Text className="text-system-blue px-3 py-2 text-base">Skip</Text>
//     </TouchableOpacity>
//   );
// };

export const AuthFlowModalNavigator: React.FC = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={({navigation}) => ({
          headerTitle: '',
          headerLeft: () =>
            navigation.canGoBack() ? (
              <BackButton onPress={() => navigation.goBack()} />
            ) : null,
        })}
      />
      <Stack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={({navigation}) => ({
          headerTitle: '',
          headerLeft: () =>
            navigation.canGoBack() ? (
              <BackButton onPress={() => navigation.goBack()} />
            ) : null,
        })}
      />
      <Stack.Screen
        name="SelectRole"
        component={SelectRoleScreen}
        options={({navigation}) => ({
          headerTitle: '',
        })}
      />
      <Stack.Screen
        name="CreatePractice"
        component={CreatePracticeScreen}
        options={({navigation}) => ({
          headerLeft: () =>
            navigation.canGoBack() ? (
              <BackButton onPress={() => navigation.goBack()} />
            ) : null,
          headerTitle: '',
          // headerRight: () => <SkipButton />,
        })}
      />
    </Stack.Navigator>
  );
};

AuthFlowModalNavigator.displayName = 'AuthFlowModalNavigator';
