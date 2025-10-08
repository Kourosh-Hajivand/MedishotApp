import React from 'react';
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import {BackButton} from '../components';
import {AddPatientFormScreen} from '../screens/AddPatientFormScreen';
import {AddPatientPhotoScreen} from '../screens/AddPatientPhotoScreen';
import {AddPatientReviewScreen} from '../screens/AddPatientReviewScreen';

export type AddPatientStackParamList = {
  AddPatientForm: undefined;
  AddPatientPhoto: {
    patientData: {
      firstName: string;
      lastName: string;
      phone: string;
      age: string;
      notes?: string;
    };
  };
  AddPatientReview: {
    patientData: {
      firstName: string;
      lastName: string;
      phone: string;
      age: string;
      notes?: string;
    };
    photoUri?: string;
  };
};

const Stack = createNativeStackNavigator<AddPatientStackParamList>();

export const AddPatientModalNavigator: React.FC = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="AddPatientForm"
        component={AddPatientFormScreen}
        options={({navigation}) => ({
          headerTitle: 'Add New Patient',
          headerLeft: () =>
            navigation.canGoBack() ? (
              <BackButton onPress={() => navigation.goBack()} />
            ) : null,
        })}
      />
      <Stack.Screen
        name="AddPatientPhoto"
        component={AddPatientPhotoScreen}
        options={({navigation}) => ({
          headerTitle: 'Add Photo',
          headerLeft: () =>
            navigation.canGoBack() ? (
              <BackButton onPress={() => navigation.goBack()} />
            ) : null,
        })}
      />
      <Stack.Screen
        name="AddPatientReview"
        component={AddPatientReviewScreen}
        options={({navigation}) => ({
          headerTitle: 'Review Patient',
          headerLeft: () =>
            navigation.canGoBack() ? (
              <BackButton onPress={() => navigation.goBack()} />
            ) : null,
        })}
      />
    </Stack.Navigator>
  );
};

AddPatientModalNavigator.displayName = 'AddPatientModalNavigator';
