import { Redirect } from 'expo-router'
import { useAuth } from '../src/contexts/AuthContext'
import { ActivityIndicator, View, StyleSheet } from 'react-native'

export default function Index() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  if (user) {
    return <Redirect href="/(tabs)/contacts" />
  }

  return <Redirect href="/(auth)/login" />
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#030712',
  },
})
