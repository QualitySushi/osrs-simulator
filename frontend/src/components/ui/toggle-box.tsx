"use client"

import * as React from "react"
import * as TogglePrimitive from "@radix-ui/react-toggle"

import { cn } from "@/lib/utils"

function ToggleBox({ className, ...props }: React.ComponentProps<typeof TogglePrimitive.Root>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle-box"
      className={cn(
        "inline-flex size-4 items-center justify-center rounded-full border-2 border-rs-gold data-[state=on]:bg-rs-gold data-[state=off]:bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <div className="h-2 w-2 rounded-full bg-primary-foreground opacity-0 data-[state=on]:opacity-100 transition-opacity" />
    </TogglePrimitive.Root>
  )
}

export { ToggleBox }
