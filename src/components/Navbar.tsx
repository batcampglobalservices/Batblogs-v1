import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { clearAuthSession, getAuthUser } from '../lib/api';

const primaryLinks = [
  { label: 'Home', to: '/', end: true },
  { label: 'Posts', to: '/posts' },
];

const signedInLinks = [
  { label: 'My Posts', to: '/my-posts' },
  { label: 'New Post', to: '/new-blog' },
];

const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-3xl px-4 py-2 text-sm font-semibold transition ${
    isActive
      ? 'bg-white text-slate-950 shadow-sm'
      : 'text-slate-200 hover:bg-white/10 hover:text-white'
  }`;

const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-3xl px-4 py-3 text-sm font-semibold transition ${
    isActive
      ? 'bg-sky-100 text-slate-950'
      : 'text-slate-200 hover:bg-white/8 hover:text-white'
  }`;

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const user = getAuthUser();

  const handleLogout = () => {
    clearAuthSession();
    setIsMenuOpen(false);
    navigate('/login', { replace: true });
  };

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <nav className="sticky top-0 z-50 px-3 pt-3 sm:px-4 md:px-6">
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className={`mx-auto max-w-6xl overflow-hidden rounded-4xl border text-white backdrop-blur-xl transition ${
          isScrolled
            ? 'border-white/18 bg-slate-950/90 shadow-[0_18px_48px_rgba(15,23,42,0.22)]'
            : 'border-white/12 bg-slate-950/72 shadow-[0_12px_34px_rgba(15,23,42,0.16)]'
        }`}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <Link to="/" className="flex items-center gap-3" onClick={closeMenu}>
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-3xl bg-linear-to-br from-sky-300 via-cyan-200 to-white text-sm font-black text-slate-950 shadow-md shadow-sky-900/20">
              BB
            </span>
            <span>
              <span className="block text-[10px] uppercase tracking-[0.32em] text-sky-200/80">
                Editorial Hub
              </span>
              <span className="block text-lg font-black tracking-tight text-white">
                BatBlogs
              </span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 lg:flex">
            {primaryLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={desktopLinkClass}
              >
                {link.label}
              </NavLink>
            ))}

            {user &&
              signedInLinks.map((link) => (
                <NavLink key={link.to} to={link.to} className={desktopLinkClass}>
                  {link.label}
                </NavLink>
              ))}

            {user?.role === 'superadmin' && (
              <NavLink to="/superadmin" className={desktopLinkClass}>
                Superadmin
              </NavLink>
            )}
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            {user ? (
              <>
                <div className="rounded-3xl border border-white/12 bg-white/8 px-4 py-2 text-sm text-slate-200">
                  @{user.username}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-3xl border border-white/12 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10 hover:text-white"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={desktopLinkClass}>
                  Login
                </NavLink>
                <NavLink
                  to="/register"
                  className="rounded-3xl bg-linear-to-r from-sky-300 to-cyan-200 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-105"
                >
                  Register
                </NavLink>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsMenuOpen((current) => !current)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-3xl border border-white/12 bg-white/8 text-white lg:hidden"
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            <span className="relative h-5 w-5">
              <span
                className={`absolute left-0 top-1/2 block h-0.5 w-5 -translate-y-2 bg-current transition ${
                  isMenuOpen ? 'translate-y-0 rotate-45' : ''
                }`}
              />
              <span
                className={`absolute left-0 top-1/2 block h-0.5 w-5 bg-current transition ${
                  isMenuOpen ? 'opacity-0' : ''
                }`}
              />
              <span
                className={`absolute left-0 top-1/2 block h-0.5 w-5 translate-y-2 bg-current transition ${
                  isMenuOpen ? 'translate-y-0 -rotate-45' : ''
                }`}
              />
            </span>
          </button>
        </div>

        <AnimatePresence initial={false}>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="overflow-hidden border-t border-white/10 lg:hidden"
            >
              <div className="space-y-2 px-3 py-3">
                {primaryLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    className={mobileLinkClass}
                    onClick={closeMenu}
                  >
                    {link.label}
                  </NavLink>
                ))}

                {user &&
                  signedInLinks.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      className={mobileLinkClass}
                      onClick={closeMenu}
                    >
                      {link.label}
                    </NavLink>
                  ))}

                {user?.role === 'superadmin' && (
                  <NavLink to="/superadmin" className={mobileLinkClass} onClick={closeMenu}>
                    Superadmin
                  </NavLink>
                )}

                {user ? (
                  <>
                    <div className="rounded-3xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-slate-200">
                      Logged in as @{user.username}
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full rounded-3xl border border-white/12 px-4 py-3 text-left text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <NavLink to="/login" className={mobileLinkClass} onClick={closeMenu}>
                      Login
                    </NavLink>
                    <NavLink
                      to="/register"
                      className="block rounded-3xl bg-linear-to-r from-sky-300 to-cyan-200 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-105"
                      onClick={closeMenu}
                    >
                      Register
                    </NavLink>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </nav>
  );
};

export default Navbar;