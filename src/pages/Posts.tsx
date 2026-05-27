import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageReveal, Reveal } from '../components/motion/Reveal';
import { apiRequest, apiStreamRequest } from '../lib/api';
import { getReadingHistory, ReadingConciergeResponse } from '../lib/ai';
import {
  BlogPost,
  CategoriesResponse,
  CategoryItem,
  PostsResponse,
  getAuthorName,
  getCategoryMeta,
  getPostExcerpt,
  getPostImageUrl,
  getReadTimeLabel,
} from '../lib/content';

const conciergeGoalIdeas = [
  'Show me the best posts to grow a blog audience without sounding generic.',
  'I want a reading path that sharpens intros, hooks, and article structure.',
  'Recommend posts that help me write more distinctive thought leadership pieces.',
];

const PostsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get('category') || '';
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [goal, setGoal] = useState('');
  const [isConciergeLoading, setIsConciergeLoading] = useState(false);
  const [concierge, setConcierge] = useState<ReadingConciergeResponse | null>(null);
  const [conciergePreview, setConciergePreview] =
    useState<Partial<ReadingConciergeResponse> | null>(null);
  const [conciergeStatus, setConciergeStatus] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);

      try {
        const query = new URLSearchParams({
          published: 'true',
          limit: '12',
        });

        if (activeCategory) {
          query.set('category', activeCategory);
        }

        const [categoriesData, postsData] = await Promise.all([
          apiRequest<CategoriesResponse>('/categories'),
          apiRequest<PostsResponse>(`/posts?${query.toString()}`),
        ]);

        if (!isMounted) {
          return;
        }

        setCategories(categoriesData.categories);
        setPosts(postsData.posts);
        setMessage('');
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMessage(error instanceof Error ? error.message : 'Could not load published posts.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [activeCategory]);

  const handleConcierge = async (goalOverride?: string) => {
    const resolvedGoal = (goalOverride ?? goal).trim();

    setIsConciergeLoading(true);
    setConcierge(null);
    setConciergePreview(null);
    setConciergeStatus('');
    setMessage('');

    if (goalOverride) {
      setGoal(goalOverride);
    }

    try {
      const data = await apiStreamRequest<ReadingConciergeResponse>(
        '/ai/reading-concierge',
        {
          method: 'POST',
          body: JSON.stringify({
            goal: resolvedGoal,
            activeCategory,
            readingHistory: getReadingHistory(),
          }),
        },
        {
          onStatus: setConciergeStatus,
          onPartial: (partial) => setConciergePreview(partial),
          onFinal: (finalPayload) => {
            setConciergePreview(finalPayload);
            setConcierge(finalPayload);
            setConciergeStatus('Reading path ready.');
          },
        }
      );

      setConcierge(data);
      setConciergePreview(data);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not generate reading recommendations right now.'
      );
    } finally {
      setIsConciergeLoading(false);
    }
  };

  const displayedConcierge = concierge || conciergePreview;

  return (
    <PageReveal>
      <section className="px-4 py-8 sm:px-6 md:px-10 md:py-12">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="rounded-4xl border border-white/70 bg-white/82 p-6 shadow-xl shadow-slate-900/5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-widest text-sky-700">
                Discover
              </p>
              <h1 className="mt-3 text-3xl font-black text-slate-900">Published stories</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                Browse the latest articles across the categories readers are following right now.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setSearchParams({})}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                    !activeCategory
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-white text-slate-700 hover:border-sky-300'
                  }`}
                >
                  All categories
                </button>
                {categories.map((category) => (
                  <button
                    key={category._id}
                    type="button"
                    onClick={() => setSearchParams({ category: category.name })}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                      activeCategory === category.name
                        ? 'bg-slate-900 text-white'
                        : 'border border-slate-200 bg-white text-slate-700 hover:border-sky-300'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.08} className="mt-6">
            <div className="rounded-4xl border border-white/70 bg-white/82 p-6 shadow-xl shadow-slate-900/5 backdrop-blur">
              <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr] lg:items-start">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-sky-700">
                    AI Reading Concierge
                  </p>
                  <h2 className="mt-3 text-2xl font-bold text-slate-900">
                    Get a personal reading path
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Tell the AI what you want to learn and it will recommend the best next posts based on the current catalog and your recent reading trail.
                  </p>

                  <textarea
                    value={goal}
                    onChange={(event) => setGoal(event.target.value)}
                    rows={4}
                    placeholder="Example: I want to learn how to grow a blog audience without sounding generic."
                    className="mt-4 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400"
                  />

                  <div className="mt-3 flex flex-wrap gap-2">
                    {conciergeGoalIdeas.map((idea) => (
                      <button
                        key={idea}
                        type="button"
                        onClick={() => handleConcierge(idea)}
                        disabled={isConciergeLoading}
                        className="rounded-2xl bg-slate-100 px-3 py-2 text-left text-[11px] font-semibold leading-5 text-slate-700 transition hover:bg-sky-100 hover:text-sky-700"
                      >
                        {idea}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleConcierge}
                    disabled={isConciergeLoading}
                    className="mt-4 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-600"
                  >
                    {isConciergeLoading ? 'Streaming your path...' : 'Get recommendations'}
                  </button>

                  {isConciergeLoading && (
                    <div className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
                      <div className="flex items-center gap-3">
                        <span>{conciergeStatus || 'Planning a better reading sequence...'}</span>
                        <span className="inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-4xl bg-sky-500" />
                          <span className="h-1.5 w-1.5 animate-pulse rounded-4xl bg-sky-400" />
                          <span className="h-1.5 w-1.5 animate-pulse rounded-4xl bg-sky-300" />
                        </span>
                      </div>
                    </div>
                  )}

                  <p className="mt-3 text-xs text-slate-500">
                    Using up to {getReadingHistory().length} recent reads to personalize the path.
                  </p>
                </div>

                <div className="rounded-3xl bg-slate-50 p-4 sm:p-5">
                  {displayedConcierge ? (
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {displayedConcierge.summary || 'Building the best-fit path for your goal...'}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {displayedConcierge.nextMove || 'The next step will appear as soon as the model settles on a sequence.'}
                      </p>

                      <div className="mt-4 space-y-3">
                        {(displayedConcierge.recommendations || []).map((recommendation) => (
                          <article
                            key={recommendation.slug}
                            className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                          >
                            <div
                              className="h-28 bg-cover bg-center"
                              style={{
                                backgroundImage: `url(${recommendation.coverImageUrl || getCategoryMeta(recommendation.category).imageUrl})`,
                              }}
                            />
                            <div className="p-4">
                              <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                                <span>{recommendation.category}</span>
                                <Link
                                  to={`/posts/${recommendation.slug}`}
                                  className="font-semibold text-sky-700 transition hover:text-sky-500"
                                >
                                  Open
                                </Link>
                              </div>
                              <h3 className="mt-2 text-lg font-semibold text-slate-900">
                                {recommendation.title}
                              </h3>
                              <p className="mt-2 text-sm leading-6 text-slate-600">
                                {recommendation.reason || 'Reasoning is still streaming in...'}
                              </p>
                              <p className="mt-2 text-xs font-medium text-slate-500">
                                What you’ll get: {recommendation.takeaway || 'Takeaway incoming...'}
                              </p>
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm leading-6 text-slate-500">
                      Ask for a learning goal, a topic direction, or even a mood, and the concierge will map the most useful published posts for you.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Reveal>

          {message && (
            <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
              {message}
            </div>
          )}

          <Reveal delay={0.12} className="mt-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {isLoading &&
                Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="rounded-3xl bg-white/80 p-5 shadow-sm">
                    <div className="h-48 animate-pulse rounded-2xl bg-slate-200" />
                    <div className="mt-5 h-6 w-2/3 animate-pulse rounded bg-slate-200" />
                    <div className="mt-3 h-16 animate-pulse rounded bg-slate-100" />
                  </div>
                ))}

              {!isLoading &&
                posts.map((post) => (
                  <article
                    key={post._id}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div
                      className="h-52 bg-cover bg-center"
                      style={{ backgroundImage: `url(${getPostImageUrl(post)})` }}
                    />
                    <div className="p-5 sm:p-6">
                      <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
                        <span className="rounded-2xl bg-slate-100 px-3 py-1 text-slate-700">
                          {post.category}
                        </span>
                        <span>{getReadTimeLabel(post)}</span>
                        <span>{getAuthorName(post.author)}</span>
                      </div>

                      <h2 className="mt-4 text-xl font-bold text-slate-900">{post.title}</h2>
                      <p className="mt-3 text-sm leading-7 text-slate-600">
                        {getPostExcerpt(post)}
                      </p>

                      <div className="mt-5 flex items-center justify-between gap-3">
                        <span className="text-xs text-slate-500">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                        <Link
                          to={`/posts/${post.slug}`}
                          className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600"
                        >
                          Read post
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
            </div>
          </Reveal>

          {!isLoading && posts.length === 0 && (
            <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-600">
              No published posts found for this category yet.
            </div>
          )}

          {!isLoading && categories.length > 0 && (
            <Reveal delay={0.16} className="mt-10">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {categories.slice(0, 4).map((category) => {
                  const categoryMeta = getCategoryMeta(
                    category.name,
                    category.description,
                    category.imageUrl
                  );

                  return (
                    <Link
                      key={category._id}
                      to={`/posts?category=${encodeURIComponent(category.name)}`}
                      className="overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div
                        className="h-32 bg-cover bg-center"
                        style={{ backgroundImage: `url(${categoryMeta.imageUrl})` }}
                      />
                      <div className="p-4">
                        <h3 className="text-lg font-semibold text-slate-900">{category.name}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {category.description || categoryMeta.description}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </Reveal>
          )}
        </div>
      </section>
    </PageReveal>
  );
};

export default PostsPage;