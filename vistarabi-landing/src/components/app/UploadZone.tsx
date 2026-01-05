"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";

interface UploadZoneProps {
    onFilesSelected: (files: FileList) => void;
    uploading: boolean;
}

export default function UploadZone({ onFilesSelected, uploading }: UploadZoneProps) {
    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            if (e.dataTransfer.files.length > 0) {
                onFilesSelected(e.dataTransfer.files);
            }
        },
        [onFilesSelected]
    );

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFilesSelected(e.target.files);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${uploading
                    ? "border-[var(--accent)] bg-[var(--accent)]/5"
                    : "border-[var(--border)] hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/5"
                }`}
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
                        <p className="text-[var(--foreground)] font-medium">Uploading and processing...</p>
                    </>
                ) : (
                    <>
                        <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
                            <svg className="w-6 h-6 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        </div>
                        <p className="text-[var(--foreground)] font-medium mb-1">
                            Drop files here or click to upload
                        </p>
                        <p className="text-sm text-[var(--muted)]">
                            Supports CSV, Excel, JSON, XML
                        </p>
                    </>
                )}
            </div>
        </motion.div>
    );
}
