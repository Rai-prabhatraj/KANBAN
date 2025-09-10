"use client"

import { useState, useEffect } from "react"
import { DragDropContext, type DropResult } from "@hello-pangea/dnd"
import { Plus, LogOut } from "lucide-react"
import Column from "./column"
import TaskDetailSidebar from "./task-detail-sidebar"
import AutomationRules from "./automation-rules"
import { ThemeToggle } from "./theme-toggle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { taskService, columnService, ruleService } from "@/lib/firestore"
import type { Task, Column as ColumnType, Rule } from "@/types/kanban"
import { generateId } from "@/lib/utils"

export default function KanbanBoardFirebase() {
  const { toast } = useToast()
  const { currentUser, logout } = useAuth()
  const [columns, setColumns] = useState<ColumnType[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [newColumnTitle, setNewColumnTitle] = useState("")
  const [isAddingColumn, setIsAddingColumn] = useState(false)
  const [rules, setRules] = useState<Rule[]>([])
  const [activeTab, setActiveTab] = useState("board")
  const [loading, setLoading] = useState(true)

  // Initialize with default columns if user has no columns
  useEffect(() => {
    if (!currentUser) return

    const initializeUserData = async () => {
      try {
        setLoading(true)
        
        // Get user's columns
        const userColumns = await columnService.getColumns(currentUser.uid)
        
        let finalColumns = []
        
        if (userColumns.length === 0) {
          // Create default columns for new user
          const defaultColumns = [
            {
              title: "To Do",
              color: "bg-blue-50 dark:bg-blue-900/30",
            },
            {
              title: "In Progress", 
              color: "bg-yellow-50 dark:bg-yellow-900/30",
            },
            {
              title: "Blocked",
              color: "bg-red-50 dark:bg-red-900/30",
            },
            {
              title: "Completed",
              color: "bg-green-50 dark:bg-green-900/30",
            },
          ]

          const createdColumns = []
          for (const column of defaultColumns) {
            const columnId = await columnService.createColumn(currentUser.uid, column)
            createdColumns.push({
              id: columnId,
              ...column,
              tasks: [],
            })
          }
          finalColumns = createdColumns
          setColumns(createdColumns)
        } else {
          // Load existing columns
          const columnsWithTasks = await Promise.all(
            userColumns.map(async (column) => {
              const tasks = await taskService.getTasks(currentUser.uid)
              const columnTasks = tasks.filter(task => task.status === column.title)
              return {
                ...column,
                tasks: columnTasks,
              }
            })
          )
          finalColumns = columnsWithTasks
          setColumns(columnsWithTasks)
        }

        // Get user's rules
        const userRules = await ruleService.getRules(currentUser.uid)
        if (userRules.length === 0) {
          // Create default rules for new user using actual column IDs
          const blockedColumn = finalColumns.find(col => col.title === "Blocked")
          const completedColumn = finalColumns.find(col => col.title === "Completed")
          
          if (blockedColumn && completedColumn) {
            const defaultRules = [
              {
                name: "Move overdue tasks to Blocked",
                condition: {
                  type: "due-date" as const,
                  operator: "is-overdue" as const,
                },
                action: {
                  type: "move-to-column" as const,
                  targetColumnId: blockedColumn.id,
                },
                enabled: true,
              },
              {
                name: "Move completed tasks when all subtasks done",
                condition: {
                  type: "subtasks-completed" as const,
                  operator: "all-completed" as const,
                },
                action: {
                  type: "move-to-column" as const,
                  targetColumnId: completedColumn.id,
                },
                enabled: true,
              },
            ]

            for (const rule of defaultRules) {
              await ruleService.createRule(currentUser.uid, rule)
            }
            setRules(defaultRules.map(rule => ({ ...rule, id: generateId() })))
          }
        } else {
          setRules(userRules)
        }
      } catch (error) {
        console.error("Error initializing user data:", error)
        toast({
          title: "Error",
          description: "Failed to load your data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    initializeUserData()
  }, [currentUser, toast])

  // Set up real-time listeners
  useEffect(() => {
    if (!currentUser) return

    let hasInitialized = false

    // Listen to tasks changes
    const unsubscribeTasks = taskService.subscribeToTasks(currentUser.uid, (tasks) => {
      setColumns(prevColumns => 
        prevColumns.map(column => ({
          ...column,
          tasks: tasks.filter(task => task.status === column.title)
        }))
      )
    }, (error) => {
      console.error("Error in tasks listener:", error)
      // If this is the first error and we haven't initialized yet, try to load data manually
      if (!hasInitialized) {
        hasInitialized = true
        // Fallback to manual data loading
        const loadDataManually = async () => {
          try {
            const userColumns = await columnService.getColumns(currentUser.uid)
            const userTasks = await taskService.getTasks(currentUser.uid)
            
            const columnsWithTasks = userColumns.map(column => ({
              ...column,
              tasks: userTasks.filter(task => task.status === column.title)
            }))
            
            setColumns(columnsWithTasks)
          } catch (fallbackError) {
            console.error("Fallback data loading also failed:", fallbackError)
          }
        }
        loadDataManually()
      }
    })

    // Listen to columns changes
    const unsubscribeColumns = columnService.subscribeToColumns(currentUser.uid, (newColumns) => {
      setColumns(prevColumns => {
        const updatedColumns = newColumns.map(column => {
          const existingColumn = prevColumns.find(col => col.id === column.id)
          return {
            ...column,
            tasks: existingColumn?.tasks || []
          }
        })
        return updatedColumns
      })
    }, (error) => {
      console.error("Error in columns listener:", error)
    })

    // Listen to rules changes
    const unsubscribeRules = ruleService.subscribeToRules(currentUser.uid, (newRules) => {
      setRules(newRules)
    }, (error) => {
      console.error("Error in rules listener:", error)
    })

    return () => {
      unsubscribeTasks()
      unsubscribeColumns()
      unsubscribeRules()
    }
  }, [currentUser])

  // Process automation rules
  useEffect(() => {
    if (rules.length === 0) return

    const enabledRules = rules.filter((rule) => rule.enabled)
    if (enabledRules.length === 0) return

    const tasksToMove: { taskId: string; sourceColumnId: string; targetColumnId: string }[] = []

    columns.forEach((column) => {
      column.tasks.forEach((task) => {
        enabledRules.forEach((rule) => {
          const { condition, action } = rule
          let conditionMet = false

          if (condition.type === "due-date" && condition.operator === "is-overdue") {
            conditionMet = Boolean(task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "Completed")
          } else if (condition.type === "subtasks-completed" && condition.operator === "all-completed") {
            conditionMet = task.subtasks.length > 0 && task.subtasks.every((subtask) => subtask.completed)
          } else if (condition.type === "custom-field" && condition.field) {
            const field = task.customFields.find((f) => f.name === condition.field)
            if (field) {
              if (condition.operator === "equals") {
                conditionMet = field.value === condition.value
              } else if (condition.operator === "not-equals") {
                conditionMet = field.value !== condition.value
              } else if (condition.operator === "contains") {
                conditionMet = field.value.includes(condition.value || "")
              }
            }
          }

          if (conditionMet && action.type === "move-to-column") {
            const targetColumn = columns.find((col) => col.id === action.targetColumnId)
            if (targetColumn && task.status !== targetColumn.title) {
              tasksToMove.push({
                taskId: task.id,
                sourceColumnId: column.id,
                targetColumnId: action.targetColumnId,
              })
            }
          }
        })
      })
    })

    // Apply the moves
    if (tasksToMove.length > 0) {
      tasksToMove.forEach(async ({ taskId, targetColumnId }) => {
        const targetColumn = columns.find((col) => col.id === targetColumnId)
        if (targetColumn) {
          try {
            await taskService.updateTask(taskId, { status: targetColumn.title })
            toast({
              title: "Task moved automatically",
              description: `Task moved to ${targetColumn.title} by automation rule`,
            })
          } catch (error) {
            console.error("Error moving task:", error)
          }
        }
      })
    }
  }, [columns, rules, toast])

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return
    }

    const sourceColumn = columns.find((col) => col.id === source.droppableId)
    const destColumn = columns.find((col) => col.id === destination.droppableId)

    if (!sourceColumn || !destColumn) return

    const task = sourceColumn.tasks.find((t) => t.id === draggableId)
    if (!task) return

    // Update local state immediately for better UX
    const updatedTask = { ...task, status: destColumn.title }
    
    setColumns(prevColumns => {
      const newColumns = [...prevColumns]
      const sourceColIndex = newColumns.findIndex((col) => col.id === source.droppableId)
      const destColIndex = newColumns.findIndex((col) => col.id === destination.droppableId)

      // Remove task from source column
      newColumns[sourceColIndex] = {
        ...sourceColumn,
        tasks: sourceColumn.tasks.filter((t) => t.id !== draggableId),
      }

      // Add task to destination column
      newColumns[destColIndex] = {
        ...destColumn,
        tasks: [
          ...destColumn.tasks.slice(0, destination.index),
          updatedTask,
          ...destColumn.tasks.slice(destination.index),
        ],
      }

      return newColumns
    })

    // Update selected task if it's the one being moved
    if (selectedTask && selectedTask.id === draggableId) {
      setSelectedTask(updatedTask)
    }

    try {
      await taskService.updateTask(task.id, { status: destColumn.title })
      
      toast({
        title: "Task moved",
        description: `"${task.title}" moved to ${destColumn.title}`,
      })
    } catch (error) {
      console.error("Error moving task:", error)
      
      // Revert local state on error
      setColumns(prevColumns => {
        const newColumns = [...prevColumns]
        const sourceColIndex = newColumns.findIndex((col) => col.id === source.droppableId)
        const destColIndex = newColumns.findIndex((col) => col.id === destination.droppableId)

        // Remove task from destination column
        newColumns[destColIndex] = {
          ...destColumn,
          tasks: destColumn.tasks.filter((t) => t.id !== draggableId),
        }

        // Add task back to source column
        newColumns[sourceColIndex] = {
          ...sourceColumn,
          tasks: [
            ...sourceColumn.tasks.slice(0, source.index),
            task,
            ...sourceColumn.tasks.slice(source.index),
          ],
        }

        return newColumns
      })

      toast({
        title: "Error",
        description: "Failed to move task. Please try again.",
        variant: "destructive",
      })
    }
  }

  const addTask = async (columnId: string, task: Task) => {
    if (!currentUser) return

    try {
      const taskId = await taskService.createTask(currentUser.uid, task)
      const newTask = { ...task, id: taskId }
      
      setColumns(prevColumns =>
        prevColumns.map((column) => {
          if (column.id === columnId) {
            return {
              ...column,
              tasks: [...column.tasks, newTask],
            }
          }
          return column
        })
      )
      
      toast({
        title: "Task created",
        description: `"${task.title}" added to ${columns.find((col) => col.id === columnId)?.title}`,
      })
    } catch (error) {
      console.error("Error creating task:", error)
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      })
    }
  }

  const updateTask = async (updatedTask: Task) => {
    try {
      await taskService.updateTask(updatedTask.id, updatedTask)
      
      setColumns(prevColumns =>
        prevColumns.map((column) => ({
          ...column,
          tasks: column.tasks.map((task) => (task.id === updatedTask.id ? updatedTask : task)),
        }))
      )
      
      setSelectedTask(updatedTask)
      toast({
        title: "Task updated",
        description: `"${updatedTask.title}" has been updated`,
      })
    } catch (error) {
      console.error("Error updating task:", error)
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      })
    }
  }

  const deleteTask = async (taskId: string) => {
    try {
      await taskService.deleteTask(taskId)
      
      setColumns(prevColumns =>
        prevColumns.map((column) => ({
          ...column,
          tasks: column.tasks.filter((task) => task.id !== taskId),
        }))
      )
      
      setSelectedTask(null)
      toast({
        title: "Task deleted",
        description: "The task has been deleted",
      })
    } catch (error) {
      console.error("Error deleting task:", error)
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      })
    }
  }

  const duplicateTask = async (task: Task, columnId?: string) => {
    if (!currentUser) return

    const duplicatedTask: Omit<Task, 'id'> = {
      ...JSON.parse(JSON.stringify(task)),
      title: `${task.title} (Copy)`,
      createdAt: new Date().toISOString(),
    }

    const targetColumnId = columnId || columns.find((col) => col.tasks.some((t) => t.id === task.id))?.id

    if (targetColumnId) {
      try {
        const newTaskId = await taskService.createTask(currentUser.uid, duplicatedTask)
        const newTask = { ...duplicatedTask, id: newTaskId }
        
        setColumns(prevColumns =>
          prevColumns.map((column) => {
            if (column.id === targetColumnId) {
              return {
                ...column,
                tasks: [...column.tasks, newTask],
              }
            }
            return column
          })
        )
        
        toast({
          title: "Task duplicated",
          description: `"${duplicatedTask.title}" created`,
        })
      } catch (error) {
        console.error("Error duplicating task:", error)
        toast({
          title: "Error",
          description: "Failed to duplicate task. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const addColumn = async () => {
    if (!currentUser || !newColumnTitle.trim()) {
      toast({
        title: "Error",
        description: "Column title cannot be empty",
        variant: "destructive",
      })
      return
    }

    try {
      const columnId = await columnService.createColumn(currentUser.uid, {
        title: newColumnTitle,
        color: "bg-gray-50 dark:bg-gray-900/30",
      })

      const newColumn: ColumnType = {
        id: columnId,
        title: newColumnTitle,
        tasks: [],
        color: "bg-gray-50 dark:bg-gray-900/30",
      }

      setColumns(prevColumns => [...prevColumns, newColumn])
      setNewColumnTitle("")
      setIsAddingColumn(false)
      
      toast({
        title: "Column added",
        description: `"${newColumnTitle}" column has been added`,
      })
    } catch (error) {
      console.error("Error creating column:", error)
      toast({
        title: "Error",
        description: "Failed to create column. Please try again.",
        variant: "destructive",
      })
    }
  }

  const updateColumn = async (columnId: string, updates: Partial<ColumnType>) => {
    try {
      await columnService.updateColumn(columnId, updates)
      
      setColumns(prevColumns =>
        prevColumns.map((column) => (column.id === columnId ? { ...column, ...updates } : column))
      )
    } catch (error) {
      console.error("Error updating column:", error)
      toast({
        title: "Error",
        description: "Failed to update column. Please try again.",
        variant: "destructive",
      })
    }
  }

  const deleteColumn = async (columnId: string) => {
    const column = columns.find((col) => col.id === columnId)
    if (column && column.tasks.length > 0) {
      toast({
        title: "Cannot delete column",
        description: "Please move or delete all tasks in this column first",
        variant: "destructive",
      })
      return
    }

    try {
      await columnService.deleteColumn(columnId)
      setColumns(prevColumns => prevColumns.filter((col) => col.id !== columnId))
      
      toast({
        title: "Column deleted",
        description: `"${column?.title}" column has been deleted`,
      })
    } catch (error) {
      console.error("Error deleting column:", error)
      toast({
        title: "Error",
        description: "Failed to delete column. Please try again.",
        variant: "destructive",
      })
    }
  }

  const addRule = async (rule: Omit<Rule, 'id'>) => {
    if (!currentUser) return

    try {
      const ruleId = await ruleService.createRule(currentUser.uid, rule)
      const newRule = { ...rule, id: ruleId }
      
      setRules(prevRules => [...prevRules, newRule])
      toast({
        title: "Rule created",
        description: `"${rule.name}" has been added`,
      })
    } catch (error) {
      console.error("Error creating rule:", error)
      toast({
        title: "Error",
        description: "Failed to create rule. Please try again.",
        variant: "destructive",
      })
    }
  }

  const updateRule = async (ruleId: string, updates: Partial<Rule>) => {
    try {
      await ruleService.updateRule(ruleId, updates)
      
      setRules(prevRules =>
        prevRules.map((rule) => (rule.id === ruleId ? { ...rule, ...updates } : rule))
      )
    } catch (error) {
      console.error("Error updating rule:", error)
      toast({
        title: "Error",
        description: "Failed to update rule. Please try again.",
        variant: "destructive",
      })
    }
  }

  const deleteRule = async (ruleId: string) => {
    try {
      await ruleService.deleteRule(ruleId)
      setRules(prevRules => prevRules.filter((rule) => rule.id !== ruleId))
      
      toast({
        title: "Rule deleted",
        description: "The automation rule has been deleted",
      })
    } catch (error) {
      console.error("Error deleting rule:", error)
      toast({
        title: "Error",
        description: "Failed to delete rule. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      })
    } catch (error) {
      console.error("Error logging out:", error)
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your Kanban board...</p>
        </div>
      </div>
    )
  }

  // Board content for the "board" tab
  const renderBoardContent = () => (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 h-full">
        {columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            onAddTask={addTask}
            onTaskClick={setSelectedTask}
            onDeleteColumn={() => deleteColumn(column.id)}
            onUpdateColumn={updateColumn}
            onDuplicateTask={duplicateTask}
          />
        ))}

        <div className="shrink-0 w-72">
          {isAddingColumn ? (
            <div className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm border dark:border-gray-700">
              <Label htmlFor="column-title" className="dark:text-gray-200">
                Column Title
              </Label>
              <Input
                id="column-title"
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                placeholder="Enter column title"
                className="mb-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={addColumn}>
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddingColumn(false)}
                  className="dark:border-gray-600 dark:text-gray-200"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="border-dashed border-2 w-full h-12 dark:border-gray-700 dark:text-gray-300"
              onClick={() => setIsAddingColumn(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Column
            </Button>
          )}
        </div>
      </div>
    </DragDropContext>
  )

  // Automation content for the "automation" tab
  const renderAutomationContent = () => (
    <div className="max-w-4xl mx-auto">
      <AutomationRules
        rules={rules}
        columns={columns}
        onAddRule={addRule}
        onUpdateRule={updateRule}
        onDeleteRule={deleteRule}
      />
    </div>
  )

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Kanban Board</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Welcome, {currentUser?.displayName || currentUser?.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="board">Board</TabsTrigger>
            <TabsTrigger value="automation">Automation</TabsTrigger>
          </TabsList>

          <TabsContent value="board" className="mt-4">
            {renderBoardContent()}
          </TabsContent>

          <TabsContent value="automation" className="mt-4">
            {renderAutomationContent()}
          </TabsContent>
        </Tabs>
      </header>

      {selectedTask && (
        <TaskDetailSidebar
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={updateTask}
          onDelete={deleteTask}
          onDuplicate={duplicateTask}
          columns={columns}
        />
      )}
    </div>
  )
}
