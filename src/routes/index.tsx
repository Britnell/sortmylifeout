import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <p className="x">asdasd</p>
      <Link to="/login">Login</Link>
    </main>
  )
}
