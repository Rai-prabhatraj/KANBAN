"use client"

import { useState } from "react"
import { Droppable, Draggable } from "@hello-pangea/dnd"
import { MoreHorizontal, Plus, Trash2, Palette } from "lucide-react"
import TaskCard from "./task-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { Task, Column as ColumnType } from "@/types/kanban"
import { generateId } from "@/lib/utils"

// Add predefined colors with dark mode variants
const COLUMN_COLORS = [
  { name: "Default", value: "bg-white dark:bg-gray-800" },
  { name: "Blue", value: "bg-blue-50 dark:bg-blue-900/30" },
  { name: "Green", value: "bg-green-50 dark:bg-green-900/30" },
  { name: "Yellow", value: "bg-yellow-50 dark:bg-yellow-900/30" },
  { name: "Purple", value: "bg-purple-50 dark:bg-purple-900/30" },
  { name: "Pink", value: "bg-pink-50 dark:bg-pink-900/30" },
  { name: "Orange", value: "bg-orange-50 dark:bg-orange-900/30" },
  { name: "Cyan", value: "bg-cyan-50 dark:bg-cyan-900/30" },
]

interface ColumnProps {
  column: ColumnType
  onAddTask: (columnId: string, task: Task) => void
  onTaskClick: (task: Task) => void
  onDeleteColumn: () => void
  onUpdateColumn: (columnId: string, updates: Partial<ColumnType>) => void
  onDuplicateTask: (task: Task, columnId: string) => void
}

export default function Column({
  column,
  onAddTask,
  onTaskClick,
  onDeleteColumn,
  onUpdateColumn,
  onDuplicateTask,
}: ColumnProps) {
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskDescription, setNewTaskDescription] = useState("")

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return

    const newTask: Task = {
      id: `task-${generateId()}`,
      title: newTaskTitle,
      description: newTaskDescription,
      status: column.title,
      dueDate: null,
      subtasks: [],
      customFields: [],
      createdAt: new Date().toISOString(),
    }

    onAddTask(column.id, newTask)
    setNewTaskTitle("")
    setNewTaskDescription("")
    setIsAddingTask(false)
  }

  const handleColorChange = (color: string) => {
    onUpdateColumn(column.id, { color })
  }

  // Get header color class or default to white/dark gray
  const headerColorClass = column.color || "bg-white dark:bg-gray-800"

  return (
    <div className="shrink-0 w-80 flex flex-col kanban-column rounded-xl">
      <div className={`p-4 flex justify-between items-center border-b border-border/50 rounded-t-xl ${headerColorClass}`}>
        <h3 className="font-semibold text-sm text-foreground flex items-center">
          {column.title}
          <span className="ml-3 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
            {column.tasks.length}
          </span>
        </h3>
        <div className="flex items-center space-x-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-primary/10">
                <Palette className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Column Color</h4>
                <div className="grid grid-cols-4 gap-2">
                  {COLUMN_COLORS.map((color) => (
                    <button
                      key={color.value}
                      className={`h-8 w-full rounded-lg ${color.value} border border-border hover:scale-105 transition-transform shadow-sm`}
                      onClick={() => handleColorChange(color.value)}
                      aria-label={`Set column color to ${color.name}`}
                    />
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-destructive/10">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onDeleteColumn} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Column
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Droppable droppableId={column.id}>
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps} className="flex-1 p-4 overflow-y-auto space-y-3">
            {column.tasks.map((task, index) => (
              <Draggable key={task.id} draggableId={task.id} index={index}>
                {(provided, snapshot) => (
                  <div 
                    ref={provided.innerRef} 
                    {...provided.draggableProps} 
                    {...provided.dragHandleProps}
                    className={`transition-transform duration-200 ${snapshot.isDragging ? 'rotate-2 scale-105' : ''}`}
                  >
                    <TaskCard
                      task={task}
                      onClick={() => onTaskClick(task)}
                      onDuplicate={() => onDuplicateTask(task, column.id)}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}

            {isAddingTask ? (
              <div className="kanban-card p-4 rounded-xl">
                <Label htmlFor="task-title" className="text-sm font-medium text-foreground mb-2 block">
                  Task Title
                </Label>
                <Input
                  id="task-title"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Enter task title"
                  className="mb-3"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleAddTask()
                    } else if (e.key === 'Escape') {
                      setIsAddingTask(false)
                    }
                  }}
                />
                <Label htmlFor="task-description" className="text-sm font-medium text-foreground mb-2 block">
                  Description (optional)
                </Label>
                <Textarea
                  id="task-description"
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Enter task description"
                  className="mb-4"
                  rows={3}
                />
                <div className="flex gap-3">
                  <Button size="sm" onClick={handleAddTask} className="flex-1">
                    Add Task
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAddingTask(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full h-16 border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group"
                onClick={() => setIsAddingTask(true)}
              >
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors flex items-center justify-center">
                    <Plus className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
                    Add Task
                  </span>
                </div>
              </Button>
            )}
          </div>
        )}
      </Droppable>
    </div>
  )
}
