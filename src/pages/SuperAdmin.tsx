import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiRequest, apiStreamRequest, AuthUser, getAuthUser } from '../lib/api';
import {
  AI_FEATURE_LABELS,
  AiHistoryEntry,
  AiHistoryResponse,
  ModerationReviewResponse,
} from '../lib/ai';

type AnalyticsOverview = {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  totalAdmins: number;
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  deletedPosts: number;
  totalCategories: number;
};

type DayPoint = {
  date: string;
  value: number;
};

type CategoryPoint = {
  category: string;
  value: number;
};

type RolePoint = {
  role: string;
  value: number;
};

type AnalyticsPayload = {
  generatedAt: string;
  refreshInSeconds: number;
  overview: AnalyticsOverview;
  charts: {
    usersByDay: DayPoint[];
    postsByDay: DayPoint[];
    postsByCategory: CategoryPoint[];
    rolesBreakdown: RolePoint[];
  };
  topAuthors: Array<{
    authorId: string;
    username: string;
    fullName: string;
    posts: number;
  }>;
  recentModeration: Array<{
    _id: string;
    title: string;
    slug: string;
    deletedAt: string;
    deletedReason: string;
    author?: {
      username: string;
    };
    deletedBy?: {
      username: string;
    };
  }>;
};

type UsersResponse = {
  users: AuthUser[];
};

type PostsResponse = {
  posts: Array<{
    _id: string;
    title: string;
    slug: string;
    category: string;
    publishNow: boolean;
    createdAt: string;
    author?: {
      username: string;
    };
  }>;
};

type CategoriesResponse = {
  categories: Array<{
    _id: string;
    name: string;
    description: string;
    isActive: boolean;
  }>;
};

const roleColors = ['#38bdf8', '#22c55e', '#f97316', '#a855f7'];

