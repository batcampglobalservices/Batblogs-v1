import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import { CategoriesResponse, CategoryItem, getCategoryMeta } from '../lib/content';

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

type AdminPost = {
  _id: string;
  title: string;
  slug: string;
  category: string;
  excerpt?: string;
  coverImageUrl?: string;
  publishNow: boolean;
  createdAt: string;
  updatedAt?: string;
  author?: {
    username: string;
  };
};

type PostsResponse = {
  posts: AdminPost[];
};

type UploadResponse = {
  imageUrl: string;
};

type AdminSection = 'overview' | 'users' | 'categories' | 'blogs' | 'moderation';

type CategoryFormState = {
  name: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
};

const roleColors = ['#0f172a', '#06b6d4', '#f59e0b', '#10b981'];

const sectionMeta: Array<{
  id: AdminSection;
  label: string;
  description: string;
}> = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Platform health and publishing trends.',
  },
  {
    id: 'users',
    label: 'Users',
    description: 'Access control and account operations.',
  },
  {
    id: 'categories',
    label: 'Categories',
    description: 'Category editing, imagery, and activation state.',
  },
  {
    id: 'blogs',
    label: 'Blogs',
    description: 'Review every live or draft post from one list.',
  },
  {
    id: 'moderation',
    label: 'Moderation',
    description: 'AI review results, flags, and enforcement actions.',
  },
];

const initialCategoryForm: CategoryFormState = {
  name: '',
  description: '',
  imageUrl: '',
  isActive: true,
};

const panelClass = 'rounded-4xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/60';
const softPanelClass = 'rounded-4xl border border-slate-200/80 bg-stone-50/80';
const secondaryTextClass = 'text-sm leading-6 text-slate-500';
const adminInputClass =
  'w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white';

const uploadImage = async (file: File) => {
  const formData = new FormData();
  formData.append('image', file);

  const data = await apiRequest<UploadResponse>('/uploads/images', {
    method: 'POST',
    body: formData,
  });

  return data.imageUrl;
};

