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

const logoSrc = `${process.env.PUBLIC_URL}/new_modern-logo.png`;

const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-4 py-2 text-sm font-semibold transition duration-150 ${
    isActive
      ? 'bg-slate-950 !text-white shadow-lg shadow-slate-900/10'
      : '!text-slate-600 hover:bg-white hover:!text-slate-950'
  }`;

const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-150 ${
    isActive
      ? 'bg-slate-950 !text-white'
      : '!text-slate-700 hover:bg-slate-50 hover:!text-slate-900'
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
    <nav
      className={`sticky top-0 z-50 w-full backdrop-blur-xl transition ${
        isScrolled
          ? 'bg-white/90 shadow-xl shadow-slate-900/8'
          : 'bg-white/72 shadow-sm shadow-white/60'
      }`}
    >
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto flex w-full max-w-6xl flex-col px-4 py-3 sm:px-6 lg:px-0"
      >
        <div className="flex w-full items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 group" onClick={closeMenu}>
            <span className="inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 shadow-lg shadow-slate-900/20 transition group-hover:shadow-sky-700/20">
              <img src={logoSrc} alt="BatCamp Global Services logo" className="h-full w-full object-cover" />
            </span>
            <span className="text-lg font-black tracking-tight text-slate-950">BatCamp Blogs</span>
          </Link>

          <div className="hidden items-center gap-1 rounded-full bg-white/82 p-1 shadow-inner shadow-slate-900/8 lg:flex">
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
                <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm shadow-slate-900/8">
                  @{user.username}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm shadow-slate-900/8 transition hover:bg-rose-50 hover:text-rose-700"
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
                  className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold !text-white shadow-lg shadow-slate-900/10 transition hover:bg-sky-700"
                >
                  Register
                </NavLink>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsMenuOpen((current) => !current)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-lg shadow-slate-900/10 lg:hidden"
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
              className="mt-3 w-full overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-900/14 lg:hidden"
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
                    <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
                      Logged in as @{user.username}
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full rounded-2xl bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 shadow-sm shadow-slate-900/8 transition hover:bg-rose-50 hover:text-rose-700"
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
                      className="block rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold !text-white transition hover:bg-sky-700"
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
