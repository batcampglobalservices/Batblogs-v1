import { Link } from 'react-router-dom';
import Reveal from './motion/Reveal';

export type TopicCard = {
  id: string;
  name: string;
  description: string;
  posts: number;
  imageUrl: string;
};

type BlogsListProps = {
  topics: TopicCard[];
  isLoading?: boolean;
};

const BlogsList = ({ topics, isLoading = false }: BlogsListProps) => {
  return (
    <section className="w-full px-4 py-10 sm:px-6 md:px-10 md:py-14">
      <div className="mx-auto max-w-6xl rounded-4xl border border-white/70 bg-white/76 p-6 shadow-xl shadow-slate-900/5 backdrop-blur sm:p-8">
        <Reveal className="mb-8 text-center md:mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-700">
            Explore
          </p>
          <h2 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl md:text-4xl">
            Trending Topics
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base md:text-lg">
            Explore the subjects readers are loving most right now on Bat Blogs.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {isLoading &&
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm sm:p-6"
              >
                <div className="h-44 animate-pulse rounded-2xl bg-slate-200 sm:h-40 xl:h-44" />
                <div className="mt-5 h-6 w-2/3 animate-pulse rounded bg-slate-200" />
                <div className="mt-3 h-14 animate-pulse rounded bg-slate-100" />
              </div>
            ))}

          {!isLoading &&
            topics.map((topic, index) => (
              <Reveal key={topic.id} delay={index * 0.08}>
                <article
                key={topic.id}
                className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-6"
              >
                  <div className="overflow-hidden rounded-2xl">
                    <div
                      className="h-44 w-full bg-cover bg-center bg-slate-200 transition duration-300 group-hover:scale-105 sm:h-40 xl:h-44"
                      style={{ backgroundImage: `url(${topic.imageUrl})` }}
                    />
                  </div>

                  <div className="mt-5 flex flex-1 flex-col">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
                        {topic.name}
                      </h2>
                      <span className="inline-flex rounded-2xl bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {topic.posts} posts
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {topic.description}
                    </p>

                    <div className="mt-5">
                      <Link
                        to={`/posts?category=${encodeURIComponent(topic.name)}`}
                        className="inline-flex w-full rounded-2xl bg-slate-300 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-sky-600"
                      >
                        Explore topic
                      </Link>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
        </div>

        {!isLoading && topics.length === 0 && (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white/70 p-6 text-center text-sm text-slate-600">
            No categories are live yet. Create categories and publish posts from the dashboard.
          </div>
        )}

        <div className="mt-8 text-center md:mt-10">
          <Link
            to="/posts"
            className="inline-flex w-full rounded-2xl bg-slate-900 px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
          >
            View All Topics
          </Link>
        </div>
      </div>
    </section>
  );
};

export default BlogsList;