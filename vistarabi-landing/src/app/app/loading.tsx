export default function AppLoading() {
    return (
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 animate-pulse flex items-center justify-center text-xl">📊</div>
                <div className="space-y-2 text-center">
                    <div className="h-4 w-48 bg-slate-200 rounded-full animate-pulse" />
                    <div className="h-3 w-32 bg-slate-100 rounded-full animate-pulse mx-auto" />
                </div>
            </div>
        </div>
    );
}
