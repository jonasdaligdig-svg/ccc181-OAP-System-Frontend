import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  HelpCircle,
  KeyRound,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useOap } from '../../context/useOap';

type PortalTab = 'dormer' | 'personnel';
type ActiveModal = null | 'activate' | 'forgot' | 'contact_admin';

const REMEMBER_STORAGE_KEY = 'msun_oap_remembered_login';

function loadRememberedLogin(): { portal: PortalTab; identifier: string; remember: boolean } {
  try {
    const saved = localStorage.getItem(REMEMBER_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as { portal?: PortalTab; identifier?: string };
      return {
        portal:
          parsed.portal === 'dormer' || parsed.portal === 'personnel' ? parsed.portal : 'dormer',
        identifier: parsed.identifier || '',
        remember: Boolean(parsed.identifier),
      };
    }
  } catch {
    // Ignore localStorage parse errors
  }
  return { portal: 'dormer', identifier: '', remember: false };
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, activateDormerAccount } = useOap();

  const [initialRemembered] = useState(loadRememberedLogin);
  const [portal, setPortal] = useState<PortalTab>(initialRemembered.portal);
  const [identifier, setIdentifier] = useState(initialRemembered.identifier);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(initialRemembered.remember);
  const [authError, setAuthError] = useState('');

  // Modal state
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  // Activate Account modal state
  const [actIdentifier, setActIdentifier] = useState('');
  const [actTempPassword, setActTempPassword] = useState('');
  const [actNewPassword, setActNewPassword] = useState('');
  const [actConfirmPassword, setActConfirmPassword] = useState('');
  const [actShowTemp, setActShowTemp] = useState(false);
  const [actShowNew, setActShowNew] = useState(false);
  const [actError, setActError] = useState('');

  // Forgot Password modal state
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  // Close modal on Escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeModal) {
        setActiveModal(null);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [activeModal]);

  const handleSwitchPortal = (nextPortal: PortalTab) => {
    setPortal(nextPortal);
    setAuthError('');
    setPassword('');
    setShowPassword(false);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!identifier.trim()) {
      setAuthError(
        portal === 'dormer'
          ? 'Please enter your student email.'
          : 'Please enter your staff email.'
      );
      return;
    }
    if (!password) {
      setAuthError('Please enter your password.');
      return;
    }

    const result = login(identifier, password, portal);
    if (!result.success) {
      if (result.requiresActivation) {
        setActIdentifier(identifier.trim());
        setActTempPassword(password);
        setActNewPassword('');
        setActConfirmPassword('');
        setActError('');
        setActiveModal('activate');
        setAuthError(result.error || '');
        return;
      }
      setAuthError(result.error || 'Unable to sign in.');
      return;
    }

    if (rememberMe) {
      try {
        localStorage.setItem(
          REMEMBER_STORAGE_KEY,
          JSON.stringify({ portal, identifier: identifier.trim() })
        );
      } catch {
        // Ignore storage error
      }
    } else {
      localStorage.removeItem(REMEMBER_STORAGE_KEY);
    }

    if (portal === 'personnel') {
      navigate('/admin/dashboard');
    } else {
      navigate('/dormer/dashboard');
    }
  };

  const openActivateModal = () => {
    setActIdentifier(identifier.trim());
    setActTempPassword('');
    setActNewPassword('');
    setActConfirmPassword('');
    setActError('');
    setActiveModal('activate');
  };

  const handleActivateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActError('');

    if (!actIdentifier.trim()) {
      setActError('Student email is required.');
      return;
    }
    if (!actTempPassword) {
      setActError('Temporary password is required.');
      return;
    }
    if (actNewPassword.length < 8) {
      setActError('New password must be at least 8 characters long.');
      return;
    }
    if (actNewPassword !== actConfirmPassword) {
      setActError('New password and confirmation do not match.');
      return;
    }

    const res = activateDormerAccount(actIdentifier, actTempPassword, actNewPassword);
    if (!res.success) {
      setActError(res.error || 'Unable to activate account.');
      return;
    }

    setActiveModal(null);
    navigate('/dormer/dashboard');
  };

  const openForgotModal = () => {
    setForgotIdentifier(identifier.trim());
    setForgotError('');
    setForgotSubmitted(false);
    setActiveModal('forgot');
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    if (!forgotIdentifier.trim()) {
      setForgotError('Please enter your email address.');
      return;
    }
    setForgotSubmitted(true);
  };

  const portalLabel = portal === 'dormer' ? 'Dormer portal' : 'Dorm personnel portal';

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-[#FFF8EB] text-slate-800">
      {/* Left Navy Sidebar (Desktop) */}
      <aside className="hidden w-64 shrink-0 flex-col bg-[#152852] text-white lg:flex">
        <div className="flex items-center justify-center border-b border-white/10 px-5 py-5 text-center">
          <Link to="/" className="inline-flex items-center justify-center focus:outline-none">
            <img
              src="/oap-logo.png"
              alt="MSUN Girls Dormitory — Occupancy Analytics Platform"
              className="w-40 mx-auto object-contain"
            />
          </Link>
        </div>

        <div className="flex-1 px-4 py-6">
          <p className="px-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
            ACCOUNT ACCESS
          </p>

          <div className="mt-3 space-y-1.5">
            <button
              type="button"
              onClick={() => handleSwitchPortal('dormer')}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs transition cursor-pointer ${
                portal === 'dormer'
                  ? 'bg-[#E2B743] text-[#152852] font-semibold shadow-sm'
                  : 'font-medium text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Users className="h-4 w-4 shrink-0" />
              <span>Dormer</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchPortal('personnel')}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs transition cursor-pointer ${
                portal === 'personnel'
                  ? 'bg-[#E2B743] text-[#152852] font-semibold shadow-sm'
                  : 'font-medium text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Dorm personnel</span>
            </button>
          </div>
        </div>

        <div className="border-t border-white/10 px-5 py-5 space-y-3">
          <div>
            <p className="text-xs font-bold text-white">Need assistance?</p>
            <p className="mt-0.5 text-[11px] text-slate-400">Contact dormitory personnel</p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 transition hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Public Home</span>
          </Link>
        </div>
      </aside>

      {/* Mobile Top Bar & Portal Switcher */}
      <header className="bg-[#152852] text-white lg:hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3.5">
          <Link to="/" className="inline-flex items-center">
            <img
              src="/oap-logo.png"
              alt="MSUN Girls Dormitory — Occupancy Analytics Platform"
              className="h-11 w-auto object-contain"
            />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-300 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Public Home</span>
          </Link>
        </div>

        <div className="px-4 py-3">
          <p className="mb-2 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
            ACCOUNT ACCESS
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleSwitchPortal('dormer')}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs transition ${
                portal === 'dormer'
                  ? 'bg-[#E2B743] text-[#152852] font-semibold'
                  : 'bg-white/5 font-medium text-slate-300 hover:bg-white/10'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Dormer</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchPortal('personnel')}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs transition ${
                portal === 'personnel'
                  ? 'bg-[#E2B743] text-[#152852] font-semibold'
                  : 'bg-white/5 font-medium text-slate-300 hover:bg-white/10'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Dorm personnel</span>
            </button>
          </div>
        </div>
      </header>

      {/* Right Workspace */}
      <div className="flex min-h-screen flex-1 flex-col bg-[#FFF8EB]">
        {/* Top Bar */}
        <div className="flex items-center justify-between border-b border-[#EFE6D2] bg-white/80 px-6 py-4 backdrop-blur lg:px-10">
          <p className="text-xs font-semibold text-slate-500">
            <span className="text-[#152852] font-bold">OAP</span> / Account access
          </p>
          <span className="rounded-full border border-[#EFE6D2] bg-[#FFF8EB] px-3 py-1 text-[11px] font-semibold text-[#152852]">
            {portalLabel}
          </span>
        </div>

        {/* Main Content */}
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8 lg:px-10 lg:py-10">
          {/* Page Heading */}
          <div>
            <p className="text-[11px] font-bold tracking-widest text-[#152852] uppercase">
              {portal === 'dormer' ? 'DORMER PORTAL' : 'DORM PERSONNEL PORTAL'}
            </p>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-[#152852] sm:text-3xl">
              {portal === 'dormer' ? 'Welcome back, dormer' : 'Welcome, dorm personnel'}
            </h1>
            <p className="mt-1.5 text-sm text-slate-600">
              {portal === 'dormer'
                ? 'Log in to manage your dormitory requests, pass slips, and renewal.'
                : 'Log in to manage residents, review requests, and monitor your dormitory.'}
            </p>
          </div>

          {/* Two-Column Content Grid */}
          <div className="mt-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            {/* Left: Login Card */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-slate-100 bg-white p-7 shadow-sm">
                <h2 className="text-lg font-bold text-[#152852]">Log in to your account</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {portal === 'dormer'
                    ? 'Enter your student credentials to continue.'
                    : 'Enter your staff credentials to continue.'}
                </p>

                {authError && (
                  <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                    <span>{authError}</span>
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} noValidate className="mt-5 space-y-4">
                  <div>
                    <label
                      htmlFor="login-identifier"
                      className="block text-xs font-semibold text-[#152852]"
                    >
                      {portal === 'dormer' ? 'Student email *' : 'Staff email *'}
                    </label>
                    <input
                      id="login-identifier"
                      type="email"
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        if (authError) setAuthError('');
                      }}
                      placeholder={
                        portal === 'dormer'
                          ? 'Enter your student email'
                          : 'Enter your staff email'
                      }
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#152852] focus:outline-none focus:ring-2 focus:ring-[#152852]/15"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="login-password"
                      className="block text-xs font-semibold text-[#152852]"
                    >
                      Password *
                    </label>
                    <div className="relative mt-1.5">
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (authError) setAuthError('');
                        }}
                        placeholder="Enter your password"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-16 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#152852] focus:outline-none focus:ring-2 focus:ring-[#152852]/15"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-xs font-semibold text-[#152852] hover:text-[#1e3a75] cursor-pointer"
                      >
                        {showPassword ? (
                          <>
                            <EyeOff className="h-3.5 w-3.5" />
                            <span>Hide</span>
                          </>
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5" />
                            <span>Show</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 accent-[#152852]"
                      />
                      <span>Remember me</span>
                    </label>

                    <button
                      type="button"
                      onClick={openForgotModal}
                      className="text-xs font-semibold text-[#152852] hover:text-[#1e3a75] hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-[#152852] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#1e3a75] cursor-pointer"
                  >
                    {portal === 'dormer' ? 'Log in as dormer' : 'Log in as dorm personnel'}
                  </button>
                </form>

                {/* Divider & Helper Link */}
                <div className="mt-6 border-t border-slate-100 pt-5 text-center">
                  {portal === 'dormer' ? (
                    <p className="text-xs text-slate-600">
                      First time logging in?{' '}
                      <button
                        type="button"
                        onClick={openActivateModal}
                        className="font-semibold text-[#152852] hover:text-[#1e3a75] hover:underline cursor-pointer"
                      >
                        Activate your account
                      </button>
                    </p>
                  ) : (
                    <p className="text-xs text-slate-600">
                      Need a staff account?{' '}
                      <button
                        type="button"
                        onClick={() => setActiveModal('contact_admin')}
                        className="font-semibold text-[#152852] hover:text-[#1e3a75] hover:underline cursor-pointer"
                      >
                        Contact your administrator
                      </button>
                    </p>
                  )}

                  <p className="mt-2.5 text-[11px] text-slate-400">
                    Use only your own account. Keep your login details private.
                  </p>
                </div>
              </div>

              <p className="mt-4 text-center text-[11px] text-slate-500">
                Mindanao State University at Naawan &middot; Authorized users only
              </p>
            </div>

            {/* Right: Before you log in Card */}
            <aside className="lg:col-span-5">
              <div className="h-fit rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <h2 className="text-base font-bold text-[#152852]">Before you log in</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Quick reminders for accessing your portal.
                </p>

                <div className="mt-5 space-y-4">
                  {portal === 'dormer' ? (
                    <>
                      <div className="flex items-start gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#EFE6D2] bg-[#FFF8EB] text-xs font-bold text-[#152852]">
                          01
                        </span>
                        <div>
                          <p className="text-xs font-bold text-[#152852]">
                            Use your resident account
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Sign in with your registered student email.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#EFE6D2] bg-[#FFF8EB] text-xs font-bold text-[#152852]">
                          02
                        </span>
                        <div>
                          <p className="text-xs font-bold text-[#152852]">Manage your requests</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            View your room assignment, submit pass slips, and track renewals.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#EFE6D2] bg-[#FFF8EB] text-xs font-bold text-[#152852]">
                          03
                        </span>
                        <div>
                          <p className="text-xs font-bold text-[#152852]">Need assistance?</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            First-time residents can activate their account using the temporary
                            password from the Dormitory Office.
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#EFE6D2] bg-[#FFF8EB] text-xs font-bold text-[#152852]">
                          01
                        </span>
                        <div>
                          <p className="text-xs font-bold text-[#152852]">
                            Use your staff account
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Log in with your official MSUN Dormitory Personnel email address.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#EFE6D2] bg-[#FFF8EB] text-xs font-bold text-[#152852]">
                          02
                        </span>
                        <div>
                          <p className="text-xs font-bold text-[#152852]">
                            Access your workspace
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Review applicants, manage rooms and beds, and monitor attendance.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#EFE6D2] bg-[#FFF8EB] text-xs font-bold text-[#152852]">
                          03
                        </span>
                        <div>
                          <p className="text-xs font-bold text-[#152852]">Having trouble?</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Contact your dormitory administrator for staff role provisioning or
                            credential resets.
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </main>

        {/* Bottom Footer */}
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EFE6D2] px-6 py-4 text-[11px] text-slate-500 lg:px-10">
          <span>OAP &mdash; Occupancy Analytics Platform | MSU at Naawan</span>
          <span>{portalLabel}</span>
        </footer>
      </div>

      {/* MODAL 1: Activate Your Account */}
      {activeModal === 'activate' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/45 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              aria-label="Close modal"
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#EFE6D2] bg-[#FFF8EB] text-[#152852]">
                <UserCheck className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-[#152852]">Activate your account</h3>
                <p className="text-xs text-slate-500">
                  Set your personal password for first-time dormer access.
                </p>
              </div>
            </div>

            {actError && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <span>{actError}</span>
              </div>
            )}

            <form onSubmit={handleActivateSubmit} noValidate className="mt-5 space-y-3.5">
              <div>
                <label
                  htmlFor="activate-identifier"
                  className="block text-xs font-semibold text-[#152852]"
                >
                  Student email *
                </label>
                <input
                  id="activate-identifier"
                  type="email"
                  value={actIdentifier}
                  onChange={(e) => {
                    setActIdentifier(e.target.value);
                    if (actError) setActError('');
                  }}
                  placeholder="Enter your student email"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#152852] focus:outline-none focus:ring-2 focus:ring-[#152852]/15"
                />
              </div>

              <div>
                <label
                  htmlFor="activate-temp-password"
                  className="block text-xs font-semibold text-[#152852]"
                >
                  Temporary password *
                </label>
                <div className="relative mt-1">
                  <input
                    id="activate-temp-password"
                    type={actShowTemp ? 'text' : 'password'}
                    value={actTempPassword}
                    onChange={(e) => {
                      setActTempPassword(e.target.value);
                      if (actError) setActError('');
                    }}
                    placeholder="Issued by the Dormitory Office"
                    className="w-full rounded-xl border border-slate-200 py-2 pl-3.5 pr-14 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#152852] focus:outline-none focus:ring-2 focus:ring-[#152852]/15"
                  />
                  <button
                    type="button"
                    onClick={() => setActShowTemp((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#152852] hover:text-[#1e3a75] cursor-pointer"
                  >
                    {actShowTemp ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="activate-new-password"
                  className="block text-xs font-semibold text-[#152852]"
                >
                  New password *
                </label>
                <div className="relative mt-1">
                  <input
                    id="activate-new-password"
                    type={actShowNew ? 'text' : 'password'}
                    value={actNewPassword}
                    onChange={(e) => {
                      setActNewPassword(e.target.value);
                      if (actError) setActError('');
                    }}
                    placeholder="Minimum 8 characters"
                    className="w-full rounded-xl border border-slate-200 py-2 pl-3.5 pr-14 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#152852] focus:outline-none focus:ring-2 focus:ring-[#152852]/15"
                  />
                  <button
                    type="button"
                    onClick={() => setActShowNew((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#152852] hover:text-[#1e3a75] cursor-pointer"
                  >
                    {actShowNew ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="activate-confirm-password"
                  className="block text-xs font-semibold text-[#152852]"
                >
                  Confirm new password *
                </label>
                <input
                  id="activate-confirm-password"
                  type="password"
                  value={actConfirmPassword}
                  onChange={(e) => {
                    setActConfirmPassword(e.target.value);
                    if (actError) setActError('');
                  }}
                  placeholder="Re-enter your new password"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#152852] focus:outline-none focus:ring-2 focus:ring-[#152852]/15"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#152852] px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#1e3a75] cursor-pointer"
                >
                  Activate &amp; log in
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Forgot Password */}
      {activeModal === 'forgot' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/45 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              aria-label="Close modal"
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#EFE6D2] bg-[#FFF8EB] text-[#152852]">
                <KeyRound className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-[#152852]">Forgot password?</h3>
                <p className="text-xs text-slate-500">
                  Submit a password reset request to the Dormitory Office.
                </p>
              </div>
            </div>

            {!forgotSubmitted ? (
              <form onSubmit={handleForgotSubmit} noValidate className="mt-5 space-y-4">
                {forgotError && (
                  <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{forgotError}</span>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="forgot-identifier"
                    className="block text-xs font-semibold text-[#152852]"
                  >
                    Email address *
                  </label>
                  <input
                    id="forgot-identifier"
                    type="email"
                    value={forgotIdentifier}
                    onChange={(e) => {
                      setForgotIdentifier(e.target.value);
                      if (forgotError) setForgotError('');
                    }}
                    placeholder="Enter your email address"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#152852] focus:outline-none focus:ring-2 focus:ring-[#152852]/15"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-[#152852] px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#1e3a75] cursor-pointer"
                  >
                    Submit reset request
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <div>
                    <p className="font-bold">Reset request recorded</p>
                    <p className="mt-1 leading-relaxed text-emerald-800">
                      Your request for <span className="font-semibold">{forgotIdentifier}</span>{' '}
                      has been logged for the MSUN Girls Dormitory Office. Please visit the
                      Dormitory Personnel Desk with your valid school ID to receive a temporary
                      reset password.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="rounded-xl bg-[#152852] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1e3a75] cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: Contact Your Administrator */}
      {activeModal === 'contact_admin' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/45 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              aria-label="Close modal"
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#EFE6D2] bg-[#FFF8EB] text-[#152852]">
                <HelpCircle className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-[#152852]">Contact your administrator</h3>
                <p className="text-xs text-slate-500">
                  Dormitory staff account provisioning instructions
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3 rounded-xl border border-[#EFE6D2] bg-[#FFF8EB] p-4 text-xs text-slate-700">
              <div className="flex items-start gap-2.5">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-[#152852]" />
                <div>
                  <p className="font-bold text-[#152852]">
                    MSU at Naawan Girls Dormitory Office
                  </p>
                  <p className="mt-0.5 text-slate-600">
                    Personnel accounts are created exclusively by the Dormitory Head / System
                    Administrator.
                  </p>
                </div>
              </div>

              <div className="border-t border-[#EFE6D2] pt-3 space-y-1.5">
                <p>
                  <span className="font-semibold text-[#152852]">Office Hours:</span> Monday &ndash;
                  Friday, 8:00 AM &ndash; 5:00 PM
                </p>
                <p>
                  <span className="font-semibold text-[#152852]">Location:</span> Dormitory
                  Administration Desk, MSUN Campus
                </p>
                <p>
                  <span className="font-semibold text-[#152852]">Staff Email Desk:</span>{' '}
                  admin@msunaawan.edu.ph
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-xl bg-[#152852] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1e3a75] cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
