import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  className?: string;
  bottomNav?: ReactNode;
  header?: ReactNode;
  noPadding?: boolean;
}

export function MobileShell({ children, className, bottomNav, header, noPadding }: Props) {
  return (
    <div className="min-h-[100dvh] vault-bg flex justify-center">
      <div className="w-full max-w-md flex flex-col relative">
        {header}
        <main className={cn("flex-1", !noPadding && "px-5 pb-32", className)}>
          {children}
        </main>
        {bottomNav && (
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 safe-bottom px-4 pb-2">
            {bottomNav}
          </div>
        )}
      </div>
    </div>
  );
}