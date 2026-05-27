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
  `rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-150 ${
    isActive
      ? 'bg-slate-100 text-slate-900'
      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
  }`;

const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-lg px-4 py-3 text-sm font-medium transition-colors duration-150 ${
    isActive
      ? 'bg-slate-100 text-slate-900'
      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
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
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur">
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-5"
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <Link to="/" className="flex items-center gap-2 group" onClick={closeMenu}>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-base font-bold text-white group-hover:bg-slate-700 transition">BB</span>
            <span className="text-lg font-bold text-slate-900 tracking-tight">BatBlogs</span>
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
                <div className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-700 font-medium">
                  @{user.username}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
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
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                >
                  Register
                </NavLink>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsMenuOpen((current) => !current)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-900 lg:hidden"
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            <svg width="22" height="22" fill="none" viewBox="0 0 22 22" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="7" x2="18" y2="7" />
              <line x1="4" y1="11" x2="18" y2="11" />
              <line x1="4" y1="15" x2="18" y2="15" />
            </svg>
          </button>
        </div>

        <AnimatePresence initial={false}>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="overflow-hidden border-t border-slate-200 bg-white lg:hidden"
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
                    <div className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700 font-medium">
                      Logged in as @{user.username}
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full rounded-lg border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
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
                      className="block rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-700"
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