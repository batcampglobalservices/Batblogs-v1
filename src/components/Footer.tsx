import { Link } from 'react-router-dom';


const footerLinks = [
  { label: 'Home', to: '/' },
  { label: 'Posts', to: '/posts' },
];

const Footer = () => {
  return (
    <footer className="border-t border-slate-200 bg-white text-slate-600">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs sm:flex-row sm:gap-0 sm:px-6 md:px-10">
        <span className="font-bold text-slate-800">BatBlogs</span>
        <nav className="flex gap-4">
          {footerLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="hover:text-sky-600 transition"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <span className="text-slate-400">© {new Date().getFullYear()} BatBlogs. All rights reserved.</span>
      </div>
    </footer>
  );
};

export default Footer;