import { Link } from 'react-router-dom';
import {
  BlogPost,
  getAuthorName,
  getPostExcerpt,
  getPostImageUrl,
  getReadTimeLabel,
} from '../lib/content';
import Reveal from './motion/Reveal';

type LastestPostsProps = {
  featuredPost: BlogPost | null;
  recommendedPosts: BlogPost[];
  latestPosts: BlogPost[];
  isLoading?: boolean;
};

const LastestPosts = ({
  featuredPost,
  recommendedPosts,
  latestPosts,
  isLoading = false,
}: LastestPostsProps) => {
  return (
    <section className="w-full px-4 py-10 sm:px-6 md:px-10 md:py-14">
      <div className="mx-auto max-w-6xl rounded-4xl border border-white/70 bg-white/76 p-6 shadow-xl shadow-slate-900/5 backdrop-blur sm:p-8">
        <Reveal className="mb-8 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-700">
              Recommended
            </p>
            <h2 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl md:text-4xl">
              Latest & Recommended Posts
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base md:text-lg">
              Handpicked stories and recent posts readers should not miss.
            </p>
          </div>

          <Link
            to="/posts"
            className="inline-flex w-full rounded-2xl bg-slate-900 px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-sky-600 sm:w-auto"
          >
            Browse All Posts
          </Link>
        </Reveal>

        {isLoading ? (
          <div className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
            <div className="min-h-96 animate-pulse rounded-3xl bg-slate-200" />
            <div className="grid gap-6">
              <div className="h-64 animate-pulse rounded-3xl bg-slate-200" />
              <div className="h-64 animate-pulse rounded-3xl bg-slate-200" />
            </div>
          </div>
        ) : featuredPost ? (
          <>
            <div className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
              <Reveal>
                <article className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div
                    className="min-h-72 bg-cover bg-center sm:min-h-80 lg:min-h-96"
                    style={{
                      backgroundImage: `linear-gradient(to top, rgba(15, 23, 42, 0.72), rgba(15, 23, 42, 0.18)), url(${getPostImageUrl(featuredPost)})`,
                    }}
                  />
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
                      <span className="rounded-2xl bg-sky-100 px-3 py-1 text-sky-700">
                        {featuredPost.category}
                      </span>
                      <span>{getReadTimeLabel(featuredPost)}</span>
                      <span>{getAuthorName(featuredPost.author)}</span>
                    </div>

                    <h3 className="mt-4 text-xl font-bold text-slate-900 sm:text-2xl">
                      {featuredPost.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                      {getPostExcerpt(featuredPost)}
                    </p>

                    <Link
                      to={`/posts/${featuredPost.slug}`}
                      className="mt-5 inline-flex rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600"
                    >
                      Read Featured Post
                    </Link>
                  </div>
                </article>
              </Reveal>

              <div className="grid gap-6">
                {recommendedPosts.map((post, index) => (
                  <Reveal key={post._id} delay={0.08 * (index + 1)}>
                    <article
                    key={post._id}
                    className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >
                      <div
                        className="h-48 bg-cover bg-center"
                        style={{ backgroundImage: `url(${getPostImageUrl(post)})` }}
                      />
                      <div className="p-5">
                        <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
                          <span className="rounded-2xl bg-slate-100 px-3 py-1 text-slate-700">
                            {post.category}
                          </span>
                          <span>{getReadTimeLabel(post)}</span>
                        </div>

                        <h3 className="mt-4 text-lg font-semibold text-slate-900">
                          {post.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {getPostExcerpt(post)}
                        </p>

                        <Link
                          to={`/posts/${post.slug}`}
                          className="mt-4 inline-flex text-sm font-semibold text-sky-700 transition hover:text-sky-500"
                        >
                          Read More
                        </Link>
                      </div>
                    </article>
                  </Reveal>
                ))}
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {latestPosts.map((post, index) => (
                <Reveal key={post._id} delay={0.08 * index}>
                  <article
                  key={post._id}
                  className="group overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-6"
                >
                    <div className="overflow-hidden rounded-2xl">
                      <div
                        className="h-44 w-full bg-cover bg-center bg-slate-200 transition duration-300 group-hover:scale-105"
                        style={{ backgroundImage: `url(${getPostImageUrl(post)})` }}
                      />
                    </div>

                    <div className="mt-5 flex items-center gap-3 text-xs font-medium text-slate-500">
                      <span className="rounded-2xl bg-slate-100 px-3 py-1 text-slate-700">
                        {post.category}
                      </span>
                      <span>{getReadTimeLabel(post)}</span>
                    </div>

                    <h3 className="mt-4 text-lg font-semibold text-slate-900 sm:text-xl">
                      {post.title}
                    </h3>

                    <Link
                      to={`/posts/${post.slug}`}
                      className="mt-4 inline-flex text-sm font-semibold text-sky-700 transition hover:text-sky-500"
                    >
                      Open Post
                    </Link>
                  </article>
                </Reveal>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-600">
            No published posts yet. Create one from the new post page and publish it to see it here.
          </div>
        )}
      </div>
    </section>
  );
};

export default LastestPosts;