"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import {
  BookOpen,
  Eye,
  FileText,
  LibraryBig,
  Loader2,
  Search,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { notifyError } from "@/lib/notify";
import {
  deleteDocumentAction,
  getDocumentsAction,
  uploadDocumentAction,
} from "@/action/KnowledgeBaseAction";
import type { KnowledgeDocument } from "@/service/KnowledgeBaseService";
import type { FormState } from "@/types/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useT, useLocale } from "@/hooks/useT";
import { interp } from "@/i18n/interp";
import { playSound } from "@/lib/sounds/playSound";
import UploadProgressCard from "./UploadProgressCard";

const ALLOWED_EXTENSIONS = [".pdf", ".txt", ".md"];
const MAX_FILE_SIZE = 25 * 1024 * 1024;

const initialState: FormState = { success: false, message: "" };

function mimeBadge(mime: string | null): { label: string; className: string } {
  switch (mime) {
    case "application/pdf":
      return {
        label: "PDF",
        className: "border-rose-500/40 text-rose-500 dark:text-rose-400",
      };
    case "text/markdown":
      return {
        label: "MD",
        className: "border-sky-500/40 text-sky-600 dark:text-sky-400",
      };
    case "text/plain":
      return {
        label: "TXT",
        className:
          "border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
      };
    default:
      return { label: mime ? mime.slice(0, 12) : "FILE", className: "" };
  }
}

function validateClientFile(file: File): "format" | "size" | null {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return "format";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "size";
  }
  return null;
}

interface KnowledgeBaseManagerProps {
  initialDocuments: KnowledgeDocument[];
  canManage: boolean;
}

