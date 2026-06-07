import { useState, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
} from 'react-native'

interface Props {
  onSend: (text: string) => void
  onTyping?: () => void
  disabled?: boolean
}

export default function MessageInput({ onSend, onTyping, disabled }: Props) {
  const [text, setText] = useState('')
  const inputRef = useRef<TextInput>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSubmit = () => {
    if (!text.trim() || disabled) return
    onSend(text.trim())
    setText('')
    Keyboard.dismiss()
  }

  const handleChange = (value: string) => {
    setText(value)
    if (onTyping && value) {
      onTyping()
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {}, 2000)
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={text}
        onChangeText={handleChange}
        placeholder="Type a message…"
        placeholderTextColor="#6b7280"
        editable={!disabled}
        multiline
        maxLength={1000}
      />
      <TouchableOpacity
        style={[styles.sendButton, (!text.trim() || disabled) && styles.sendDisabled]}
        onPress={handleSubmit}
        disabled={!text.trim() || disabled}
      >
        <Text style={styles.sendIcon}>↑</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 16,
  },
  input: {
    flex: 1,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#ffffff',
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.5,
  },
  sendIcon: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
  },
})
