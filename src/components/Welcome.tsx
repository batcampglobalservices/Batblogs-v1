import { motion } from 'framer-motion';
import { Autoplay, Pagination } from 'swiper/modules';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/pagination';
import Reveal from './motion/Reveal';

const slides = [
  {
    id: 1,
    eyebrow: 'For curious readers',
    stat: 'Fresh thinking daily',
    title: 'Welcome to Bat Blogs',
    description:
      'Discover a world of captivating stories and insights from our passionate bloggers.',
    imageUrl:
      'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 2,
    eyebrow: 'For active writers',
    stat: 'Write, refine, publish',
    title: 'Join Our Community',
    description:
      'Connect with like-minded individuals and share your own stories on Bat Blogs.',
    imageUrl:
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 3,
    eyebrow: 'For focused discovery',
    stat: 'Ideas across every lane',
    title: 'Explore Diverse Topics',
    description:
      'From technology to lifestyle, find blogs that cater to your interests on Bat Blogs.',
    imageUrl:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 4,
    eyebrow: 'For standout perspectives',
    stat: 'Less noise, more signal',
    title: 'Explore Diverse Topics',
    description:
      'From technology to lifestyle, find blogs that cater to your interests on Bat Blogs.',
    imageUrl:
      'https://images.unsplash.com/photo-1519337265831-281ec6cc8514?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8QkxvZ3N8ZW58MHx8MHx8fDA%3D',
  },
];

const pulseItems = [
  {
    title: 'Sharper discovery',
    description: 'Browse by topic, jump into recommendations, and find the next good read faster.',
  },
  {
    title: 'Built for publishing',
    description: 'Draft, refine, repurpose, and push stories live without fighting the interface.',
  },
  {
    title: 'Made to share',
    description: 'Every strong article deserves simple distribution across the channels that matter.',
  },
];

const WelcomeComponent = () => {
  return (
    <section className="px-4 pt-4 sm:px-6 md:px-10 md:pt-6">
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="overflow-hidden rounded-4xl border border-white/70 bg-white/70 p-2 shadow-2xl shadow-slate-900/10 backdrop-blur">
          <Swiper
            modules={[Autoplay, Pagination]}
            slidesPerView={1}
            spaceBetween={16}
            loop
            pagination={{ clickable: true }}
            autoplay={{ delay: 3400, disableOnInteraction: false }}
            className="rounded-[1.75rem]"
          >
            {slides.map((slide) => (
              <SwiperSlide key={slide.id}>
                <div
                  className="relative flex min-h-[28rem] flex-col justify-end overflow-hidden rounded-[1.75rem] bg-cover bg-center p-7 text-white sm:min-h-[32rem] sm:p-10"
                  style={{
                    backgroundImage: `linear-gradient(to top, rgba(15, 23, 42, 0.82), rgba(15, 23, 42, 0.22)), url(${slide.imageUrl})`,
                  }}
                >
                  <div className="absolute inset-x-0 bottom-0 h-48 bg-linear-to-t from-slate-950/55 to-transparent" />

                  <motion.div
                    className="relative z-10 max-w-2xl"
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <span className="inline-flex rounded-3xl border border-white/20 bg-white/12 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/90 backdrop-blur-sm">
                      {slide.eyebrow}
                    </span>

                    <div className="mt-5 flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-100/90">
                      <span className="rounded-3xl border border-white/18 bg-white/10 px-3 py-1.5">
                        {slide.stat}
                      </span>
                      <span>Stories worth opening</span>
                    </div>

                    <h1 className="mt-5 max-w-2xl text-3xl font-black leading-tight sm:text-4xl md:text-5xl">
                      {slide.title}
                    </h1>
                    <p className="mt-4 max-w-xl text-sm leading-7 text-white/85 sm:text-base">
                      {slide.description}
                    </p>

                    <div className="mt-7 flex flex-wrap gap-3">
                      <Link
                        to="/posts"
                        className="rounded-3xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-100"
                      >
                        Explore posts
                      </Link>
                      <Link
                        to="/new-blog"
                        className="rounded-3xl border border-white/18 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/16"
                      >
                        Write a story
                      </Link>
                    </div>
                  </motion.div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        <Reveal className="grid gap-4">
          <div className="rounded-4xl border border-slate-900/10 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/10">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
              Inside today&apos;s edition
            </p>
            <h2 className="mt-4 text-2xl font-black leading-tight">
              Shorter discovery loops. Better reading energy.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              BatBlogs is tuned for readers who want fresher angles and writers who want less drag between a good idea and a finished post.
            </p>
          </div>

          {pulseItems.map((item) => (
            <div
              key={item.title}
              className="rounded-4xl border border-white/70 bg-white/72 p-5 shadow-lg shadow-slate-900/5 backdrop-blur"
            >
              <p className="text-sm font-semibold text-slate-950">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
};

export default WelcomeComponent;
