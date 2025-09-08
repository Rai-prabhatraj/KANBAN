"use client"

import { useAuth } from '@/contexts/AuthContext'
import AuthContainer from '@/components/auth/AuthContainer'
import KanbanBoardFirebase from "@/components/kanban-board-firebase"

export default function Home() {
  const { currentUser } = useAuth()

  if (!currentUser) {
    return <AuthContainer />
  }

  return (
    <main className="min-h-screen kanban-board">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-purple-950/20 pointer-events-none" />
      <div className="relative z-10">
        <KanbanBoardFirebase />
      </div>
    </main>
  )
}
