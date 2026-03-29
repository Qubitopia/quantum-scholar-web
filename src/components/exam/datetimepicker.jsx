import * as React from "react"
import { format } from "date-fns"
import { ChevronDownIcon, ClockIcon, CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

export function DateTimePicker({ 
  value, 
  onChange, 
  label = "Date & Time",
  placeholder = "Select date and time",
  disabled = false,
  className = ""
}) {
  const [openDate, setOpenDate] = React.useState(false)
  const [openTime, setOpenTime] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState(value ? new Date(value) : undefined)
  const [selectedTime, setSelectedTime] = React.useState(value ? format(new Date(value), "HH:mm") : "10:30")

  // Keep local state in sync when parent value changes (e.g. reset form).
  React.useEffect(() => {
    if (!value) {
      setSelectedDate(undefined)
      setSelectedTime("10:30")
      return
    }

    const dateFromValue = new Date(value)
    setSelectedDate(dateFromValue)
    setSelectedTime(format(dateFromValue, "HH:mm"))
  }, [value])

  // Update parent component when date or time changes
  React.useEffect(() => {
    if (!selectedDate) return

    const [hours, minutes] = selectedTime.split(":")
    const newDateTime = new Date(selectedDate)
    newDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0)

    // Avoid a re-render loop when parent recreates onChange on each render.
    const nextTimestamp = newDateTime.getTime()
    if (nextTimestamp !== value) {
      onChange(nextTimestamp)
    }
  }, [selectedDate, selectedTime, value, onChange])

  const handleDateSelect = (date) => {
    setSelectedDate(date)
    setOpenDate(false)
  }

  const handleTimeChange = (e) => {
    setSelectedTime(e.target.value)
  }

  const displayDate = selectedDate ? format(selectedDate, "MMM dd, yyyy") : "Select date"
  const displayTime = selectedTime || "10:30"

  return (
    <div className={`datetimepicker flex flex-col gap-2 w-full ${className}`}>
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}
      
      <div className="flex gap-3 items-end">
        {/* Date Picker */}
        <div className="flex-0">
          <Popover open={openDate} onOpenChange={setOpenDate}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                disabled={disabled}
                className="datetimepicker-trigger w-full justify-between font-normal"
              >
                <span className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                  {displayDate}
                </span>
                <ChevronDownIcon className={`w-4 h-4 transition-transform ${openDate ? "rotate-180" : ""}`} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="datetimepicker-popover w-auto overflow-hidden p-0 z-50" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                defaultMonth={selectedDate}
                disabled={disabled}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Time Picker */}
        <div className="flex-shrink-0">
          <Popover open={openTime} onOpenChange={setOpenTime}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                disabled={disabled}
                className="datetimepicker-trigger w-24 justify-between font-normal"
              >
                <span className="flex items-center gap-2">
                  <ClockIcon className="w-4 h-4 text-muted-foreground" />
                  {displayTime}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="datetimepicker-popover w-auto p-4 z-50" align="end">
              <div className="flex flex-col gap-3">
                <label className="text-xs font-semibold text-muted-foreground">Time</label>
                <Input
                  type="time"
                  value={selectedTime}
                  onChange={handleTimeChange}
                  disabled={disabled}
                  className="w-32"
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Display selected value (optional - for debugging) */}
      {selectedDate && (
        <p className="text-xs text-muted-foreground">
          Selected: {format(selectedDate, "PPP")} at {selectedTime}
        </p>
      )}
    </div>
  )
}