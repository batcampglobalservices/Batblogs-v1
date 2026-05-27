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
    eyebrow: 'AI field notes',
    stat: 'Fresh thinking',
    title: 'Read human stories about building with intelligent systems.',
    description:
      'A slick editorial stream for essays, product notes, research takeaways, and practical AI lessons.',
    imageUrl:
      'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1400&q=80',
  },
  {
    id: 2,
    eyebrow: 'For builders',
    stat: 'Write, refine, publish',
    title: 'Turn experiments, prompts, and product lessons into stories.',
    description:
      'Publish ideas with a calm interface that keeps the focus on the thinking, not the tooling.',
    imageUrl:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=80',
  },
  {
    id: 3,
    eyebrow: 'For focused discovery',
    stat: 'Less noise',
    title: 'Find signal across AI strategy, tools, and culture.',
    description:
      'Move through topics quickly, save your attention, and open the stories that actually matter.',
    imageUrl:
      'https://images.unsplash.com/photo-1535223289827-42f1e9919769?auto=format&fit=crop&w=1400&q=80',
  },
  {
    id: 4,
    eyebrow: 'For standout perspectives',
    stat: 'More signal',
    title: 'A front page that feels curated, useful, and alive.',
    description:
      'Discover writing that connects technical progress to real people, teams, and decisions.',
    imageUrl:
      'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1400&q=80',
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
    <section className="px-4 py-8 sm:px-6 md:px-10 md:py-10">
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="overflow-hidden rounded-[2rem] bg-white/78 p-2 shadow-2xl shadow-slate-900/12 backdrop-blur">
          <Swiper
            modules={[Autoplay, Pagination]}
            slidesPerView={1}
            spaceBetween={16}
            loop
            pagination={{ clickable: true }}
            autoplay={{ delay: 3400, disableOnInteraction: false }}
            className="rounded-[1.65rem]"
          >
            {slides.map((slide) => (
              <SwiperSlide key={slide.id}>
                <div
                  className="relative flex min-h-[25rem] flex-col justify-end overflow-hidden rounded-[1.65rem] bg-cover bg-center p-5 text-white sm:min-h-[30rem] sm:p-8 lg:p-10"
                  style={{
                    backgroundImage: `linear-gradient(to top, rgba(2, 6, 23, 0.86), rgba(15, 23, 42, 0.34), rgba(15, 23, 42, 0.04)), url(${slide.imageUrl})`,
                  }}
                >
                  <div className="absolute inset-x-0 bottom-0 h-48 bg-linear-to-t from-slate-950/65 to-transparent" />

                  <motion.div
                    className="relative z-10 max-w-2xl"
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <span className="inline-flex rounded-full bg-white/14 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white shadow-lg shadow-black/10 backdrop-blur-sm">
                      {slide.eyebrow}
                    </span>

                    <div className="mt-5 flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-100/90">
                      <span className="rounded-full bg-white/12 px-3 py-1.5 shadow-sm shadow-black/10">
                        {slide.stat}
                      </span>
                      <span>Stories worth opening</span>
                    </div>

                    <h2 className="mt-5 max-w-2xl text-3xl font-black leading-tight sm:text-4xl md:text-5xl">
                      {slide.title}
                    </h2>
                    <p className="mt-4 max-w-xl text-sm leading-7 text-white/85 sm:text-base">
                      {slide.description}
                    </p>

                    <div className="mt-7 flex flex-wrap gap-3">
                      <Link
                        to="/posts"
                        className="rounded-full bg-white px-5 py-3 text-sm font-bold text-black shadow-xl shadow-black/20 transition hover:bg-sky-100"
                      >
                        Explore posts
                      </Link>
                      <Link
                        to="/new-blog"
                        className="rounded-full bg-white/12 px-5 py-3 text-sm font-bold !text-white shadow-lg shadow-black/10 backdrop-blur-sm transition hover:bg-white/20"
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
          <div className="rounded-[1.75rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/16">
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
              className="rounded-[1.5rem] bg-white/82 p-5 shadow-xl shadow-slate-900/7 backdrop-blur"
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