const SuperAdminPage = () => {
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [posts, setPosts] = useState<PostsResponse['posts']>([]);
  const [categories, setCategories] = useState<CategoriesResponse['categories']>([]);
  const [notice, setNotice] = useState('');
  const [moderationReview, setModerationReview] =
    useState<ModerationReviewResponse['review'] | null>(null);
  const [moderationPreview, setModerationPreview] =
    useState<Partial<ModerationReviewResponse> | null>(null);
  const [moderationStatus, setModerationStatus] = useState('');
  const [isModerationLoading, setIsModerationLoading] = useState(false);
  const [moderationTargetPostId, setModerationTargetPostId] = useState('');
  const [aiHistory, setAiHistory] = useState<AiHistoryEntry[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    username: '',
    phone: '',
    password: '',
    role: 'user',
    socialLinks: '',
  });

  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
  });

  const [isBusy, setIsBusy] = useState(false);

  const trendData = useMemo(() => {
    if (!analytics) return [];

    const postByDate = new Map(
      analytics.charts.postsByDay.map((point) => [point.date, point.value])
    );

    return analytics.charts.usersByDay.map((point) => ({
      date: point.date.slice(5),
      users: point.value,
      posts: postByDate.get(point.date) || 0,
    }));
  }, [analytics]);

  const loadAnalytics = async () => {
    const data = await apiRequest<AnalyticsPayload>('/superadmin/analytics?days=14');
    setAnalytics(data);
  };

  const loadUsers = async () => {
    const data = await apiRequest<UsersResponse>('/superadmin/users?limit=50');
    setUsers(data.users);
  };

  const loadPosts = async () => {
    const data = await apiRequest<PostsResponse>('/superadmin/posts?limit=30');
    setPosts(data.posts);
  };

  const loadCategories = async () => {
    const data = await apiRequest<CategoriesResponse>('/categories?active=false');
    setCategories(data.categories);
  };

  const loadAiHistory = async () => {
    setIsHistoryLoading(true);

    try {
      const data = await apiRequest<AiHistoryResponse>(
        '/ai/history?scope=all&limit=10&feature=moderation-review'
      );
      setAiHistory(data.history);
    } catch {
      setAiHistory([]);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([loadAnalytics(), loadUsers(), loadPosts(), loadCategories(), loadAiHistory()]);
  };

  useEffect(() => {
    const currentUser = getAuthUser();

    if (!currentUser || currentUser.role !== 'superadmin') {
      navigate('/login', { replace: true });
      return;
    }

    Promise.all([loadAnalytics(), loadUsers(), loadPosts(), loadCategories(), loadAiHistory()]).catch(() => {
      setNotice('Failed to load superadmin dashboard data.');
    });
  }, [navigate]);

  useEffect(() => {
    const refreshInMs = (analytics?.refreshInSeconds || 15) * 1000;
    const interval = window.setInterval(() => {
      apiRequest<AnalyticsPayload>('/superadmin/analytics?days=14')
        .then(setAnalytics)
        .catch(() => undefined);
    }, refreshInMs);

    return () => window.clearInterval(interval);
  }, [analytics?.refreshInSeconds]);

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsBusy(true);

    try {
      await apiRequest('/superadmin/users', {
        method: 'POST',
        body: JSON.stringify(newUser),
      });

      setNewUser({
        firstName: '',
        lastName: '',
        username: '',
        phone: '',
        password: '',
        role: 'user',
        socialLinks: '',
      });
      setNotice('User created successfully.');
      await loadUsers();
      await loadAnalytics();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not create user.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleBanUser = async (userId: string) => {
    const reason = window.prompt('Reason for banning this user:');

    if (!reason) return;

    setIsBusy(true);
    try {
      await apiRequest(`/superadmin/users/${userId}/ban`, {
        method: 'PATCH',
        body: JSON.stringify({ reason }),
      });
      setNotice('User banned successfully.');
      await loadUsers();
      await loadAnalytics();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not ban user.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleUnbanUser = async (userId: string) => {
    setIsBusy(true);
    try {
      await apiRequest(`/superadmin/users/${userId}/unban`, {
        method: 'PATCH',
      });
      setNotice('User unbanned successfully.');
      await loadUsers();
      await loadAnalytics();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not unban user.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const reason = window.prompt('Reason for deleting this user (optional):') || '';

    if (!window.confirm('Delete this user? This will also moderate their active posts.')) {
      return;
    }

    setIsBusy(true);
    try {
      await apiRequest(`/superadmin/users/${userId}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason }),
      });
      setNotice('User deleted successfully.');
      await loadUsers();
      await loadPosts();
      await loadAnalytics();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not delete user.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    const reason = window.prompt('Reason for deleting this post:');

    if (!reason) return;

    setIsBusy(true);
    try {
      await apiRequest(`/superadmin/posts/${postId}/delete`, {
        method: 'PATCH',
        body: JSON.stringify({ reason }),
      });
      setNotice('Post deleted successfully.');
      await loadPosts();
      await loadAnalytics();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not delete post.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleModerationReview = async (postId: string) => {
    setIsModerationLoading(true);
    setModerationTargetPostId(postId);
    setModerationStatus('');
    setModerationPreview(null);
    setModerationReview(null);

    try {
      const data = await apiStreamRequest<ModerationReviewResponse>(
        '/ai/moderation-review',
        {
          method: 'POST',
          body: JSON.stringify({ postId }),
        },
        {
          onStatus: setModerationStatus,
          onPartial: (partial) => setModerationPreview(partial),
          onFinal: (finalPayload) => {
            setModerationPreview(finalPayload);
            setModerationReview(finalPayload.review);
            setModerationStatus('Moderation review ready.');
          },
        }
      );

      setModerationReview(data.review);
      setModerationPreview(data);
      setNotice('AI moderation review generated and saved.');
      await loadAiHistory();
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Could not generate AI moderation review.'
      );
    } finally {
      setIsModerationLoading(false);
      setModerationTargetPostId('');
    }
  };

  const displayedModerationReview = moderationReview || moderationPreview?.review;
  const adminInputClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white';

  const overviewCards = analytics
    ? [
        {
          label: 'Users',
          value: analytics.overview.totalUsers,
          tone: 'text-slate-900',
        },
        {
          label: 'Banned Users',
          value: analytics.overview.bannedUsers,
          tone: 'text-rose-600',
        },
        {
          label: 'Total Posts',
          value: analytics.overview.totalPosts,
          tone: 'text-slate-900',
        },
        {
          label: 'Published',
          value: analytics.overview.publishedPosts,
          tone: 'text-emerald-600',
        },
        {
          label: 'Categories',
          value: analytics.overview.totalCategories,
          tone: 'text-cyan-700',
        },
      ]
    : [];
  const recentModeration = analytics?.recentModeration || [];
  const panelClass = 'rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/60';
  const softPanelClass = 'rounded-3xl border border-slate-200/80 bg-stone-50/80';
  const secondaryTextClass = 'text-sm leading-6 text-slate-500';

  const handleCreateCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsBusy(true);

    try {
      await apiRequest('/categories', {
        method: 'POST',
        body: JSON.stringify(newCategory),
      });

      setNewCategory({ name: '', description: '' });
      setNotice('Category created successfully.');
      await loadCategories();
      await loadAnalytics();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not create category.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm('Delete this category?')) return;

    setIsBusy(true);
    try {
      await apiRequest(`/categories/${categoryId}`, {
        method: 'DELETE',
      });
      setNotice('Category deleted successfully.');
      await loadCategories();
      await loadAnalytics();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not delete category.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <section className="relative overflow-hidden bg-stone-100 px-4 py-8 text-slate-900 sm:px-6 md:px-10 md:py-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-linear-to-br from-amber-100 via-stone-100 to-cyan-50" />
      <div className="pointer-events-none absolute -left-16 top-48 h-64 w-64 rounded-[999px] bg-amber-200/60 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-28 h-72 w-72 rounded-[999px] bg-cyan-200/60 blur-3xl" />

      <div className="relative mx-auto max-w-7xl space-y-6">
        <div className={`${panelClass} overflow-hidden`}>
          <div className="grid gap-6 p-6 md:grid-cols-[1.25fr_0.75fr] md:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
                Superadmin Desk
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Platform administration with calmer hierarchy and clearer control.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                This workspace brings analytics, access control, moderation, and content governance into one surface.
                The layout leans on contrast, spacing, and repetition so high-priority decisions stay visible without the page feeling noisy.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleRefresh().catch(() => setNotice('Could not refresh dashboard.'))}
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Refresh dashboard
                </button>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                  Last generated:{' '}
                  <span className="font-semibold text-slate-900">
                    {analytics?.generatedAt
                      ? new Date(analytics.generatedAt).toLocaleString()
                      : 'Loading...'}
                  </span>
                </div>
              </div>

              {notice && (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {notice}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-1 xl:grid-cols-3">
              <div className="rounded-3xl bg-slate-950 px-5 py-5 text-white">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Active users</p>
                <p className="mt-3 text-3xl font-black">
                  {analytics?.overview.activeUsers ?? '--'}
                </p>
                <p className="mt-2 text-sm text-slate-300">Healthy accounts currently able to publish and interact.</p>
              </div>
              <div className="rounded-3xl bg-white px-5 py-5 ring-1 ring-slate-200">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Draft posts</p>
                <p className="mt-3 text-3xl font-black text-slate-950">
                  {analytics?.overview.draftPosts ?? '--'}
                </p>
                <p className="mt-2 text-sm text-slate-500">Unpublished work waiting on polish or approval.</p>
              </div>
              <div className="rounded-3xl bg-white px-5 py-5 ring-1 ring-slate-200">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Removed posts</p>
                <p className="mt-3 text-3xl font-black text-rose-600">
                  {analytics?.overview.deletedPosts ?? '--'}
                </p>
                <p className="mt-2 text-sm text-slate-500">Permanent moderation actions taken across the platform.</p>
              </div>
            </div>
          </div>
        </div>

        {analytics && (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {overviewCards.map((card, index) => (
                <div key={card.label} className={`${panelClass} p-5`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {card.label}
                      </p>
                      <p className={`mt-3 text-3xl font-black ${card.tone}`}>{card.value}</p>
                    </div>
                    <span
                      className={`mt-1 h-3 w-3 rounded-[999px] ${
                        index === 0
                          ? 'bg-slate-900'
                          : index === 1
                            ? 'bg-rose-500'
                            : index === 3
                              ? 'bg-emerald-500'
                              : 'bg-cyan-500'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className={`${panelClass} min-w-0 p-6`}>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">Growth trend</p>
                <h2 className="mt-2 text-xl font-bold text-slate-950">Users and posts over the last 14 days</h2>
                <p className={`mt-2 ${secondaryTextClass}`}>
                  The line treatment emphasizes direction first, then exact values on hover.
                </p>
                <div className="mt-6 h-72 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#dbe4ee" />
                      <XAxis dataKey="date" stroke="#64748b" />
                      <YAxis allowDecimals={false} stroke="#64748b" />
                      <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#dbe4ee', color: '#0f172a', borderRadius: '18px' }} />
                      <Legend />
                      <Line type="monotone" dataKey="users" stroke="#0891b2" strokeWidth={3} dot={false} />
                      <Line type="monotone" dataKey="posts" stroke="#f59e0b" strokeWidth={3} dot={false} strokeDasharray="6 6" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={`${panelClass} min-w-0 p-6`}>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Content mix</p>
                <h2 className="mt-2 text-xl font-bold text-slate-950">Post volume by category</h2>
                <p className={`mt-2 ${secondaryTextClass}`}>
                  Category balance is easier to compare in a vertical bar view with generous spacing and lighter rails.
                </p>
                <div className="mt-6 h-72 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={analytics.charts.postsByCategory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#dbe4ee" />
                      <XAxis dataKey="category" interval={0} angle={-20} textAnchor="end" height={70} stroke="#64748b" />
                      <YAxis allowDecimals={false} stroke="#64748b" />
                      <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#dbe4ee', color: '#0f172a', borderRadius: '18px' }} />
                      <Bar dataKey="value" fill="#0f172a" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className={`${panelClass} p-6`}>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">Top authors</p>
                <h2 className="mt-2 text-xl font-bold text-slate-950">Who is driving published output</h2>
                <div className="mt-5 space-y-3">
                  {analytics.topAuthors.map((author, index) => (
                    <div
                      key={author.authorId}
                      className="flex items-center justify-between rounded-3xl border border-slate-200 bg-stone-50 px-5 py-4"
                    >
                      <div className="flex items-center gap-4">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-950">{author.fullName}</p>
                          <p className="text-xs text-slate-500">@{author.username}</p>
                        </div>
                      </div>
                      <span className="rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
                        {author.posts} posts
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-6">
                <div className={`${panelClass} p-6`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Role distribution</p>
                  <h2 className="mt-2 text-xl font-bold text-slate-950">Access tiers at a glance</h2>
                  <div className="mt-4 h-64 w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <PieChart>
                        <Pie
                          data={analytics.charts.rolesBreakdown}
                          dataKey="value"
                          nameKey="role"
                          cx="50%"
                          cy="50%"
                          outerRadius={88}
                          label
                        >
                          {analytics.charts.rolesBreakdown.map((entry, index) => (
                            <Cell key={entry.role} fill={roleColors[index % roleColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#dbe4ee', color: '#0f172a', borderRadius: '18px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className={`${panelClass} p-6`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-700">Recent moderation</p>
                  <h2 className="mt-2 text-xl font-bold text-slate-950">Latest removals and reasons</h2>
                  {recentModeration.length > 0 ? (
                    <div className="mt-5 space-y-3">
                      {recentModeration.map((entry) => (
                        <div key={entry._id} className="rounded-3xl border border-slate-200 bg-stone-50 px-4 py-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-950">{entry.title}</p>
                              <p className="mt-1 text-xs text-slate-500">/{entry.slug}</p>
                            </div>
                            <span className="rounded-2xl bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                              {new Date(entry.deletedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-slate-600">{entry.deletedReason}</p>
                          <p className="mt-2 text-xs text-slate-500">
                            Author: @{entry.author?.username || 'unknown'} · Removed by @{entry.deletedBy?.username || 'unknown'}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={`mt-4 ${secondaryTextClass}`}>
                      No recent removals have been recorded in this analytics window.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        <div className="grid gap-6 xl:grid-cols-2">
          <div className={`${panelClass} p-6`}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">Administrative users</p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">Register a new operator</h2>
            <p className={`mt-2 ${secondaryTextClass}`}>
              Grouping related fields and using consistent input rhythm keeps creation quick even under operational pressure.
            </p>
            <form onSubmit={handleCreateUser} className="mt-6 grid gap-4 sm:grid-cols-2">
              <input
                required
                value={newUser.firstName}
                onChange={(event) => setNewUser((current) => ({ ...current, firstName: event.target.value }))}
                placeholder="First name"
                className={adminInputClass}
              />
              <input
                required
                value={newUser.lastName}
                onChange={(event) => setNewUser((current) => ({ ...current, lastName: event.target.value }))}
                placeholder="Last name"
                className={adminInputClass}
              />
              <input
                required
                value={newUser.username}
                onChange={(event) => setNewUser((current) => ({ ...current, username: event.target.value }))}
                placeholder="Username"
                className={adminInputClass}
              />
              <input
                required
                value={newUser.phone}
                onChange={(event) => setNewUser((current) => ({ ...current, phone: event.target.value }))}
                placeholder="Phone"
                className={adminInputClass}
              />
              <input
                required
                type="password"
                value={newUser.password}
                onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))}
                placeholder="Temporary password"
                className={adminInputClass}
              />
              <select
                value={newUser.role}
                onChange={(event) => setNewUser((current) => ({ ...current, role: event.target.value }))}
                className={adminInputClass}
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
                <option value="superadmin">superadmin</option>
              </select>
              <input
                value={newUser.socialLinks}
                onChange={(event) => setNewUser((current) => ({ ...current, socialLinks: event.target.value }))}
                placeholder="Social links (comma or line separated)"
                className={`${adminInputClass} sm:col-span-2`}
              />
              <button
                type="submit"
                disabled={isBusy}
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
              >
                {isBusy ? 'Processing...' : 'Register user'}
              </button>
            </form>
          </div>

          <div className={`${panelClass} p-6`}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Taxonomy control</p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">Manage platform categories</h2>
            <p className={`mt-2 ${secondaryTextClass}`}>
              A tighter card treatment keeps editing, scanning, and deletion actions in the same visual family.
            </p>
            <form onSubmit={handleCreateCategory} className="mt-6 grid gap-4">
              <input
                required
                value={newCategory.name}
                onChange={(event) =>
                  setNewCategory((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Category name"
                className={adminInputClass}
              />
              <input
                value={newCategory.description}
                onChange={(event) =>
                  setNewCategory((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Description"
                className={adminInputClass}
              />
              <button
                type="submit"
                disabled={isBusy}
                className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isBusy ? 'Processing...' : 'Create category'}
              </button>
            </form>

            <div className="mt-6 max-h-64 space-y-3 overflow-auto pr-1">
              {categories.map((category) => (
                <div key={category._id} className="rounded-3xl border border-slate-200 bg-stone-50 px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{category.name}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {category.description || 'No description'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(category._id)}
                      className="rounded-2xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={`${panelClass} overflow-hidden`}>
          <div className="border-b border-slate-200 px-6 py-6 md:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">Account directory</p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">Registered users and access status</h2>
            <p className={`mt-2 ${secondaryTextClass}`}>
              Alignment and repetition keep account actions consistent across rows so riskier actions never blend into routine ones.
            </p>
          </div>
          <div className="overflow-x-auto px-6 py-4 md:px-8 md:py-6">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="pb-3 pr-4 font-semibold">User identity</th>
                  <th className="pb-3 pr-4 font-semibold">Access tier</th>
                  <th className="pb-3 pr-4 font-semibold">Status</th>
                  <th className="pb-3 text-right font-semibold">Administrative options</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="py-4 pr-4">
                      <p className="font-semibold text-slate-950">@{user.username}</p>
                      <p className="text-xs text-slate-500">
                        {user.firstName} {user.lastName}
                      </p>
                    </td>
                    <td className="py-4 pr-4">
                      <span className="rounded-2xl bg-stone-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 pr-4">
                      <span
                        className={`rounded-2xl px-3 py-1 text-xs font-semibold ring-1 ${
                          user.isBanned
                            ? 'bg-rose-50 text-rose-700 ring-rose-200'
                            : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                        }`}
                      >
                        {user.isBanned ? 'banned' : 'active'}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex justify-end gap-2.5">
                        {user.isBanned ? (
                          <button
                            type="button"
                            onClick={() => handleUnbanUser(user.id)}
                            className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                          >
                            Unban account
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleBanUser(user.id)}
                            className="rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                          >
                            Ban user
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user.id)}
                          className="rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                        >
                          Erase user
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={`${panelClass} overflow-hidden`}>
          <div className="border-b border-slate-200 px-6 py-6 md:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-700">Moderation desk</p>
                <h2 className="mt-2 text-xl font-bold text-slate-950">AI review, flag inspection, and enforcement</h2>
                <p className={`mt-2 max-w-3xl ${secondaryTextClass}`}>
                  Stronger contrast is reserved for risk information. Support panels stay quieter so the moderation verdict and delete actions retain priority.
                </p>
              </div>
              {isModerationLoading && (
                <span className="rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white animate-pulse">
                  Streaming moderation review...
                </span>
              )}
            </div>
          </div>

          <div className="space-y-6 px-6 py-6 md:px-8">
            {isModerationLoading && (
              <div className={`${softPanelClass} px-4 py-3 text-sm text-slate-700`}>
                <div className="flex items-center gap-3">
                  <span>{moderationStatus || 'Inspecting content structure, claims, and risk signals...'}</span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-[999px] bg-slate-900" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-[999px] bg-slate-700" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-[999px] bg-slate-500" />
                  </span>
                </div>
              </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-6">
                <div className={`${softPanelClass} p-5`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Latest review</p>
                  {displayedModerationReview ? (
                    <>
                      <h3 className="mt-3 text-lg font-bold text-slate-950">
                        {displayedModerationReview.title}
                      </h3>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span
                          className={`rounded-2xl px-3 py-1 text-xs font-semibold ring-1 ${
                            displayedModerationReview.riskLevel === 'high'
                              ? 'bg-rose-50 text-rose-700 ring-rose-200'
                              : displayedModerationReview.riskLevel === 'medium'
                                ? 'bg-amber-50 text-amber-700 ring-amber-200'
                                : displayedModerationReview.riskLevel === 'low'
                                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                  : 'bg-white text-slate-700 ring-slate-200'
                          }`}
                        >
                          {displayedModerationReview.riskLevel || 'pending'} risk
                        </span>
                        <span className="rounded-2xl bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                          {displayedModerationReview.verdict || 'reviewing'}
                        </span>
                        {typeof displayedModerationReview.confidence === 'number' && (
                          <span className="rounded-2xl bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                            {displayedModerationReview.confidence}% confidence
                          </span>
                        )}
                      </div>
                      <p className="mt-4 text-sm leading-7 text-slate-600">
                        {displayedModerationReview.summary || 'The review summary is still streaming in.'}
                      </p>
                      <div className="mt-5 space-y-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Suggested moderator reason
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {displayedModerationReview.suggestedModeratorReason || 'Waiting for a suggested reason...'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Safe revision hint
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {displayedModerationReview.safeRevisionHint || 'Waiting for a revision hint...'}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className={`mt-3 ${secondaryTextClass}`}>
                      Trigger AI review on any post below to generate a moderation profile, risk level, and remediation guidance.
                    </p>
                  )}
                </div>

                <div className={`${softPanelClass} p-5`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Audit archive</p>
                      <h3 className="mt-2 text-lg font-bold text-slate-950">Saved moderation generations</h3>
                    </div>
                    {isHistoryLoading && (
                      <span className="text-xs font-semibold text-slate-500">Refreshing...</span>
                    )}
                  </div>

                  {aiHistory.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {aiHistory.map((entry) => (
                        <div key={entry._id} className="rounded-3xl border border-slate-200 bg-white px-4 py-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="rounded-2xl bg-stone-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700 ring-1 ring-slate-200">
                              {AI_FEATURE_LABELS[entry.feature]}
                            </span>
                            <span className="text-[11px] font-medium text-slate-500">
                              {new Date(entry.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="mt-3 text-sm font-semibold text-slate-950">{entry.title}</p>
                          <p className="mt-2 text-xs leading-5 text-slate-500">{entry.inputSummary}</p>
                          <p className="mt-3 text-sm leading-6 text-slate-600">
                            {entry.previewText || 'Saved moderation review available.'}
                          </p>
                          {entry.actor?.username && (
                            <p className="mt-2 text-[11px] font-medium text-slate-500">
                              Run by @{entry.actor.username}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={`mt-4 ${secondaryTextClass}`}>
                      Saved moderation runs will appear here after you generate AI reviews.
                    </p>
                  )}
                </div>
              </div>

              <div className={`${softPanelClass} p-5`}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">Flag analysis</p>
                <h3 className="mt-2 text-lg font-bold text-slate-950">Detected concerns and severity</h3>
                {(displayedModerationReview?.flags || []).length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {(displayedModerationReview?.flags || []).map((flag) => (
                      <div key={`${flag.label}-${flag.reason}`} className="rounded-3xl border border-slate-200 bg-white px-4 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-950">{flag.label}</span>
                          <span
                            className={`rounded-2xl px-2.5 py-1 text-[11px] font-semibold ring-1 ${
                              flag.severity === 'high'
                                ? 'bg-rose-50 text-rose-700 ring-rose-200'
                                : flag.severity === 'medium'
                                  ? 'bg-amber-50 text-amber-700 ring-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                            }`}
                          >
                            {flag.severity}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-600">{flag.reason}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`mt-4 ${secondaryTextClass}`}>
                    No active flags yet. Run a review to populate this panel with policy signals and severity tiers.
                  </p>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="pb-3 pr-4 font-semibold">Post details</th>
                    <th className="pb-3 pr-4 font-semibold">Submitted by</th>
                    <th className="pb-3 pr-4 font-semibold">Topic</th>
                    <th className="pb-3 pr-4 font-semibold">AI review</th>
                    <th className="pb-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {posts.map((post) => (
                    <tr key={post._id}>
                      <td className="py-4 pr-4">
                        <p className="font-semibold text-slate-950">{post.title}</p>
                        <p className="text-xs text-slate-500">/{post.slug}</p>
                      </td>
                      <td className="py-4 pr-4 text-slate-600">@{post.author?.username || 'unknown'}</td>
                      <td className="py-4 pr-4 text-slate-600">{post.category}</td>
                      <td className="py-4 pr-4">
                        <button
                          type="button"
                          onClick={() => handleModerationReview(post._id)}
                          className="rounded-2xl border border-cyan-200 bg-cyan-50 px-3.5 py-2 text-xs font-semibold text-cyan-800 transition hover:bg-cyan-100"
                        >
                          {isModerationLoading && moderationTargetPostId === post._id
                            ? 'Reviewing...'
                            : 'Run AI review'}
                        </button>
                      </td>
                      <td className="py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeletePost(post._id)}
                          className="rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                        >
                          Delete with reason
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SuperAdminPage;
