// import { auth } from "@/auth"
import ChatInterface from "@/components/chat-interface"

export default async function Page() {
  // const session = await auth()
  const session = { user: { name: "Guest", email: "guest@example.com", image: "" } }

  return <ChatInterface user={session?.user} />
}