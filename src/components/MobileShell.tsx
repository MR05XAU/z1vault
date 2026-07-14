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
      <div className="w-full max-w-md md:max-w-2xl lg:max-w-4xl flex flex-col relative">
        {header}
        <main className={cn("flex-1 min-w-0", !noPadding && "px-5 pb-nav", className)}>
          {children}
        </main>
        {bottomNav && (
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md md:max-w-2xl lg:max-w-4xl z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1 pointer-events-none">
            <div className="pointer-events-auto mx-auto max-w-md">
            {bottomNav}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}