"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: React.ReactNode
  iconPosition?: "left" | "right"
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, hint, icon, iconPosition = "left", id, ...props }, ref) => {
    const generatedId = React.useId()
    const inputId = id || generatedId
    const hasIcon = !!icon

    return (
      <div className="w-full space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
          </label>
        )}
        <div className="relative group/input">
          {hasIcon && iconPosition === "left" && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/input:text-primary transition-colors duration-150">
              {icon}
            </div>
          )}
          <input
            type={type}
            id={inputId}
            className={cn(
              // Base styles with touch-friendly height on mobile (44px), standard on desktop (40px)
              "flex h-11 sm:h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-base sm:text-sm",
              "transition-all duration-150 ease-out",
              "placeholder:text-muted-foreground/70",
              "focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/50",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-primary",
              // Icon padding
              hasIcon && iconPosition === "left" && "pl-10",
              hasIcon && iconPosition === "right" && "pr-10",
              // Error state
              error && "border-destructive focus:ring-destructive/50",
              className
            )}
            ref={ref}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
          {hasIcon && iconPosition === "right" && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/input:text-primary transition-colors duration-150">
              {icon}
            </div>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-sm text-destructive animate-fade-in">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-sm text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

// Search input variant with built-in icon
const SearchInput = React.forwardRef<HTMLInputElement, Omit<InputProps, "icon" | "iconPosition">>(
  ({ className, ...props }, ref) => (
    <Input
      ref={ref}
      type="search"
      icon={
        <svg
          className="size-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      }
      iconPosition="left"
      className={cn("", className)}
      {...props}
    />
  )
)
SearchInput.displayName = "SearchInput"

export { Input, SearchInput }
