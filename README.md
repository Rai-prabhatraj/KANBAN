#  Modern Kanban Board

A beautiful, modern Kanban board built with Next.js, TypeScript, and Tailwind CSS. Features a fully functional theme system, drag-and-drop functionality, and automation rules.

## Features

### Theme System
- **Light/Dark/System Themes**: Full theme support with system preference detection
- **Smooth Transitions**: No flash of unstyled content during theme changes
- **Consistent Design Tokens**: Cohesive color palette across all components

### Kanban Functionality
- **Drag & Drop**: Smooth drag-and-drop between columns using `@hello-pangea/dnd`
- **Task Management**: Create, edit, delete, and duplicate tasks
- **Column Management**: Add, remove, and customize column colors
- **Task Details**: Comprehensive task editing with subtasks and custom fields
- **Due Dates**: Visual indicators for overdue tasks

### Automation Rules
- **Smart Automation**: Automatically move tasks based on conditions
- **Due Date Rules**: Move overdue tasks to blocked column
- **Subtask Rules**: Move tasks when all subtasks are completed
- **Custom Field Rules**: Create rules based on custom field values
- **Rule Management**: Enable/disable rules as needed

### User Experience
- **Keyboard Shortcuts**: Enter to save, Escape to cancel
- **Toast Notifications**: User feedback for all actions
- **Loading States**: Proper loading indicators
- **Error Handling**: Graceful error handling throughout