export default function KnowledgeBaseManager({
  initialDocuments,
  canManage,
}: KnowledgeBaseManagerProps) {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const [documents, setDocuments] =
    useState<KnowledgeDocument[]>(initialDocuments);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [title, setTitle] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastAutoRef = useRef<string | null>(null);

  const [state, formAction, isPending] = useActionState(
    uploadDocumentAction,
    initialState,
  );

  useEffect(() => {
    if (!isPending) {
      if (!state.message) return;
      let progressReset: ReturnType<typeof setTimeout> | undefined;
      const applyResult = setTimeout(() => {
        if (state.success) {
          toast.success(t.data.upload.success);
          playSound("upload");
          setSelectedFile(null);
          setTitle("");
          lastAutoRef.current = null;
          setSearchTerm("");
          if (fileInputRef.current) fileInputRef.current.value = "";
          void (async () => {
            const result = await getDocumentsAction();
            if (result.success && Array.isArray(result.data)) {
              setDocuments(result.data as KnowledgeDocument[]);
            }
          })();
          router.refresh();
        } else {
          notifyError(state.message);
          setSelectedFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
        setProgress(100);
        progressReset = setTimeout(() => setProgress(0), 1200);
      });
      return () => {
        clearTimeout(applyResult);
        if (progressReset !== undefined) clearTimeout(progressReset);
      };
    }

    queueMicrotask(() => setProgress((prev) => (prev === 0 ? 5 : prev)));
    const interval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 7, 90));
    }, 300);
    return () => clearInterval(interval);
  }, [state, isPending, router, t]);

  const handleFileSelection = (file: File | undefined | null) => {
    if (!file) return;
    const error = validateClientFile(file);
    if (error) {
      notifyError(t.data.errors[error]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSelectedFile(null);
      return;
    }
    const prevAuto = lastAutoRef.current;
    const base = file.name.replace(/\.(pdf|txt|md)$/i, "");
    lastAutoRef.current = base;
    setTitle((prev) => (prev === "" || prev === prevAuto ? base : prev));
    setSelectedFile(file);
  };

  const handleValidateBeforeSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!isPending && selectedFile) {
      const error = validateClientFile(selectedFile);
      if (error) {
        e.preventDefault();
        notifyError(t.data.errors[error]);
      }
    }
  };

  const handleDelete = async (doc: KnowledgeDocument) => {
    if (
      !confirm(
        interp(t.data.remove.confirm, { title: doc.title }),
      )
    ) {
      return;
    }
    setDeletingId(doc.id);
    const result = await deleteDocumentAction(doc.id);
    setDeletingId(null);
    if (result.success) {
      toast.success(result.message || t.data.remove.success);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      router.refresh();
    } else {
      notifyError(result.message || t.data.remove.error);
    }
  };

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.description ?? "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const visualState: "uploading" | "success" | "error" | null = isPending
    ? "uploading"
    : progress === 100
      ? state.success
        ? "success"
        : "error"
      : null;
  const fileSizeLabel = selectedFile
    ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`
    : "";

  return (
    <div className="space-y-6">

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border/40 bg-muted/30 p-4 md:p-5">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <LibraryBig className="h-5 w-5 text-primary" />
            {t.data.header.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {t.data.header.description}
          </p>
        </div>

      </div>

      {canManage && (
        <form
          action={formAction}
          onSubmit={handleValidateBeforeSubmit}
          className="rounded-xl border border-border bg-card p-4 md:p-6 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                {t.data.upload.title}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t.data.upload.hint}
              </p>
            </div>
          </div>

          {visualState ? (
            <UploadProgressCard
              fileName={selectedFile?.name ?? ""}
              fileSizeLabel={fileSizeLabel}
              progress={progress}
              state={visualState}
            />
          ) : (
            <>
              <label
                htmlFor="kb-file-input"
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (fileInputRef.current && file) {
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    fileInputRef.current.files = dt.files;
                  }
                  handleFileSelection(file);
                }}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-all duration-200 ${
                  dragging
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50 hover:bg-muted/40"
                }`}
              >
                <input
                  ref={fileInputRef}
                  id="kb-file-input"
                  type="file"
                  name="file"
                  accept=".pdf,.txt,.md"
                  className="sr-only"
                  onChange={(e) => handleFileSelection(e.target.files?.[0])}
                />
                <UploadCloud
                  className={
                    dragging
                      ? "w-8 h-8 text-primary anim-float-y"
                      : "w-8 h-8 text-muted-foreground"
                  }
                />
                <p className="text-sm font-medium">
                  {t.data.upload.dropzone}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedFile
                    ? interp(t.data.upload.selected, {
                        name: selectedFile.name,
                        size: (selectedFile.size / (1024 * 1024)).toFixed(1),
                      })
                    : t.data.upload.formats}
                </p>
              </label>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                <div className="space-y-2 flex-1">
                  <label
                    htmlFor="kb-title-input"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t.data.upload.titleLabel}
                  </label>
                  <Input
                    id="kb-title-input"
                    name="title"
                    placeholder={t.data.upload.titlePlaceholder}
                    value={title}
                    onChange={(e) => {
                      const v = e.target.value;
                      setTitle(v);
                      if (v === "") lastAutoRef.current = null;
                    }}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isPending || !selectedFile}
                  className="gap-2 w-full sm:w-auto"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />{" "}
                      {t.data.upload.submitting}
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />{" "}
                      {t.data.upload.submit}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </form>
      )}

      <section className="rounded-xl border border-border bg-card p-4 md:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                {t.data.list.title}
              </h2>
              <p className="text-xs text-muted-foreground">
                {canManage
                  ? t.data.list.hintManage
                  : t.data.list.hintRead}
              </p>
            </div>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t.data.list.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label={t.data.list.searchAria}
              className="pl-9 text-sm"
            />
          </div>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                <tr>
                  <th className="p-4">{t.data.list.columnTitle}</th>
                  <th className="p-4">{t.data.list.columnType}</th>
                  <th className="p-4">{t.data.list.columnDate}</th>
                  <th className="p-4 text-right">
                    {t.data.list.columnActions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDocuments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-8 text-center text-muted-foreground"
                    >
                      <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      {documents.length === 0
                        ? t.data.list.empty
                        : t.data.list.noResults}
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((doc) => {
                    const badge = mimeBadge(doc.description);
                    return (
                      <tr
                        key={doc.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-4 font-semibold text-foreground">
                          <span className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary shrink-0" />
                            {doc.title}
                          </span>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className={badge.className}>
                            {badge.label}
                          </Badge>
                        </td>
                        <td className="p-4 text-xs font-mono text-muted-foreground">
                          {new Date(doc.createdAt).toLocaleDateString(
                            locale === "en" ? "en-US" : "es-ES",
                          )}
                        </td>
                        <td className="p-4 text-right space-x-1 whitespace-nowrap">
                          <Button size="icon" variant="ghost" asChild>
                            <a
                              href={`/api/data/${doc.id}/file`}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={interp(t.data.list.viewAria, {
                                title: doc.title,
                              })}
                            >
                              <Eye className="w-4 h-4" />
                            </a>
                          </Button>
                          {canManage && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:bg-destructive/10"
                              disabled={deletingId === doc.id}
                              aria-label={interp(t.data.list.deleteAria, {
                                title: doc.title,
                              })}
                              onClick={() => void handleDelete(doc)}
                            >
                              {deletingId === doc.id ? (
                                <Spinner />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
