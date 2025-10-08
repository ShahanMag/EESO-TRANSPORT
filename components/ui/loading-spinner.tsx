import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ className, fullScreen = false }: LoadingSpinnerProps) {
  if (fullScreen) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className={cn("animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600", className)}></div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      <div className={cn("animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600", className)}></div>
    </div>
  );
}
