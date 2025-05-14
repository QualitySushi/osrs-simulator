"use client"

import { Toaster as SonnerToaster } from "sonner"

export function SonnerProvider() {
  return (
    <SonnerToaster 
      position="bottom-right"
      toastOptions={{
        className: "dark:bg-gray-800 dark:text-white",
        duration: 5000,
      }}
    />
  )
}