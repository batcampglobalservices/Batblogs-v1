import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PageReveal } from '../components/motion/Reveal';
import { apiRequest, getAuthToken } from '../lib/api';
import {
  BlogPost,
  getPostExcerpt,
  getPostImageUrl,
  getReadTimeLabel,
} from '../lib/content';

type MyPostsResponse = {
  posts: BlogPost[];
};

type FilterValue = 'all' | 'draft' | 'published';
type FlashState = { message?: string } | null;

const MyPostsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [filter, setFilter] = useState<FilterValue>('all');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [publishingPostId, setPublishingPostId] = useState('');

  useEffect(() => {
    if (!getAuthToken()) {
      navigate('/login', { replace: true });
      return;
    }

    const loadData = async () => {
      setIsLoading(true);

      try {
        const postsData = await apiRequest<MyPostsResponse>('/posts/mine');

        setPosts(postsData.posts || []);
        setMessage('');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Could not load your posts.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData().catch(() => undefined);
  }, [navigate]);

  useEffect(() => {
    const flashState = location.state as FlashState;

    if (flashState?.message) {
      setMessage(flashState.message);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  const filteredPosts = useMemo(() => {
    if (filter === 'draft') {
      return posts.filter((post) => !post.publishNow);
    }

    if (filter === 'published') {
      return posts.filter((post) => post.publishNow);
    }

    return posts;
  }, [filter, posts]);

  const counts = useMemo(
    () => ({
      all: posts.length,
      draft: posts.filter((post) => !post.publishNow).length,
      published: posts.filter((post) => post.publishNow).length,
    }),
    [posts]
  );

  const refreshPosts = async () => {
    const data = await apiRequest<MyPostsResponse>('/posts/mine');
    setPosts(data.posts || []);
  };

  const handlePublishDraft = async (postId: string) => {
    setPublishingPostId(postId);

    try {
      await apiRequest(`/posts/${postId}`, {
        method: 'PATCH',
        body: JSON.stringify({ publishNow: true }),
      });

      await refreshPosts();
      setMessage('Draft published successfully.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not publish this draft.');
    } finally {
      setPublishingPostId('');
    }
  };

  return (
    <PageReveal>
      <section className="px-4 py-8 sm:px-6 md:px-10 md:py-12">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="rounded-4xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
                  Workspace
                </p>
                <h1 className="mt-3 text-3xl font-black text-slate-950">My Posts</h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                  Review your drafts, update published posts, and jump into a full editing page when a story needs more room.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    All
                  </p>
                  <p className="mt-2 text-3xl font-black text-slate-950">{counts.all}</p>
                </div>
                <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                    Drafts
                  </p>
                  <p className="mt-2 text-3xl font-black text-amber-700">{counts.draft}</p>
                </div>
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                    Published
                  </p>
                  <p className="mt-2 text-3xl font-black text-emerald-700">{counts.published}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {(['all', 'draft', 'published'] as FilterValue[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilter(option)}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                    filter === option
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-white text-slate-700 hover:border-sky-300'
                  }`}
                >
                  {option === 'all' ? 'All posts' : option === 'draft' ? 'Drafts' : 'Published'}
                </button>
              ))}
              <Link
                to="/new-blog"
                className="rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
              >
                New Post
              </Link>
            </div>
          </div>

          {message && (
            <div className="rounded-3xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-sky-800">
              {message}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {isLoading &&
              Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-4xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="h-48 animate-pulse rounded-3xl bg-slate-200" />
                  <div className="mt-5 h-6 w-2/3 animate-pulse rounded bg-slate-200" />
                  <div className="mt-3 h-16 animate-pulse rounded bg-slate-100" />
                </div>
              ))}

            {!isLoading &&
              filteredPosts.map((post) => (
                <article
                  key={post._id}
                  className="overflow-hidden rounded-4xl border border-slate-200 bg-white/95 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div
                    className="h-48 bg-cover bg-center"
                    style={{ backgroundImage: `url(${getPostImageUrl(post)})` }}
                  />
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
                      <span className="rounded-2xl bg-slate-100 px-3 py-1 text-slate-700">
                        {post.category}
                      </span>
                      <span
                        className={`rounded-2xl px-3 py-1 ${
                          post.publishNow
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {post.publishNow ? 'Published' : 'Draft'}
                      </span>
                      <span>{getReadTimeLabel(post)}</span>
                    </div>

                    <h2 className="mt-4 text-xl font-bold text-slate-900">{post.title}</h2>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{getPostExcerpt(post)}</p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link
                        to={`/my-posts/${post._id}/edit`}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
                      >
                        Edit post
                      </Link>

                      {!post.publishNow && (
                        <button
                          type="button"
                          onClick={() => handlePublishDraft(post._id)}
                          disabled={publishingPostId === post._id}
                          className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:opacity-60"
                        >
                          {publishingPostId === post._id ? 'Publishing...' : 'Publish draft'}
                        </button>
                      )}

                      {post.publishNow && (
                        <Link
                          to={`/posts/${post.slug}`}
                          className="rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
                        >
                          View live
                        </Link>
                      )}
                    </div>

                    <p className="mt-4 text-xs text-slate-500">
                      Last updated {new Date(post.updatedAt || post.createdAt).toLocaleString()}
                    </p>
                  </div>
                </article>
              ))}
          </div>

          {!isLoading && filteredPosts.length === 0 && (
            <div className="rounded-4xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-600">
              No posts found in this section yet.
            </div>
          )}
        </div>
      </section>
    </PageReveal>
  );
};

export default MyPostsPage;