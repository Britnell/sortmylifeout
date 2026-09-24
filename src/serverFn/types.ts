export type Message = {
  id: string
  role: 'user' | 'assistant'
  text: string
}
export type Messages = Message[]
