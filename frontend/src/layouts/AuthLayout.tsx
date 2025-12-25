import { ReactNode } from "react";

type AuthLayoutProps = {
  children: ReactNode;
  title?: string;
  description?: string;
};

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center
                    bg-gradient-to-br from-[#1a1c2c] via-[#222b3a] to-[#1a1f2f]">
      {children}
    </div>
  );
}
