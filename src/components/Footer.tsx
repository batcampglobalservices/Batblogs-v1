import { Link } from 'react-router-dom';


const footerLinks = [
  { label: 'Home', to: '/' },
  { label: 'Posts', to: '/posts' },
];

const logoSrc = `${process.env.PUBLIC_URL}/new_modern-logo.png`;

const Footer = () => {
  return (
    <footer className="bg-slate-950 text-slate-300 shadow-[0_-24px_60px_rgba(15,23,42,0.12)]">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_auto] md:px-0">
        <div>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-slate-900 shadow-xl shadow-black/30">
              <img src={logoSrc} alt="BatCamp Global Services logo" className="h-full w-full object-cover" />
            </span>
            <span className="text-lg font-black tracking-tight text-white">BatCamp Blogs</span>
          </div>
          <p className="mt-4 max-w-md text-sm leading-7 text-slate-400">
            A modern AI blogs space for thoughtful writers, builders, and curious readers.
          </p>
        </div>

        <div className="flex flex-col gap-5 md:items-end">
          <nav className="flex flex-wrap gap-3 text-sm font-semibold">
            {footerLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-full bg-white/8 px-4 py-2 shadow-sm shadow-black/20 transition hover:bg-sky-400 hover:text-slate-950"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <span className="text-xs text-slate-500">© {new Date().getFullYear()} BatBlogs. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
