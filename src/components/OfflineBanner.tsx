import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  onSync?: () => void;
}

export default function OfflineBanner({ isOnline, pendingCount, isSyncing, onSync }: Props) {
  if (isOnline && pendingCount === 0) return null;

  if (!isOnline) {
    return (
      <View style={styles.offlineBanner}>
        <Ionicons name="cloud-offline-outline" size={15} color="#fff" />
        <Text style={styles.offlineText}>Sin conexión · los cambios se guardan localmente</Text>
        {pendingCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeTxt}>{pendingCount}</Text>
          </View>
        )}
      </View>
    );
  }

  // Online pero hay pendientes — mostrar banner de sincronización
  return (
    <TouchableOpacity style={styles.syncBanner} onPress={onSync} disabled={isSyncing} activeOpacity={0.8}>
      {isSyncing ? (
        <>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.syncText}>Sincronizando {pendingCount} cambio{pendingCount !== 1 ? 's' : ''}...</Text>
        </>
      ) : (
        <>
          <Ionicons name="sync-outline" size={15} color="#fff" />
          <Text style={styles.syncText}>{pendingCount} cambio{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''} · Toca para sincronizar</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  offlineBanner: {
    backgroundColor: '#64748B',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 7,
  },
  offlineText: { color: '#fff', fontSize: 12, fontWeight: '600', flex: 1 },
  badge: {
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeTxt: { color: '#fff', fontSize: 11, fontWeight: '800' },
  syncBanner: {
    backgroundColor: '#0EA5E9',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 7,
  },
  syncText: { color: '#fff', fontSize: 12, fontWeight: '600', flex: 1 },
});
