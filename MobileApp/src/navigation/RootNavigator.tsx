import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '../context/AuthContext';
import { COLORS } from '../theme/colors';

import LoginScreen               from '../screens/auth/LoginScreen';
import RegisterScreen            from '../screens/auth/RegisterScreen';
import RoleSelectScreen          from '../screens/auth/RoleSelectScreen';
import RoleChooserScreen         from '../screens/auth/RoleChooserScreen';
import CreatorRegistrationScreen from '../screens/creator/CreatorRegistrationScreen';
import CreatorDashboardScreen    from '../screens/creator/CreatorDashboardScreen';
import CreatorDealsScreen        from '../screens/creator/CreatorDealsScreen';
import VendorRegistrationScreen  from '../screens/vendor/VendorRegistrationScreen';
import BrowseCreatorsScreen      from '../screens/vendor/BrowseCreatorsScreen';
import CreatorDetailScreen       from '../screens/vendor/CreatorDetailScreen';
import SendProposalScreen        from '../screens/vendor/SendProposalScreen';
import VendorDealsScreen         from '../screens/vendor/VendorDealsScreen';

// ── Param types ────────────────────────────────────────────────────────────────

export type AuthStackParams = {
  Login: undefined;
  Register: undefined;
};

export type SetupStackParams = {
  RoleSelect: undefined;
  CreatorRegistration: undefined;
  VendorRegistration: undefined;
};

export type CreatorTabParams = {
  Dashboard: undefined;
  CreatorDeals: undefined;
};

export type VendorStackParams = {
  VendorTabs: undefined;
  CreatorDetail: { creatorId: string };
  SendProposal: { creatorId: string; creatorName: string };
};

export type VendorTabParams = {
  Browse: undefined;
  VendorDeals: undefined;
};

// ── Navigator instances ────────────────────────────────────────────────────────

const AuthStack    = createNativeStackNavigator<AuthStackParams>();
const SetupStack   = createNativeStackNavigator<SetupStackParams>();
const ChooserStack = createNativeStackNavigator();
const CreatorTab   = createBottomTabNavigator<CreatorTabParams>();
const VendorStack  = createNativeStackNavigator<VendorStackParams>();
const VendorTab    = createBottomTabNavigator<VendorTabParams>();

const TAB_OPTIONS = {
  headerShown: false,
  tabBarActiveTintColor: COLORS.primary,
  tabBarInactiveTintColor: COLORS.textMuted,
  tabBarStyle: { borderTopColor: COLORS.border, backgroundColor: COLORS.white },
  tabBarLabelStyle: { fontSize: 12, fontWeight: '600' as const },
};

const SETUP_HEADER = {
  headerStyle: { backgroundColor: COLORS.white },
  headerShadowVisible: false,
  headerTintColor: COLORS.primary,
  headerBackTitle: 'Back',
};

// ── Auth ───────────────────────────────────────────────────────────────────────

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login"    component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

// ── Role chooser (shown on every login when profiles exist) ───────────────────

function RoleChooserNavigator() {
  return (
    <ChooserStack.Navigator screenOptions={{ headerShown: false }}>
      <ChooserStack.Screen name="RoleChooser" component={RoleChooserScreen} />
    </ChooserStack.Navigator>
  );
}

// ── Setup (new user or registering a second role) ─────────────────────────────

function SetupNavigator() {
  const { user } = useAuth();
  const initialRoute: keyof SetupStackParams =
    user?.role === 'creator' ? 'CreatorRegistration' :
    user?.role === 'vendor'  ? 'VendorRegistration'  : 'RoleSelect';

  return (
    <SetupStack.Navigator initialRouteName={initialRoute}>
      <SetupStack.Screen name="RoleSelect"          component={RoleSelectScreen}         options={{ headerShown: false }} />
      <SetupStack.Screen name="CreatorRegistration" component={CreatorRegistrationScreen} options={{ ...SETUP_HEADER, title: 'Creator Setup' }} />
      <SetupStack.Screen name="VendorRegistration"  component={VendorRegistrationScreen}  options={{ ...SETUP_HEADER, title: 'Brand Setup' }} />
    </SetupStack.Navigator>
  );
}

// ── Creator app — isolated, vendor screens are unreachable ────────────────────

function CreatorAppNavigator() {
  return (
    <CreatorTab.Navigator screenOptions={TAB_OPTIONS}>
      <CreatorTab.Screen name="Dashboard"    component={CreatorDashboardScreen} options={{ tabBarLabel: 'Dashboard' }} />
      <CreatorTab.Screen name="CreatorDeals" component={CreatorDealsScreen}     options={{ tabBarLabel: 'Deals' }} />
    </CreatorTab.Navigator>
  );
}

// ── Vendor app — isolated, creator management is unreachable ──────────────────

function VendorTabNavigator() {
  return (
    <VendorTab.Navigator screenOptions={TAB_OPTIONS}>
      <VendorTab.Screen name="Browse"      component={BrowseCreatorsScreen} options={{ tabBarLabel: 'Browse' }} />
      <VendorTab.Screen name="VendorDeals" component={VendorDealsScreen}    options={{ tabBarLabel: 'Deals' }} />
    </VendorTab.Navigator>
  );
}

function VendorNavigator() {
  return (
    <VendorStack.Navigator screenOptions={{ headerShown: false }}>
      <VendorStack.Screen name="VendorTabs"   component={VendorTabNavigator} />
      <VendorStack.Screen name="CreatorDetail" component={CreatorDetailScreen}
        options={{ headerShown: true, title: 'Creator Profile', headerTintColor: COLORS.primary, headerBackTitle: 'Back', headerStyle: { backgroundColor: COLORS.white }, headerShadowVisible: false }} />
      <VendorStack.Screen name="SendProposal"  component={SendProposalScreen}
        options={{ headerShown: true, title: 'Send Proposal',   headerTintColor: COLORS.primary, headerBackTitle: 'Back', headerStyle: { backgroundColor: COLORS.white }, headerShadowVisible: false }} />
    </VendorStack.Navigator>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────────
//
//  No user                                 → AuthNavigator
//  User, has profiles, no role chosen      → RoleChooserNavigator  ← every login
//  User, no profiles / completing setup    → SetupNavigator
//  User, role = creator, profile done      → CreatorAppNavigator   (vendor unreachable)
//  User, role = vendor,  profile done      → VendorNavigator       (creator unreachable)

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const hasAnyProfile = !!(user?.creatorProfileId || user?.vendorProfileId);

  return (
    <NavigationContainer>
      {!user ? (
        <AuthNavigator />
      ) : hasAnyProfile && !user.role ? (
        // Has existing profile(s) but no active role for this session
        <RoleChooserNavigator />
      ) : !user.profileCompleted ? (
        // Brand new user or adding a second role
        <SetupNavigator />
      ) : user.role === 'creator' ? (
        <CreatorAppNavigator />
      ) : (
        <VendorNavigator />
      )}
    </NavigationContainer>
  );
}
