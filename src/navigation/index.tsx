import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StackActions } from '@react-navigation/native';
import { Text, TouchableOpacity, View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../features/auth/hooks/useAuth';
import { LoginScreen } from '../features/auth/screens/LoginScreen';
import { RegisterScreen } from '../features/auth/screens/RegisterScreen';
import { VerifyEmailScreen } from '../features/auth/screens/VerifyEmailScreen';
import { HomeScreen } from '../features/inventory/screens/HomeScreen';
import { ScannerScreen } from '../features/scanner/screens/ScannerScreen';
import { InventoryListScreen } from '../features/inventory/screens/InventoryListScreen';
import { ItemDetailScreen } from '../features/inventory/screens/ItemDetailScreen';
import { AddItemScreen } from '../features/inventory/screens/AddItemScreen';
import { SettingsScreen } from '../features/support/screens/SettingsScreen';
import { Colors, FontSize } from '../shared/theme';
import {
  AuthStackParamList, MainTabParamList,
  InventoryStackParamList, RootStackParamList,
} from '../types';
import { requestNotificationPermission } from '../features/notifications/hooks/useNotifications';
import { useInventory } from '../features/inventory/hooks/useInventory';
import { useTranslation } from '../i18n';
import { checkForceUpdate } from '../services/version/forceUpdate';
import { initAds, preloadInterstitial } from '../services/ads/adService';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const InventoryStack = createNativeStackNavigator<InventoryStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
    </AuthStack.Navigator>
  );
}

function InventoryNavigator() {
  const { t } = useTranslation();
  const { canAddItem } = useInventory();

  function handleAddPress(navigation: any) {
    if (!canAddItem()) {
      Alert.alert(t('addItem.limitTitle'), t('addItem.limitMsg'), [
        { text: t('addItem.limitCancel'), style: 'cancel' },
      ]);
      return;
    }
    navigation.navigate('AddItem', {});
  }

  return (
    <InventoryStack.Navigator>
      <InventoryStack.Screen
        name="InventoryList"
        component={InventoryListScreen}
        options={({ navigation }) => ({
          title: t('nav.allItems'),
          headerRight: () => (
            <TouchableOpacity onPress={() => handleAddPress(navigation)}>
              <Text style={{ color: Colors.primary, fontSize: FontSize.xl, marginRight: 8 }}>＋</Text>
            </TouchableOpacity>
          ),
        })}
      />
      <InventoryStack.Screen name="ItemDetail" component={ItemDetailScreen} options={{ title: '' }} />
      <InventoryStack.Screen
        name="AddItem"
        component={AddItemScreen}
        options={({ navigation }) => ({
          title: t('nav.addItem'),
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 4 }}>
              <Text style={{ color: Colors.primary, fontSize: FontSize.md }}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          ),
        })}
      />
      <InventoryStack.Screen name="EditItem" component={AddItemScreen as any} options={{ title: t('nav.editItem') }} />
    </InventoryStack.Navigator>
  );
}

function MainTabNavigator() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarStyle: { paddingBottom: 16, height: 76 },
        tabBarLabelStyle: { fontSize: 11 },
        tabBarIcon: ({ focused, color }) => {
          const icons: Record<string, string> = {
            Home: '🏠', Scanner: '📷', Inventory: '📋', Settings: '⚙️',
          };
          return <Text style={{ fontSize: focused ? 24 : 20 }}>{icons[route.name]}</Text>;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('nav.home'), headerShown: false }} />
      <Tab.Screen name="Scanner" component={ScannerScreen} options={{ title: t('nav.scanner'), headerShown: false }} />
      <Tab.Screen
        name="Inventory"
        component={InventoryNavigator}
        options={{ title: t('nav.inventory'), headerShown: false }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            const state = navigation.getState();
            const inventoryRoute = state.routes.find((r: any) => r.name === 'Inventory');
            if (inventoryRoute?.state && inventoryRoute.state.index > 0) {
              e.preventDefault();
              navigation.dispatch({
                ...StackActions.popToTop(),
                target: inventoryRoute.state.key,
              });
            }
          },
        })}
      />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: t('nav.settings') }} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { user, initialized, initialize } = useAuth();

  useEffect(() => {
    const unsubscribe = initialize();
    requestNotificationPermission();
    checkForceUpdate();
    // 初始化廣告 SDK，並預載插頁廣告
    initAds().then(() => preloadInterstitial());
    return unsubscribe;
  }, []);

  if (!initialized) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingEmoji}>🏠</Text>
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 16 }} />
      </View>
    );
  }

  const isVerified = !user || user.emailVerified;

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {user && isVerified ? (
          <RootStack.Screen name="Main" component={MainTabNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingEmoji: { fontSize: 64 },
});
