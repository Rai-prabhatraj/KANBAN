"use client"

import type React from "react"

import { Calendar, CheckSquare, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Task } from "@/types/kanban"
import { formatDate } from "@/lib/utils"

interface TaskCardProps {
  task: Task
  onClick: () => void
  onDuplicate: () => void
}

export default function TaskCard({ task, onClick, onDuplicate }: TaskCardProps) {
  const completedSubtasks = task.subtasks.filter((subtask) => subtask.completed).length
  const totalSubtasks = task.subtasks.length

  // Determine if task is overdue
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "Completed"

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDuplicate()
  }

  return (
    <div
      className="kanban-card p-4 rounded-xl cursor-pointer group hover:scale-[1.02] transition-all duration-200"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-3">
        <h4 className="font-semibold text-foreground text-sm leading-tight pr-2">{task.title}</h4>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-primary/10 shrink-0"
          onClick={handleDuplicate}
          title="Duplicate task"
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">{task.description}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {task.dueDate && (
          <div
            className={`flex items-center text-xs px-2.5 py-1.5 rounded-lg font-medium ${
              isOverdue 
                ? "text-destructive bg-destructive/10 border border-destructive/20" 
                : "text-muted-foreground bg-muted/50"
            }`}
          >
            <Calendar className="h-3 w-3 mr-1.5" />
            {formatDate(task.dueDate)}
          </div>
        )}

        {totalSubtasks > 0 && (
          <div className="flex items-center text-xs text-muted-foreground bg-muted/50 px-2.5 py-1.5 rounded-lg font-medium">
            <CheckSquare className="h-3 w-3 mr-1.5" />
            {completedSubtasks}/{totalSubtasks}
          </div>
        )}

        {task.customFields.map(
          (field) =>
            field.value && (
              <div
                key={field.id}
                className="text-xs text-muted-foreground bg-muted/50 px-2.5 py-1.5 rounded-lg font-medium"
              >
                {field.name}:{" "}
                {field.value.toString().length > 12
                  ? field.value.toString().substring(0, 12) + "..."
                  : field.value.toString()}
              </div>
            ),
        )}
      </div>
    </div>
  )
}
