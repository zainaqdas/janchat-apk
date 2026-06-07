import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import { useAuth } from '../contexts/AuthContext'
import { saveSubscription } from '../services/pushNotifications'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export function usePushNotifications() {
  const { user } = useAuth()
  const registered = useRef(false)

  useEffect(() => {
    if (!user || registered.current) return

    let cancelled = false

    async function setup() {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync()
        let finalStatus = existingStatus

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync()
          finalStatus = status
        }

        if (finalStatus !== 'granted') {
          console.log('Push notification permission not granted')
          return
        }

        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: undefined,
        })

        if (cancelled || !tokenData.data) return

        // Save the Expo push token to Supabase
        await saveSubscription(user.id, { endpoint: tokenData.data })

        registered.current = true
      } catch (err: any) {
        // Firebase not configured is expected in dev builds - not a real error
        if (err?.message?.includes('Firebase') || err?.message?.includes('googleServicesFile')) {
          console.log('Push notifications: Firebase FCM not configured (expected in dev builds). Configure google-services.json for push on production APKs.')
        } else {
          console.error('Push notification setup failed:', err)
        }
      }
    }

    setup()

    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      registered.current = false
    }
  }, [user])

  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#030712',
      }).catch(console.error)
    }
  }, [])
}
