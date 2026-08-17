import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "./Calendar"
import { Calendar } from "./Calendar"
import * as Popover from "@radix-ui/react-popover"

interface DatePickerProps {
  date?: Date
  setDate: (date?: Date) => void
  minDate?: Date
  maxDate?: Date
  className?: string
}

export function DatePicker({ date, setDate, minDate, maxDate, className }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-lg border border-text-muted/20 bg-background-dark/80 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-purple transition-all outline-none",
            !date && "text-text-muted",
            className
          )}
        >
          {date ? format(date, "MM/dd/yyyy") : <span>Pick a date</span>}
          <CalendarIcon className="h-4 w-4 opacity-50 ml-2" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-[9999] w-auto p-0 bg-background-card/90 backdrop-blur-md border border-text-muted/15 rounded-xl shadow-glass outline-none overflow-hidden"
          align="start"
          sideOffset={8}
        >
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => {
              if (d) {
                setDate(d)
                setOpen(false)
              }
            }}
            disabled={(day) => {
              // Normalize times to midnight for fair comparison
              const d = new Date(day.getFullYear(), day.getMonth(), day.getDate());
              const min = minDate ? new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()) : null;
              const max = maxDate ? new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate()) : null;
              
              if (min && d < min) return true;
              if (max && d > max) return true;
              return false;
            }}
            initialFocus
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}