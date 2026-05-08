"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_EXTENSIONS = ["csv", "xlsx", "xls", "json", "xml"];
const ALLOWED_MIME = [
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/json",
    "text/xml",
    "application/xml",
];

interface UploadZoneProps {
    onFilesSelected: (files: FileList) => void;
    uploading: boolean;
}

function validateFiles(files: FileList): File[] {
    const valid: File[] = [];
    const errors: string[] = [];

    Array.from(files).forEach((file) => {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            errors.push(`"${file.name}" — unsupported format (use CSV, Excel, JSON, or XML)`);
            return;
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
            const mb = (file.size / 1024 / 1024).toFixed(1);
            errors.push(`"${file.name}" is ${mb}MB — maximum is ${MAX_FILE_SIZE_MB}MB`);
            return;
        }
        if (file.size === 0) {
            errors.push(`"${file.name}" is empty`);
            return;
        }
        valid.push(file);
    });

    if (errors.length > 0) {
        errors.forEach((e) => toast.error(e, { duration: 5000 }));
    }

    return valid;
}

export default function UploadZone({ onFilesSelected, uploading }: UploadZoneProps) {
    const [dragActive, setDragActive] = useState(false);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragActive(false);
            if (e.dataTransfer.files.length > 0) {
                const valid = validateFiles(e.dataTransfer.files);
                if (valid.length > 0) {
                    // Rebuild FileList-like by creating a DataTransfer
                    const dt = new DataTransfer();
                    valid.forEach((f) => dt.items.add(f));
                    onFilesSelected(dt.files);
                }
            }
        },
        [onFilesSelected]
    );

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(true);
    };

    const handleDragLeave = () => setDragActive(false);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const valid = validateFiles(e.target.files);
            if (valid.length > 0) {
                const dt = new DataTransfer();
                valid.forEach((f) => dt.items.add(f));
                onFilesSelected(dt.files);
            }
            // Reset input so same file can be re-selected after error
            e.target.value = "";
        }
    };

    const borderClass = uploading
        ? "border-[var(--accent)] bg-[var(--accent)]/5"
        : dragActive
        ? "border-[var(--accent)] bg-[var(--accent)]/8 scale-[1.01]"
        : "border-[var(--border)] hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/5";

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 ${borderClass}`}
        >
            <input
                type="file"
                multiple
                accept=".csv,.xlsx,.xls,.json,.xml"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={uploading}
            />

            <div className="pointer-events-none">
                {uploading ? (
                    <>
                        <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                            <div className="animate-spin w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full" />
                        </div>
                        <p className="text-[var(--foreground)] font-medium">Uploading and processing…</p>
                    </>
                ) : (
                    <>
                        <div className={`w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center transition-colors ${dragActive ? "bg-[var(--accent)]" : "bg-[var(--accent)]/10"}`}>
                            <svg className={`w-6 h-6 transition-colors ${dragActive ? "text-white" : "text-[var(--accent)]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        </div>
                        <p className="text-[var(--foreground)] font-medium mb-1">
                            {dragActive ? "Release to upload" : "Drop files here or click to upload"}
                        </p>
                        <p className="text-sm text-[var(--muted)]">
                            CSV, Excel, JSON, XML · Max {MAX_FILE_SIZE_MB}MB per file
                        </p>
                    </>
                )}
            </div>
        </motion.div>
    );
}
