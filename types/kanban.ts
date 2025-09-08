export interface Task {
  id: string
  title: string
  description?: string
  status: string
  dueDate: string | null
  subtasks: Subtask[]
  customFields: CustomField[]
  createdAt: string
  userId?: string
  updatedAt?: string
}

export interface Subtask {
  id: string
  title: string
  completed: boolean
}

export interface CustomField {
  id: string
  name: string
  value: string
}

export interface Column {
  id: string
  title: string
  tasks: Task[]
  color?: string
  userId?: string
  createdAt?: string
  updatedAt?: string
}

// Add new Rule interfaces for automation
export interface Rule {
  id: string
  name: string
  condition: RuleCondition
  action: RuleAction
  enabled: boolean
  userId?: string
  createdAt?: string
  updatedAt?: string
}

export interface RuleCondition {
  type: "due-date" | "subtasks-completed" | "custom-field"
  field?: string
  operator:
    | "equals"
    | "not-equals"
    | "contains"
    | "greater-than"
    | "less-than"
    | "is-empty"
    | "is-not-empty"
    | "is-overdue"
    | "all-completed"
  value?: string
}

export interface RuleAction {
  type: "move-to-column"
  targetColumnId: string
}
