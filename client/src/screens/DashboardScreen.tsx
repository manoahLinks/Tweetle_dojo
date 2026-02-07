import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSession } from '../hooks/SessionContext';
import { fetchEthBalance } from '../services/balance';

function truncateAddress(address: string): string {
  if (address.length <= 14) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

export function DashboardScreen() {
  const { sessionMetadata, disconnect } = useSession();
  const [balance, setBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);

  useEffect(() => {
    if (sessionMetadata.address) {
      setBalanceLoading(true);
      fetchEthBalance(sessionMetadata.address)
        .then(setBalance)
        .catch(() => setBalance('--'))
        .finally(() => setBalanceLoading(false));
    }
  }, [sessionMetadata.address]);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Dashboard</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Username</Text>
        <Text style={styles.value}>
          {sessionMetadata.username || 'Anonymous'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Wallet Address</Text>
        <Text style={styles.value}>
          {sessionMetadata.address
            ? truncateAddress(sessionMetadata.address)
            : '--'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>ETH Balance</Text>
        {balanceLoading ? (
          <ActivityIndicator color="#538d4e" />
        ) : (
          <Text style={styles.value}>{balance} ETH</Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.disconnectButton}
        onPress={disconnect}
        activeOpacity={0.8}
      >
        <Text style={styles.disconnectText}>Disconnect</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121213',
    paddingTop: 80,
    paddingHorizontal: 24,
  },
  header: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#1a1a1b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: '#818384',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  value: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
  },
  disconnectButton: {
    marginTop: 32,
    backgroundColor: '#3a3a3c',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  disconnectText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '700',
  },
});
