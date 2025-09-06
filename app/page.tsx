import KanbanBoard from "@/components/kanban-board"

export default function Home() {
  return (
    <main className="min-h-screen kanban-board">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-purple-950/20 pointer-events-none" />
      <div className="relative z-10">
        <KanbanBoard />
      </div>
    </main>
  )
}
