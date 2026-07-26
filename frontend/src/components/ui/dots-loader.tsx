'use client';

export function DotsLoader({ className = 'text-blue-600' }: { className?: string }) {
  return (
    <div className="flex items-center gap-1 py-1">
      <span className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.3s] bg-current ${className}`} />
      <span className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.15s] bg-current ${className}`} />
      <span className={`w-1.5 h-1.5 rounded-full animate-bounce bg-current ${className}`} />
    </div>
  );
}
