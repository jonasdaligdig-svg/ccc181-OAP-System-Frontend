import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

export default function PublicLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center text-xs font-bold tracking-wider uppercase transition-colors py-1 border-b-2 ${
      isActive
        ? 'text-[#D4A537] border-[#D4A537]'
        : 'text-white/90 border-transparent hover:text-[#D4A537]'
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF8EB] text-[#152852]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#152852] border-b-2 border-[#D4A537] shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Left: University / OAP Logo */}
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 focus:outline-none"
          >
            <img
              src="/MSUN Logo.png"
              alt="MSUN Girls Dormitory OAP"
              className="h-14 md:h-16 w-auto object-contain"
            />
          </Link>

          {/* Right: Desktop Nav Links */}
          <nav className="hidden items-center gap-7 md:flex">
            <NavLink to="/" end className={navLinkClass}>
              HOME
            </NavLink>
            <NavLink to="/about" className={navLinkClass}>
              ABOUT
            </NavLink>
            <Link
              to="/login"
              className="inline-flex items-center text-xs font-semibold tracking-wider text-slate-300 uppercase transition-colors py-1 border-b-2 border-transparent hover:text-white"
            >
              PORTAL LOGIN
            </Link>
            <Link
              to="/apply"
              className="inline-flex items-center rounded-lg bg-[#D4A537] px-5 py-2.5 text-xs font-bold tracking-wider text-[#152852] uppercase shadow-xs transition hover:bg-[#c2942c]"
            >
              APPLY NOW
            </Link>
          </nav>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex items-center justify-center rounded-lg p-2 text-white/90 hover:bg-white/10 hover:text-white md:hidden"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="border-t border-white/10 bg-[#152852] px-4 py-4 md:hidden">
            <div className="flex flex-col space-y-3">
              <NavLink
                to="/"
                end
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-xs font-bold tracking-wider uppercase ${
                    isActive
                      ? 'bg-white/10 text-[#D4A537]'
                      : 'text-white/90 hover:bg-white/5 hover:text-[#D4A537]'
                  }`
                }
              >
                HOME
              </NavLink>
              <NavLink
                to="/about"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-xs font-bold tracking-wider uppercase ${
                    isActive
                      ? 'bg-white/10 text-[#D4A537]'
                      : 'text-white/90 hover:bg-white/5 hover:text-[#D4A537]'
                  }`
                }
              >
                ABOUT
              </NavLink>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-xs font-semibold tracking-wider text-slate-300 uppercase hover:bg-white/5 hover:text-white"
              >
                PORTAL LOGIN
              </Link>
              <Link
                to="/apply"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-1 inline-flex items-center justify-center rounded-lg bg-[#D4A537] px-5 py-2.5 text-xs font-bold tracking-wider text-[#152852] uppercase transition hover:bg-[#c2942c]"
              >
                APPLY NOW
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t-2 border-[#D4A537] bg-[#152852]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-center sm:flex-row sm:px-6 sm:text-left lg:px-8">
          <p className="text-xs font-bold tracking-widest text-white uppercase">
            MSUN GIRLS DORMITORY
          </p>
          <p className="text-xs text-slate-300">Occupancy Analytics Platform (OAP)</p>
        </div>
      </footer>
    </div>
  );
}
