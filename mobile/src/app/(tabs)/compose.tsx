import { Redirect } from 'expo-router'

// Placeholder route for the raised Compose tab; TabBar opens /compose as a modal instead.
export default function ComposeTab() {
  return <Redirect href="/compose" />
}
