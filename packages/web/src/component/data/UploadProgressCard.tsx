"use client";

import { CheckCircle2, FileText, TriangleAlert } from "lucide-react";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";

interface UploadProgressCardProps {
  fileName: string;
  fileSizeLabel: string;
  progress: number;
  state: "uploading" | "success" | "error";
}

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function UploadProgressCard({
  fileName,
  fileSizeLabel,
  progress,
  state,
}: UploadProgressCardProps) {
  const t = useT();
  const clamped = Math.min(100, Math.max(0, progress));
  const uploading = state === "uploading";

  const strokeClass =
    state === "success"
      ? "stroke-emerald-500"
      : state === "error"
        ? "stroke-destructive"
        : "stroke-primary";

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center gap-4 py-8 text-center",
        state === "error" && "anim-shake-x",
      )}
    >
      {fileName.length > 0 && (
        <div className="flex max-w-full items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2">
          <FileText
            className={cn(
              "size-4 shrink-0 text-primary",
              uploading && "anim-pulse-soft",
            )}
          />
          <div className="min-w-0 text-left">
            <p className="max-w-56 truncate text-sm font-medium sm:max-w-xs">
              {fileName}
            </p>
            <p className="text-xs text-muted-foreground">{fileSizeLabel}</p>
          </div>
        </div>
      )}

      <div
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t.data.upload.title}
        className="relative"
      >
        <svg
          viewBox="0 0 176 176"
          className="block w-40 sm:w-44"
          aria-hidden="true"
        >
          <circle
            cx={88}
            cy={88}
            r={RADIUS}
            fill="none"
            strokeWidth={10}
            className="stroke-muted"
          />
          <circle
            cx={88}
            cy={88}
            r={RADIUS}
            fill="none"
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - clamped / 100)}
            transform="rotate(-90 88 88)"
            className={strokeClass}
            style={{ transition: "stroke-dashoffset 300ms ease" }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {state === "success" ? (
            <CheckCircle2 className="anim-check-pop size-14 text-emerald-500" />
          ) : state === "error" ? (
            <TriangleAlert className="size-14 text-destructive" />
          ) : (
            <div className="flex items-baseline">
              <span className="text-4xl font-bold tabular-nums">
                {Math.round(clamped)}
              </span>
              <span className="text-lg text-muted-foreground">%</span>
            </div>
          )}
        </div>
      </div>

      <div aria-live="polite" className="space-y-1 px-2">
        {state === "success" ? (
          <>
            <p className="text-sm font-semibold">{t.data.upload.doneTitle}</p>
            <p className="text-xs text-muted-foreground">
              {t.data.upload.doneBody}
            </p>
          </>
        ) : state === "error" ? (
          <>
            <p className="text-sm font-semibold text-destructive">
              {t.data.upload.errorTitle}
            </p>
            <p className="text-xs text-muted-foreground">
              {t.data.upload.errorBody}
            </p>
          </>
        ) : (
          <p className="text-sm font-medium">
            {clamped < 70
              ? t.data.upload.ringUploading
              : t.data.upload.ringProcessing}
          </p>
        )}
      </div>

      {uploading && (
        <div className="h-1.5 w-48 overflow-hidden rounded-full bg-muted">
          <div className="anim-shimmer h-full w-1/2 rounded-full" />
        </div>
      )}
    </div>
  );
}
