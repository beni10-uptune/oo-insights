# Claude Command: Todo

Manage project todos in a `todos.md` file at the root of your project directory.

## Usage

```
/todo <action> [arguments]
```

Examples:
- `/todo add "Fix navigation bug"`
- `/todo add "Implement user auth" tomorrow`
- `/todo add "Deploy to production" next week`
- `/todo complete 1`
- `/todo remove 2`
- `/todo list`
- `/todo undo 1`
- `/todo due 3 Friday`
- `/todo past due`
- `/todo next`

## Actions

### add
Add a new todo item
- `/todo add "description"` - Add without due date
- `/todo add "description" [date/time]` - Add with due date
  - Examples: tomorrow, next week, Friday, June 9, 12-24-2025, in 2 hours

### complete
Mark a todo as completed
- `/todo complete N` - Mark todo #N as completed

### remove
Remove a todo entirely
- `/todo remove N` - Delete todo #N

### list
Show todos
- `/todo list` - Show all todos
- `/todo list N` - Show first N todos

### undo
Restore a completed todo
- `/todo undo N` - Mark completed todo #N as incomplete

### due
Set or update due date
- `/todo due N [date/time]` - Set due date for todo #N

### past due
Show overdue tasks
- `/todo past due` - List all overdue active tasks

### next
Show next task
- `/todo next` - Show the next active task (respects due dates)

## Todo Format

The todos.md file uses this structure:

```markdown
# Project Todos

## Active
- [ ] Task description | Due: MM-DD-YYYY
- [ ] Another task without due date

## Completed
- [x] Finished task | Done: MM-DD-YYYY
- [x] Task with due | Due: MM-DD-YYYY | Done: MM-DD-YYYY
```

## Features

- **Automatic sorting**: Active tasks sorted by due date
- **Due date parsing**: Natural language date input (tomorrow, next week, etc.)
- **Separate sections**: Active and Completed tasks
- **Numbered display**: Tasks shown with numbers for easy reference
- **Overdue tracking**: Easily see which tasks are past due
- **Time support**: Optional time specification for deadlines

## Best Practices

- Keep task descriptions concise and actionable
- Use due dates for time-sensitive tasks
- Review past due items regularly
- Complete tasks promptly to maintain accurate status
- Use descriptive task names that clearly state the action needed