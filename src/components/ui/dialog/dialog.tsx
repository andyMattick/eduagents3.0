"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ style, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      backdropFilter: "blur(2px)",
      zIndex: 50,
      ...style
    }}
    {...props}
  />
))
DialogOverlay.displayName = "DialogOverlay"

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ style, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        background: "white",
        padding: "24px",
        borderRadius: "8px",
        maxWidth: "700px",
        width: "90%",
        zIndex: 51,
        boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        ...style
      }}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = "DialogContent"

export const DialogHeader = ({
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    style={{
      marginBottom: "12px",
      ...style
    }}
    {...props}
  />
)

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ style, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    style={{
      fontSize: "20px",
      fontWeight: 600,
      ...style
    }}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ style, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    style={{
      fontSize: "14px",
      opacity: 0.8,
      marginTop: "4px",
      ...style
    }}
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"
