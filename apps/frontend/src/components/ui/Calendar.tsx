import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import "react-day-picker/dist/style.css"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium text-white",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 border border-text-muted/20 rounded-md flex justify-center items-center text-white hover:bg-accent-purple/20 hover:border-accent-purple/50 transition-all"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "",
        head_cell: "text-text-muted font-normal text-[0.8rem] w-9 h-9 text-center align-middle",
        row: "mt-2",
        cell: "text-center p-0 align-middle relative",
        day: cn(
          "h-9 w-9 mx-auto p-0 font-normal aria-selected:opacity-100 rounded-md text-white hover:bg-accent-purple/20 hover:text-white transition-colors flex items-center justify-center bg-transparent cursor-pointer"
        ),
        day_range_end: "day-range-end",
        day_selected: "bg-accent-purple text-white hover:bg-accent-purple hover:text-white focus:bg-accent-purple focus:text-white",
        day_today: "bg-background-card border border-accent-purple/50 text-accent-purple font-bold",
        day_outside: "day-outside text-text-muted opacity-50 aria-selected:bg-accent-purple/20 aria-selected:text-white aria-selected:opacity-30",
        day_disabled: "text-text-muted opacity-30 cursor-not-allowed hover:bg-transparent hover:text-text-muted",
        day_range_middle: "aria-selected:bg-accent-purple/20 aria-selected:text-white",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }