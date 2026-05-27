import { Link } from 'react-router-dom';

const footerLinks = [
  { label: 'Home', to: '/' },
  { label: 'Posts', to: '/posts' },
  { label: 'My Posts', to: '/my-posts' },
  { label: 'New Post', to: '/new-blog' },
];

const Footer = () => {
  return (
    <footer className="relative mt-16 border-t border-slate-200/70 bg-slate-950 text-slate-200">
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-sky-400/70 to-transparent" />

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.25fr_0.75fr_0.8fr] md:px-10 md:py-14">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">
            BatBlogs
          </p>
          <h2 className="mt-4 max-w-sm text-2xl font-black tracking-tight text-white">
            Stories with signal, texture, and a point of view.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-slate-400">
            Read thoughtful takes, publish your own ideas, and keep the conversation moving without the usual content sludge.
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
            Navigate
          </p>
          <div className="mt-4 grid gap-3">
            {footerLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm text-slate-300 transition hover:text-sky-300"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
            Why it works
          </p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-400">
            <p>Clean reading surfaces, sharper discovery, and lightweight AI tools where they actually help.</p>
            <p className="text-slate-500">
              Built for readers who want fresh thinking and writers who want less friction.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between md:px-10">
          <span>BatBlogs</span>
          <span>Read well. Write clearly. Publish with intent.</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;