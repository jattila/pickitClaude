import { useEffect, useState } from 'react';
import { Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { signOutFully } from '../services/session';
import { ConfirmDialog } from './ConfirmDialog';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { useGroups } from '../hooks/useGroups';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { resolveCatalogPath } from '../utils/catalogPath';

const PANEL_WIDTH = Math.min(300, Dimensions.get('window').width * 0.8);

/**
 * Global slide-in navigation panel, mounted once in the root layout. Opened via
 * `HamburgerButton` (header-left on each tab screen); the bottom tab bar covers
 * the three primary destinations, this covers everything else (groups, account).
 */
export function HamburgerMenu() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const menuOpen = useUiStore((state) => state.menuOpen);
  const closeMenu = useUiStore((state) => state.closeMenu);
  const { groups } = useGroups();
  const { isConnected } = useNetworkStatus();
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  const primaryLine = user ? user.displayName || user.email || 'Fiók' : 'Vendég';
  const secondaryLine = user
    ? groups.length === 1
      ? groups[0].name
      : groups.length > 1
        ? `${groups.length} csoport tagja`
        : user.displayName
          ? user.email
          : null
    : null;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(menuOpen ? 1 : 0, { duration: 220 });
  }, [menuOpen, progress]);

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (progress.value - 1) * PANEL_WIDTH }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.4,
  }));

  const go = (path: string) => {
    closeMenu();
    router.push(path as any);
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={menuOpen ? 'auto' : 'none'}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} />
      </Animated.View>

      <Animated.View style={[styles.panel, { paddingTop: insets.top + 12, width: PANEL_WIDTH }, panelStyle]}>
        <View style={styles.header}>
          <Image source={require('../../assets/icon.png')} style={styles.logo} />
          <View style={styles.identityColumn}>
            <Text style={styles.brand}>PickIt</Text>
            <Text style={styles.identityPrimary} numberOfLines={1}>
              {primaryLine}
            </Text>
            {secondaryLine ? (
              <Text style={styles.identitySecondary} numberOfLines={1}>
                {secondaryLine}
              </Text>
            ) : null}
          </View>
          <Pressable onPress={closeMenu} hitSlop={12} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#999" />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionHeader}>Navigáció</Text>
          <MenuItem
            icon="home-outline"
            label="Áttekintés"
            active={pathname === '/'}
            onPress={() => go('/')}
          />
          <MenuItem
            icon="pricetags-outline"
            label="Katalógus"
            active={pathname.endsWith('/catalog')}
            onPress={() => go(resolveCatalogPath(pathname))}
          />
          <MenuItem
            icon="settings-outline"
            label="Beállítások"
            active={pathname === '/settings'}
            onPress={() => go('/settings')}
          />

          {user ? (
            <>
              <Text style={styles.sectionHeader}>Csoportjaim</Text>
              {groups.length === 0 ? (
                <Text style={styles.emptyText}>Még nem vagy tagja egyetlen csoportnak sem.</Text>
              ) : (
                groups.map((group) => (
                  <MenuItem
                    key={group.id}
                    icon="people-outline"
                    label={group.name}
                    onPress={() => go(`/group/${group.id}`)}
                  />
                ))
              )}
            </>
          ) : null}

          <View style={styles.divider} />

          {user ? (
            <>
              <MenuItem
                icon="log-out-outline"
                label="Kijelentkezés"
                // Offline the session is all that keeps the local Firestore
                // cache — and any writes still waiting to sync — reachable,
                // and signing back in needs a connection anyway.
                disabled={!isConnected}
                onPress={() => setConfirmingSignOut(true)}
              />
              {!isConnected ? (
                <Text style={styles.hint}>
                  Nincs internetkapcsolat — kijelentkezni csak online lehet.
                </Text>
              ) : null}
            </>
          ) : (
            <>
              <MenuItem icon="person-add-outline" label="Regisztráció" onPress={() => go('/sign-up')} />
              <MenuItem icon="log-in-outline" label="Bejelentkezés" onPress={() => go('/sign-in')} />
            </>
          )}
        </ScrollView>
      </Animated.View>

      {/* The menu deliberately stays open behind the dialog: cancelling should
          put the user back where they were, and the panel is what makes this
          whole overlay interactive. */}
      <ConfirmDialog
        visible={confirmingSignOut}
        title="Kijelentkezés"
        message="Biztosan kijelentkezel? A listáid és csoportjaid a fiókodban maradnak, de amíg vissza nem lépsz, nem éred el őket ezen a készüléken. Helyettük ennek a telefonnak a saját, különálló listája jelenik meg."
        confirmLabel="Kijelentkezés"
        destructive
        onCancel={() => setConfirmingSignOut(false)}
        onConfirm={() => {
          setConfirmingSignOut(false);
          closeMenu();
          signOutFully();
        }}
      />
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  active,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[styles.item, active && styles.itemActive, disabled && styles.itemDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons name={icon} size={20} color={active ? '#2D6FB0' : '#4A4A4A'} style={styles.itemIcon} />
      <Text style={[styles.itemLabel, active && styles.itemLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 2, height: 0 },
    elevation: 8,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  itemDisabled: {
    opacity: 0.4,
  },
  hint: {
    color: '#D9534F',
    fontSize: 12,
    paddingHorizontal: 12,
    marginTop: -4,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
    gap: 12,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  identityColumn: {
    flex: 1,
  },
  brand: {
    fontSize: 20,
    fontWeight: '700',
  },
  identityPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 2,
  },
  identitySecondary: {
    fontSize: 13,
    color: '#999',
    marginTop: 1,
  },
  closeButton: {
    padding: 2,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    paddingHorizontal: 12,
    marginTop: 16,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#AAA',
    paddingHorizontal: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  itemActive: {
    backgroundColor: '#EAF2FB',
  },
  itemIcon: {
    width: 20,
  },
  itemLabel: {
    fontSize: 15,
    color: '#222',
  },
  itemLabelActive: {
    color: '#2D6FB0',
    fontWeight: '700',
  },
});
