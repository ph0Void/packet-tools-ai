"use client"
import { cn } from "@/lib/utils"
import { Loader2Icon } from "lucide-react"
import { useT } from "@/hooks/useT"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  const t = useT()
  return (
    <Loader2Icon data-slot="spinner" role="status" aria-label={t.common.loading} className={cn("size-4 animate-spin", className)} {...props} />
  )
}

export { Spinner }
