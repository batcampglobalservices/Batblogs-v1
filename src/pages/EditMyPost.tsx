import { ChangeEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageReveal } from '../components/motion/Reveal';
import { apiRequest, getAuthToken } from '../lib/api';
import {
  BlogPost,
  CategoriesResponse,
  CategoryItem,
  PostResponse,
} from '../lib/content';

type UploadResponse = {
  imageUrl: string;
};

type EditorValues = {
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  tags: string;
  coverImage: string;
  readTime: string;
  allowComments: boolean;
};

const editorInputClass =
  'w-full rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400';

const uploadImage = async (file: File) => {
  const formData = new FormData();
  formData.append('image', file);

  const data = await apiRequest<UploadResponse>('/uploads/images', {
    method: 'POST',
    body: formData,
  });

  return data.imageUrl;
};

const mapPostToEditorValues = (post: BlogPost): EditorValues => ({
  title: post.title || '',
  slug: post.slug || '',
  category: post.category || '',
  excerpt: post.excerpt || '',
  content: post.content || '',
  tags: Array.isArray(post.tags) ? post.tags.join(', ') : '',
  coverImage: post.coverImageUrl || '',
  readTime: post.readTime || '',
  allowComments: post.allowComments !== false,
});

const EditMyPostPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [editorValues, setEditorValues] = useState<EditorValues | null>(null);
  const [editorCoverFile, setEditorCoverFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!getAuthToken()) {
      navigate('/login', { replace: true });
      return;
    }

    if (!id) {
      navigate('/my-posts', { replace: true });
      return;
    }

    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);

      try {
        const [postData, categoriesData] = await Promise.all([
          apiRequest<PostResponse>(`/posts/mine/${id}`),
          apiRequest<CategoriesResponse>('/categories?active=false'),
        ]);

        if (!isMounted) {
          return;
        }

        setPost(postData.post);
        setEditorValues(mapPostToEditorValues(postData.post));
        setCategories(categoriesData.categories || []);
        setMessage('');
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMessage(error instanceof Error ? error.message : 'Could not load this post.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [id, navigate]);

  useEffect(() => {
    return () => {
      if (editorValues?.coverImage.startsWith('blob:')) {
        URL.revokeObjectURL(editorValues.coverImage);
      }
    };
  }, [editorValues?.coverImage]);

  const handleEditorChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    if (!editorValues) {
      return;
    }

    const { name, value, type } = event.target;
    const checked = (event.target as HTMLInputElement).checked;

    setEditorValues({
      ...editorValues,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleEditorCoverChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!editorValues) {
      return;
    }

    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setEditorCoverFile(null);
      return;
    }

    if (editorValues.coverImage.startsWith('blob:')) {
      URL.revokeObjectURL(editorValues.coverImage);
    }

    const previewUrl = URL.createObjectURL(file);
    setEditorCoverFile(file);
    setEditorValues({
      ...editorValues,
      coverImage: previewUrl,
    });
  };

  const handleSavePost = async (publishNow: boolean) => {
    if (!post || !editorValues) {
      return;
    }

    if (!editorValues.title.trim() || !editorValues.category.trim() || !editorValues.content.trim()) {
      setMessage('Title, category, and content are required before saving changes.');
      return;
    }

    setIsSaving(true);

    try {
      const uploadedCoverImage = editorCoverFile
        ? await uploadImage(editorCoverFile)
        : editorValues.coverImage;

      await apiRequest(`/posts/${post._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editorValues.title,
          slug: editorValues.slug,
          category: editorValues.category,
          excerpt: editorValues.excerpt,
          content: editorValues.content,
          tags: editorValues.tags,
          coverImage: uploadedCoverImage,
          readTime: editorValues.readTime,
          publishNow,
          allowComments: editorValues.allowComments,
        }),
      });

      navigate('/my-posts', {
        replace: true,
        state: {
          message: publishNow ? 'Post saved and published.' : 'Post saved as a draft.',
        },
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save this post.');
    } finally {
      setIsSaving(false);
    }
  };

  const currentSlug = editorValues?.slug || post?.slug || '';

  return (
    <PageReveal>
      <section className="px-4 py-8 sm:px-6 md:px-10 md:py-12">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="rounded-4xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Link
                  to="/my-posts"
                  className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
                >
                  Back to my posts
                </Link>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-2xl bg-sky-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-sky-700">
                    Editing page
                  </span>
                  {post && (
                    <span
                      className={`rounded-2xl px-3 py-1 text-[11px] font-semibold ${
                        post.publishNow
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {post.publishNow ? 'Live post' : 'Draft post'}
                    </span>
                  )}
                </div>

                <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
                  {post?.title || 'Edit post'}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                  Tighten the story, refine the metadata, and save changes from a full page instead of a popup.
                </p>
              </div>

              {post?.publishNow && currentSlug && (
                <Link
                  to={`/posts/${currentSlug}`}
                  className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600"
                >
                  View live
                </Link>
              )}
            </div>
          </div>

          {message && (
            <div className="rounded-3xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-sky-800">
              {message}
            </div>
          )}

          {isLoading ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_320px]">
              <div className="space-y-6">
                <div className="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
                  <div className="mt-4 h-40 animate-pulse rounded-3xl bg-slate-100" />
                </div>
                <div className="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="h-8 w-32 animate-pulse rounded bg-slate-200" />
                  <div className="mt-4 h-80 animate-pulse rounded-3xl bg-slate-100" />
                </div>
              </div>
              <div className="rounded-4xl bg-slate-950 p-6 shadow-sm">
                <div className="h-8 w-32 animate-pulse rounded bg-white/10" />
                <div className="mt-4 h-60 animate-pulse rounded-3xl bg-white/8" />
              </div>
            </div>
          ) : editorValues && post ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_320px]">
              <div className="space-y-6">
                <div className="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Headline and routing
                  </p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Title
                      </label>
                      <input
                        name="title"
                        value={editorValues.title}
                        onChange={handleEditorChange}
                        placeholder="Post title"
                        className={editorInputClass}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Slug
                      </label>
                      <input
                        name="slug"
                        value={editorValues.slug}
                        onChange={handleEditorChange}
                        placeholder="post-slug"
                        className={editorInputClass}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Excerpt
                      </label>
                      <textarea
                        name="excerpt"
                        value={editorValues.excerpt}
                        onChange={handleEditorChange}
                        rows={4}
                        placeholder="Short summary"
                        className={editorInputClass}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Body copy
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        The main article content lives here.
                      </p>
                    </div>
                    <span className="rounded-2xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {editorValues.content.trim().split(/\s+/).filter(Boolean).length} words
                    </span>
                  </div>
                  <textarea
                    name="content"
                    value={editorValues.content}
                    onChange={handleEditorChange}
                    rows={16}
                    placeholder="Write the full post here"
                    className={`${editorInputClass} mt-4 min-h-80`}
                  />
                </div>
              </div>

              <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
                <div className="rounded-4xl bg-slate-950 p-5 text-white shadow-sm sm:p-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
                      Post settings
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Fine tune metadata, comments, and the cover image from one side rail.
                    </p>
                  </div>

                  <div className="mt-5 space-y-4 rounded-3xl border border-white/10 bg-white/6 p-4">
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Category
                      </label>
                      <select
                        name="category"
                        value={editorValues.category}
                        onChange={handleEditorChange}
                        className="w-full rounded-2xl border border-white/12 bg-slate-900 px-4 py-2.5 text-sm text-white outline-none transition focus:border-sky-400"
                      >
                        <option value="">Select category</option>
                        {categories.map((category) => (
                          <option key={category._id} value={category.name}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Tags
                      </label>
                      <input
                        name="tags"
                        value={editorValues.tags}
                        onChange={handleEditorChange}
                        placeholder="react, node, ai"
                        className="w-full rounded-2xl border border-white/12 bg-slate-900 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Read time
                      </label>
                      <input
                        name="readTime"
                        value={editorValues.readTime}
                        onChange={handleEditorChange}
                        placeholder="6 min read"
                        className="w-full rounded-2xl border border-white/12 bg-slate-900 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Cover image
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleEditorCoverChange}
                        className="w-full rounded-2xl border border-white/12 bg-slate-900 px-4 py-2.5 text-sm text-white outline-none transition file:mr-3 file:rounded-full file:border-0 file:bg-sky-500 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                      />
                    </div>
                  </div>

                  {editorValues.coverImage && (
                    <div className="mt-4 overflow-hidden rounded-4xl border border-white/10 bg-white/6">
                      <img
                        src={editorValues.coverImage}
                        alt="Cover preview"
                        className="block h-44 w-full object-cover"
                      />
                      <div className="border-t border-white/10 px-4 py-3 text-sm text-slate-300">
                        Cover preview
                      </div>
                    </div>
                  )}

                  <div className="mt-4 rounded-3xl border border-sky-400/20 bg-sky-400/10 p-4 text-sm leading-6 text-sky-100">
                    Saving as draft keeps this post hidden. Publishing makes the changes visible immediately to readers.
                  </div>

                  <label className="mt-4 flex items-center gap-3 rounded-3xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      name="allowComments"
                      checked={editorValues.allowComments}
                      onChange={handleEditorChange}
                      className="h-4 w-4 rounded border-white/20 bg-slate-900"
                    />
                    Allow comments on this post
                  </label>
                </div>

                <div className="rounded-4xl bg-slate-950 p-5 text-white shadow-sm sm:p-6">
                  <div className="grid gap-3">
                    <button
                      type="button"
                      onClick={() => void handleSavePost(true)}
                      disabled={isSaving}
                      className="w-full rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-60"
                    >
                      {isSaving ? 'Saving...' : 'Publish Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSavePost(false)}
                      disabled={isSaving}
                      className="w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
                    >
                      {isSaving ? 'Saving...' : 'Save Draft'}
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          ) : (
            <div className="rounded-4xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-600">
              This post could not be loaded.
            </div>
          )}
        </div>
      </section>
    </PageReveal>
  );
};

export default EditMyPostPage;