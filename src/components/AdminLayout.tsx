import type { ReactNode } from "react";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="admin-layout">
      <nav className="admin-nav">
        <h2>OAP Dormitory</h2>
      </nav>
      <main className="admin-main">{children}</main>
    </div>
  );
}
