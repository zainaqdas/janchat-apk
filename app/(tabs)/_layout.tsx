import { Tabs } from 'expo-router'
import { usePushNotifications } from "../../src/hooks/usePushNotifications"
import { View, Text, StyleSheet } from 'react-native'
import { CallProvider } from '../../src/contexts/CallContext'
import { ChatProvider } from '../../src/contexts/ChatContext'
import IncomingCall from '../../src/components/call/IncomingCall'
import AudioCall from '../../src/components/call/AudioCall'
import VideoCall from '../../src/components/call/VideoCall'

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    contacts: '💬',
    'call-history': '📋',
    settings: '👤',
  }
  return (
    <View style={styles.tabIcon}>
      <Text style={[styles.tabIconText, focused && styles.tabIconFocused]}>
        {icons[name] || '●'}
      </Text>
    </View>
  )
}

export default function TabsLayout() {
  usePushNotifications()
  return (
    <CallProvider>
      <ChatProvider>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: '#111827',
              borderTopColor: '#1f2937',
              borderTopWidth: 1,
              paddingBottom: 8,
              paddingTop: 8,
              height: 60,
            },
            tabBarActiveTintColor: '#3b82f6',
            tabBarInactiveTintColor: '#6b7280',
            tabBarLabelStyle: {
              fontSize: 10,
              fontWeight: '600',
            },
          }}
        >
          <Tabs.Screen
            name="contacts"
            options={{
              title: 'Chats',
              tabBarIcon: ({ focused }) => <TabIcon name="contacts" focused={focused} />,
            }}
          />
          <Tabs.Screen
            name="call-history"
            options={{
              title: 'History',
              tabBarIcon: ({ focused }) => <TabIcon name="call-history" focused={focused} />,
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: 'Profile',
              tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} />,
            }}
          />
          <Tabs.Screen
            name="chat/[id]"
            options={{
              href: null, // hide from tab bar
            }}
          />
        </Tabs>

        {/* Call overlays (rendered above tabs) */}
        <IncomingCall />
        <AudioCall />
        <VideoCall />
      </ChatProvider>
    </CallProvider>
  )
}

const styles = StyleSheet.create({
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconText: {
    fontSize: 22,
  },
  tabIconFocused: {
    fontSize: 24,
  },
})
