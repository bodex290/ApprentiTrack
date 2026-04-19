/**
 * Shared loading screen shown while data is being fetched.
 * Matches the spinner style used on the Dashboard page.
 */
export default function LoadingScreen({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="p-8 flex items-center justify-center" style={{ minHeight: '60vh' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-slate-400 text-sm">{message}</span>
      </div>
    </div>
  );
}