const SuperAdminDashboard = () => {
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
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
  const [isBusy, setIsBusy] = useState(false);
  const [postFilter, setPostFilter] = useState<'all' | 'draft' | 'published'>('all');
  const [postSearch, setPostSearch] = useState('');

  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    username: '',
    phone: '',
    password: '',
    role: 'user',
    socialLinks: '',
  });

  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(initialCategoryForm);
  const [editingCategoryId, setEditingCategoryId] = useState('');
  const [categoryImageFile, setCategoryImageFile] = useState<File | null>(null);

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

  const filteredPosts = useMemo(() => {
    const query = postSearch.trim().toLowerCase();

    return posts.filter((post) => {
      if (postFilter === 'draft' && post.publishNow) {
        return false;
      }

      if (postFilter === 'published' && !post.publishNow) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [post.title, post.slug, post.category, post.author?.username || '']
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [postFilter, postSearch, posts]);

  const displayedModerationReview = moderationReview || moderationPreview?.review;

  const sectionCounts = {
    overview: analytics?.overview.totalPosts || 0,
    users: users.length,
    categories: categories.length,
    blogs: posts.length,
    moderation: aiHistory.length,
  };

  const overviewCards = analytics
    ? [
        { label: 'Users', value: analytics.overview.totalUsers, tone: 'text-slate-950' },
        { label: 'Active', value: analytics.overview.activeUsers, tone: 'text-emerald-700' },
        { label: 'Drafts', value: analytics.overview.draftPosts, tone: 'text-amber-700' },
        { label: 'Published', value: analytics.overview.publishedPosts, tone: 'text-cyan-700' },
        { label: 'Categories', value: analytics.overview.totalCategories, tone: 'text-slate-950' },
      ]
    : [];

  const loadAnalytics = async () => {
    const data = await apiRequest<AnalyticsPayload>('/superadmin/analytics?days=14');
    setAnalytics(data);
  };

  const loadUsers = async () => {
    const data = await apiRequest<UsersResponse>('/superadmin/users?limit=60');
    setUsers(data.users);
  };

  const loadPosts = async () => {
    const data = await apiRequest<PostsResponse>('/superadmin/posts?limit=100');
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
        '/ai/history?scope=all&limit=12&feature=moderation-review'
      );
      setAiHistory(data.history);
    } catch {
      setAiHistory([]);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    const currentUser = getAuthUser();

    if (!currentUser || currentUser.role !== 'superadmin') {
      navigate('/login', { replace: true });
      return;
    }

    Promise.all([loadAnalytics(), loadUsers(), loadPosts(), loadCategories(), loadAiHistory()]).catch(
      () => {
        setNotice('Failed to load superadmin dashboard data.');
      }
    );
  }, [navigate]);

  const handleRefresh = async () => {
    await Promise.all([loadAnalytics(), loadUsers(), loadPosts(), loadCategories(), loadAiHistory()]);
  };

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
    setActiveSection('moderation');
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
        error instanceof Error ? error.message : 'Could not generate AI moderation review.'
      );
    } finally {
      setIsModerationLoading(false);
      setModerationTargetPostId('');
    }
  };

  const resetCategoryEditor = () => {
    if (categoryForm.imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(categoryForm.imageUrl);
    }

    setCategoryForm(initialCategoryForm);
    setCategoryImageFile(null);
    setEditingCategoryId('');
  };

  const handleCategoryImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setCategoryImageFile(null);
      return;
    }

    if (categoryForm.imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(categoryForm.imageUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    setCategoryImageFile(file);
    setCategoryForm((current) => ({
      ...current,
      imageUrl: previewUrl,
    }));
  };

  const handleSaveCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsBusy(true);

    try {
      const uploadedImageUrl = categoryImageFile
        ? await uploadImage(categoryImageFile)
        : categoryForm.imageUrl;

      const body = JSON.stringify({
        name: categoryForm.name,
        description: categoryForm.description,
        imageUrl: uploadedImageUrl,
        isActive: categoryForm.isActive,
      });

      if (editingCategoryId) {
        await apiRequest(`/categories/${editingCategoryId}`, {
          method: 'PATCH',
          body,
        });
        setNotice('Category updated successfully.');
      } else {
        await apiRequest('/categories', {
          method: 'POST',
          body,
        });
        setNotice('Category created successfully.');
      }

      resetCategoryEditor();
      await loadCategories();
      await loadAnalytics();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save category.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleEditCategory = (category: CategoryItem) => {
    setActiveSection('categories');
    setEditingCategoryId(category._id);
    setCategoryImageFile(null);
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      imageUrl: category.imageUrl || '',
      isActive: category.isActive,
    });
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
      <div className="pointer-events-none absolute -left-16 top-48 h-64 w-64 rounded-4xl bg-amber-200/60 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-28 h-72 w-72 rounded-4xl bg-cyan-200/60 blur-3xl" />

      <div className="relative mx-auto max-w-7xl space-y-6">
        <div className={`${panelClass} overflow-hidden`}>
          <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
                Superadmin Desk
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Production control, split into clear sections instead of one long page.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                Navigate analytics, users, categories, blog inventory, and moderation from the sidebar. The layout is built to stay readable on phones, tablets, and large screens.
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
                <div className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
                  {notice}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <div className="rounded-4xl bg-slate-950 px-5 py-5 text-white">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Active users</p>
                <p className="mt-3 text-3xl font-black">{analytics?.overview.activeUsers ?? '--'}</p>
                <p className="mt-2 text-sm text-slate-300">Healthy accounts currently able to publish and interact.</p>
              </div>
              <div className="rounded-4xl bg-white px-5 py-5 ring-1 ring-slate-200">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Draft posts</p>
                <p className="mt-3 text-3xl font-black text-amber-700">{analytics?.overview.draftPosts ?? '--'}</p>
                <p className="mt-2 text-sm text-slate-500">Unpublished work waiting for edits or approval.</p>
              </div>
              <div className="rounded-4xl bg-white px-5 py-5 ring-1 ring-slate-200">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Removed posts</p>
                <p className="mt-3 text-3xl font-black text-rose-600">{analytics?.overview.deletedPosts ?? '--'}</p>
                <p className="mt-2 text-sm text-slate-500">Permanent moderation actions recorded on the platform.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="min-w-0">
            <div className={`${panelClass} p-3 xl:sticky xl:top-24`}>
              <div className="mb-3 px-3 pt-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Sections
                </p>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1 xl:flex-col xl:overflow-visible">
                {sectionMeta.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={`min-w-55 rounded-3xl border px-4 py-4 text-left transition xl:min-w-0 ${
                      activeSection === section.id
                        ? 'border-slate-950 bg-slate-950 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-300 hover:text-cyan-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">{section.label}</span>
                      <span
                        className={`rounded-2xl px-2.5 py-1 text-xs font-semibold ${
                          activeSection === section.id
                            ? 'bg-white/12 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {sectionCounts[section.id]}
                      </span>
                    </div>
                    <p
                      className={`mt-2 text-xs leading-5 ${
                        activeSection === section.id ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {section.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="min-w-0 space-y-6">
            {activeSection === 'overview' && analytics && (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  {overviewCards.map((card) => (
                    <div key={card.label} className={`${panelClass} p-5`}>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {card.label}
                      </p>
                      <p className={`mt-3 text-3xl font-black ${card.tone}`}>{card.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <div className={`${panelClass} min-w-0 p-6`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">Growth trend</p>
                    <h2 className="mt-2 text-xl font-bold text-slate-950">Users and posts over the last 14 days</h2>
                    <p className={`mt-2 ${secondaryTextClass}`}>
                      The key movement stays visible first, with exact values on hover.
                    </p>
                    <div className="mt-6 h-72 w-full min-w-0">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <LineChart data={trendData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#dbe4ee" />
                          <XAxis dataKey="date" stroke="#64748b" />
                          <YAxis allowDecimals={false} stroke="#64748b" />
                          <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#dbe4ee', color: '#0f172a', borderRadius: '18px' }} />
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
                      Category balance is easier to compare with a taller, calmer bar layout.
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
                          className="flex items-center justify-between rounded-4xl border border-slate-200 bg-stone-50 px-5 py-4"
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
                      {analytics.recentModeration.length > 0 ? (
                        <div className="mt-5 space-y-3">
                          {analytics.recentModeration.map((entry) => (
                            <div key={entry._id} className="rounded-4xl border border-slate-200 bg-stone-50 px-4 py-4">
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

            {activeSection === 'users' && (
              <>
                <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                  <div className={`${panelClass} p-6`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">Administrative users</p>
                    <h2 className="mt-2 text-xl font-bold text-slate-950">Register a new operator</h2>
                    <p className={`mt-2 ${secondaryTextClass}`}>
                      Keep operational account creation short and explicit so roles are hard to misread.
                    </p>
                    <form onSubmit={handleCreateUser} className="mt-6 grid gap-4 sm:grid-cols-2">
                      <input required value={newUser.firstName} onChange={(event) => setNewUser((current) => ({ ...current, firstName: event.target.value }))} placeholder="First name" className={adminInputClass} />
                      <input required value={newUser.lastName} onChange={(event) => setNewUser((current) => ({ ...current, lastName: event.target.value }))} placeholder="Last name" className={adminInputClass} />
                      <input required value={newUser.username} onChange={(event) => setNewUser((current) => ({ ...current, username: event.target.value }))} placeholder="Username" className={adminInputClass} />
                      <input required value={newUser.phone} onChange={(event) => setNewUser((current) => ({ ...current, phone: event.target.value }))} placeholder="Phone" className={adminInputClass} />
                      <input required type="password" value={newUser.password} onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))} placeholder="Temporary password" className={adminInputClass} />
                      <select value={newUser.role} onChange={(event) => setNewUser((current) => ({ ...current, role: event.target.value }))} className={adminInputClass}>
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                        <option value="superadmin">superadmin</option>
                      </select>
                      <input value={newUser.socialLinks} onChange={(event) => setNewUser((current) => ({ ...current, socialLinks: event.target.value }))} placeholder="Social links (comma or line separated)" className={`${adminInputClass} sm:col-span-2`} />
                      <button type="submit" disabled={isBusy} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 sm:col-span-2">
                        {isBusy ? 'Processing...' : 'Register user'}
                      </button>
                    </form>
                  </div>

                  <div className="space-y-4">
                    {users.map((user) => (
                      <article key={user.id} className={`${panelClass} p-5`}>
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-lg font-bold text-slate-950">@{user.username}</p>
                              <span className="rounded-2xl bg-stone-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                                {user.role}
                              </span>
                              <span className={`rounded-2xl px-3 py-1 text-xs font-semibold ring-1 ${user.isBanned ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'}`}>
                                {user.isBanned ? 'banned' : 'active'}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-600">{user.firstName} {user.lastName}</p>
                            <p className="mt-1 text-xs text-slate-500">{user.phone}</p>
                            {user.socialLinks?.length > 0 && (
                              <p className="mt-2 text-xs leading-5 text-slate-500">{user.socialLinks.join(' · ')}</p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {user.isBanned ? (
                              <button type="button" onClick={() => handleUnbanUser(user.id)} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100">
                                Unban account
                              </button>
                            ) : (
                              <button type="button" onClick={() => handleBanUser(user.id)} className="rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100">
                                Ban user
                              </button>
                            )}
                            <button type="button" onClick={() => handleDeleteUser(user.id)} className="rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100">
                              Erase user
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeSection === 'categories' && (
              <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                <div className={`${panelClass} p-6`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Taxonomy control</p>
                  <h2 className="mt-2 text-xl font-bold text-slate-950">
                    {editingCategoryId ? 'Edit category details' : 'Create a category'}
                  </h2>
                  <p className={`mt-2 ${secondaryTextClass}`}>
                    Names, imagery, descriptions, and active state now live in one editor instead of a create-only form.
                  </p>

                  <form onSubmit={handleSaveCategory} className="mt-6 space-y-4">
                    <input required value={categoryForm.name} onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))} placeholder="Category name" className={adminInputClass} />
                    <textarea value={categoryForm.description} onChange={(event) => setCategoryForm((current) => ({ ...current, description: event.target.value }))} placeholder="Description" rows={4} className={adminInputClass} />
                    <input type="file" accept="image/*" onChange={handleCategoryImageChange} className={adminInputClass} />

                    {categoryForm.imageUrl && (
                      <div className="overflow-hidden rounded-4xl border border-slate-200 bg-slate-100">
                        <img src={categoryForm.imageUrl} alt="Category preview" className="block h-44 w-full object-cover" />
                      </div>
                    )}

                    <label className="flex items-center gap-2.5 text-sm text-slate-700">
                      <input type="checkbox" checked={categoryForm.isActive} onChange={(event) => setCategoryForm((current) => ({ ...current, isActive: event.target.checked }))} className="h-4 w-4 rounded border-slate-300" />
                      Keep this category active on the site
                    </label>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button type="submit" disabled={isBusy} className="flex-1 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">
                        {isBusy ? 'Processing...' : editingCategoryId ? 'Save category changes' : 'Create category'}
                      </button>
                      {editingCategoryId && (
                        <button type="button" onClick={resetCategoryEditor} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                          Cancel edit
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                <div className="space-y-4">
                  {categories.map((category) => {
                    const categoryMeta = getCategoryMeta(
                      category.name,
                      category.description,
                      category.imageUrl
                    );

                    return (
                      <article key={category._id} className={`${panelClass} overflow-hidden`}>
                        <div className="grid gap-0 md:grid-cols-[180px_minmax(0,1fr)]">
                          <div className="min-h-45 bg-cover bg-center" style={{ backgroundImage: `url(${categoryMeta.imageUrl})` }} />
                          <div className="p-5">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-bold text-slate-950">{category.name}</h3>
                              <span className={`rounded-2xl px-3 py-1 text-xs font-semibold ${category.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                {category.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-slate-600">
                              {category.description || categoryMeta.description}
                            </p>
                            <div className="mt-5 flex flex-wrap gap-2">
                              <button type="button" onClick={() => handleEditCategory(category)} className="rounded-2xl border border-cyan-200 bg-cyan-50 px-3.5 py-2 text-xs font-semibold text-cyan-800 transition hover:bg-cyan-100">
                                Edit category
                              </button>
                              <button type="button" onClick={() => handleDeleteCategory(category._id)} className="rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100">
                                Delete category
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}

            {activeSection === 'blogs' && (
              <>
                <div className={`${panelClass} p-6`}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">Blog inventory</p>
                      <h2 className="mt-2 text-xl font-bold text-slate-950">All blogs in one responsive admin list</h2>
                      <p className={`mt-2 ${secondaryTextClass}`}>
                        Filter by publish state, search by title or author, then jump into moderation or the live post.
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-[minmax(0,240px)_auto]">
                      <input value={postSearch} onChange={(event) => setPostSearch(event.target.value)} placeholder="Search title, slug, category, author" className={adminInputClass} />
                      <div className="flex flex-wrap gap-2">
                        {(['all', 'draft', 'published'] as Array<'all' | 'draft' | 'published'>).map((filter) => (
                          <button key={filter} type="button" onClick={() => setPostFilter(filter)} className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${postFilter === filter ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:border-cyan-300 hover:text-cyan-700'}`}>
                            {filter === 'all' ? 'All' : filter === 'draft' ? 'Drafts' : 'Published'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {filteredPosts.map((post) => (
                    <article key={post._id} className={`${panelClass} overflow-hidden`}>
                      <div className="grid gap-0 md:grid-cols-[160px_minmax(0,1fr)]">
                        <div className="min-h-40 bg-cover bg-center" style={{ backgroundImage: `url(${post.coverImageUrl || getCategoryMeta(post.category).imageUrl})` }} />
                        <div className="p-5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-2xl bg-stone-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                              {post.category}
                            </span>
                            <span className={`rounded-2xl px-3 py-1 text-xs font-semibold ${post.publishNow ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                              {post.publishNow ? 'Published' : 'Draft'}
                            </span>
                          </div>
                          <h3 className="mt-3 text-lg font-bold text-slate-950">{post.title}</h3>
                          <p className="mt-1 text-xs text-slate-500">/{post.slug} · @{post.author?.username || 'unknown'}</p>
                          <p className="mt-3 text-sm leading-6 text-slate-600">
                            {post.excerpt || 'No excerpt available for this post yet.'}
                          </p>
                          <div className="mt-5 flex flex-wrap gap-2">
                            <button type="button" onClick={() => handleModerationReview(post._id)} className="rounded-2xl border border-cyan-200 bg-cyan-50 px-3.5 py-2 text-xs font-semibold text-cyan-800 transition hover:bg-cyan-100">
                              {isModerationLoading && moderationTargetPostId === post._id ? 'Reviewing...' : 'Run AI review'}
                            </button>
                            <Link to={`/posts/${post.slug}`} className="rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700">
                              Open post
                            </Link>
                            <button type="button" onClick={() => handleDeletePost(post._id)} className="rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100">
                              Delete with reason
                            </button>
                          </div>
                          <p className="mt-4 text-xs text-slate-500">
                            Created {new Date(post.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                {filteredPosts.length === 0 && (
                  <div className={`${panelClass} p-8 text-center text-sm text-slate-600`}>
                    No posts matched the current blog filters.
                  </div>
                )}
              </>
            )}

            {activeSection === 'moderation' && (
              <>
                <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                  <div className="space-y-6">
                    <div className={`${panelClass} p-6`}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-700">Latest review</p>
                          <h2 className="mt-2 text-xl font-bold text-slate-950">AI moderation output</h2>
                        </div>
                        {isModerationLoading && (
                          <span className="rounded-2xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white">
                            Streaming...
                          </span>
                        )}
                      </div>

                      {isModerationLoading && (
                        <div className="mt-4 rounded-3xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm text-slate-700">
                          {moderationStatus || 'Inspecting content structure, claims, and risk signals...'}
                        </div>
                      )}

                      {displayedModerationReview ? (
                        <>
                          <h3 className="mt-5 text-lg font-bold text-slate-950">{displayedModerationReview.title}</h3>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <span className={`rounded-2xl px-3 py-1 text-xs font-semibold ${displayedModerationReview.riskLevel === 'high' ? 'bg-rose-50 text-rose-700' : displayedModerationReview.riskLevel === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                              {displayedModerationReview.riskLevel} risk
                            </span>
                            <span className="rounded-2xl bg-stone-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                              {displayedModerationReview.verdict}
                            </span>
                            {typeof displayedModerationReview.confidence === 'number' && (
                              <span className="rounded-2xl bg-stone-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                                {displayedModerationReview.confidence}% confidence
                              </span>
                            )}
                          </div>
                          <p className="mt-4 text-sm leading-7 text-slate-600">{displayedModerationReview.summary}</p>
                          <div className="mt-5 grid gap-4 md:grid-cols-2">
                            <div className={`${softPanelClass} p-4`}>
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Suggested moderator reason</p>
                              <p className="mt-2 text-sm leading-6 text-slate-600">{displayedModerationReview.suggestedModeratorReason}</p>
                            </div>
                            <div className={`${softPanelClass} p-4`}>
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Safe revision hint</p>
                              <p className="mt-2 text-sm leading-6 text-slate-600">{displayedModerationReview.safeRevisionHint}</p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <p className={`mt-4 ${secondaryTextClass}`}>
                          Run a moderation review from the blogs list or the moderation queue to populate this panel.
                        </p>
                      )}
                    </div>

                    <div className={`${panelClass} p-6`}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">Audit archive</p>
                          <h2 className="mt-2 text-xl font-bold text-slate-950">Saved moderation generations</h2>
                        </div>
                        {isHistoryLoading && (
                          <span className="text-xs font-semibold text-slate-500">Refreshing...</span>
                        )}
                      </div>

                      {aiHistory.length > 0 ? (
                        <div className="mt-5 space-y-3">
                          {aiHistory.map((entry) => (
                            <div key={entry._id} className="rounded-4xl border border-slate-200 bg-stone-50 px-4 py-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="rounded-2xl bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700 ring-1 ring-slate-200">
                                  {AI_FEATURE_LABELS[entry.feature]}
                                </span>
                                <span className="text-[11px] font-medium text-slate-500">
                                  {new Date(entry.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <p className="mt-3 text-sm font-semibold text-slate-950">{entry.title}</p>
                              <p className="mt-2 text-sm leading-6 text-slate-600">{entry.previewText || 'Saved moderation review available.'}</p>
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

                  <div className="space-y-6">
                    <div className={`${panelClass} p-6`}>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-700">Detected concerns</p>
                      <h2 className="mt-2 text-xl font-bold text-slate-950">Flags and severity</h2>
                      {(displayedModerationReview?.flags || []).length > 0 ? (
                        <div className="mt-5 space-y-3">
                          {(displayedModerationReview?.flags || []).map((flag) => (
                            <div key={`${flag.label}-${flag.reason}`} className="rounded-4xl border border-slate-200 bg-stone-50 px-4 py-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-slate-950">{flag.label}</span>
                                <span className={`rounded-2xl px-2.5 py-1 text-[11px] font-semibold ${flag.severity === 'high' ? 'bg-rose-50 text-rose-700' : flag.severity === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
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

                    <div className={`${panelClass} p-6`}>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">Moderation queue</p>
                      <h2 className="mt-2 text-xl font-bold text-slate-950">Pick any post and review it</h2>
                      <div className="mt-5 space-y-3">
                        {posts.slice(0, 10).map((post) => (
                          <div key={post._id} className="rounded-4xl border border-slate-200 bg-stone-50 px-4 py-4">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-sm font-semibold text-slate-950">{post.title}</p>
                                <p className="mt-1 text-xs text-slate-500">/{post.slug} · @{post.author?.username || 'unknown'}</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={() => handleModerationReview(post._id)} className="rounded-2xl border border-cyan-200 bg-cyan-50 px-3.5 py-2 text-xs font-semibold text-cyan-800 transition hover:bg-cyan-100">
                                  {isModerationLoading && moderationTargetPostId === post._id ? 'Reviewing...' : 'Run AI review'}
                                </button>
                                <button type="button" onClick={() => handleDeletePost(post._id)} className="rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100">
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SuperAdminDashboard;