import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, apiStreamRequest, getAuthToken } from '../lib/api';
import {
  AI_FEATURE_LABELS,
  AiHistoryEntry,
  AiHistoryResponse,
  WritingCopilotResponse,
  WritingCopilotSuggestions,
} from '../lib/ai';

type BlogFormValues = {
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  tags: string;
  coverImage: string;
  readTime: string;
  publishNow: boolean;
  allowComments: boolean;
};

type CategoryResponse = {
  categories: Array<{ name: string }>;
};

type UploadResponse = {
  imageUrl: string;
  publicId: string;
};

const fallbackCategoryOptions = [
  'Technology',
  'Lifestyle',
  'Business',
  'Travel',
  'Health',
  'Personal Development',
];

const writingQuickActions = [
  'Stronger search-friendly headline',
  'Sharper social hook',
  'Cleaner expert positioning',
];

const toSlug = (input: string) =>
  input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const initialValues: BlogFormValues = {
  title: '',
  slug: '',
  category: '',
  excerpt: '',
  content: '',
  tags: '',
  coverImage: '',
  readTime: '',
  publishNow: false,
  allowComments: true,
};

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none';

const labelClass = 'mb-1.5 block text-sm font-medium text-slate-800';

const uploadCoverImage = async (file: File) => {
  const formData = new FormData();
  formData.append('image', file);

  const data = await apiRequest<UploadResponse>('/uploads/images', {
    method: 'POST',
    body: formData,
  });

  return data.imageUrl;
};

const NewBlogForm = () => {
  const navigate = useNavigate();
  const [values, setValues] = useState<BlogFormValues>(initialValues);
  const [message, setMessage] = useState('');
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [categories, setCategories] = useState<string[]>(fallbackCategoryOptions);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [aiSuggestions, setAiSuggestions] =
    useState<WritingCopilotSuggestions | null>(null);
  const [aiPreview, setAiPreview] = useState<Partial<WritingCopilotResponse> | null>(null);
  const [aiStatus, setAiStatus] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiHistory, setAiHistory] = useState<AiHistoryEntry[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Popup Prompt states
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [promptInput, setPromptInput] = useState('');
  const [popupCategory, setPopupCategory] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftStatus, setDraftStatus] = useState('');

  const loadAiHistory = async () => {
    setIsHistoryLoading(true);

    try {
      const data = await apiRequest<AiHistoryResponse>(
        '/ai/history?limit=6&feature=writing-copilot,repurpose,contrarian-insights'
      );
      setAiHistory(data.history);
    } catch {
      setAiHistory([]);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (!getAuthToken()) {
      navigate('/login', { replace: true });
      return;
    }

    const loadCategories = async () => {
      setIsLoadingCategories(true);

      try {
        const data = await apiRequest<CategoryResponse>('/categories');
        const names = data.categories.map((category) => category.name).filter(Boolean);
        if (names.length > 0) {
          setCategories(names);
        }
      } catch {
        setCategories(fallbackCategoryOptions);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    loadCategories();
    loadAiHistory();
  }, [navigate]);

  useEffect(() => {
    return () => {
      if (values.coverImage.startsWith('blob:')) {
        URL.revokeObjectURL(values.coverImage);
      }
    };
  }, [values.coverImage]);

  const contentWords = useMemo(() => {
    return values.content.trim() ? values.content.trim().split(/\s+/).length : 0;
  }, [values.content]);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = event.target;
    const checked = (event.target as HTMLInputElement).checked;

    setValues((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));

    setMessage('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await submitPost(true);
  };

  const submitPost = async (publishNow: boolean) => {
    if (!values.title.trim() || !values.category.trim() || !values.content.trim()) {
      setMessage(
        publishNow
          ? 'Please fill title, category, and content before publishing.'
          : 'Please fill title, category, and content before saving a draft.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const coverImage = coverImageFile ? await uploadCoverImage(coverImageFile) : '';
      const slug = values.slug.trim() || toSlug(values.title);

      const data = await apiRequest<{ message: string; post: { slug: string } }>('/posts', {
        method: 'POST',
        body: JSON.stringify({
          title: values.title,
          slug,
          category: values.category,
          excerpt: values.excerpt,
          content: values.content,
          tags: values.tags,
          coverImage,
          readTime: values.readTime,
          publishNow,
          allowComments: values.allowComments,
        }),
      });

      if (values.coverImage.startsWith('blob:')) {
        URL.revokeObjectURL(values.coverImage);
      }

      setMessage(
        publishNow
          ? `Post published successfully: ${data.post.slug}`
          : `Draft saved successfully: ${data.post.slug}`
      );
      setAiSuggestions(null);
      setAiPreview(null);
      setAiStatus('');
      setValues(initialValues);
      setCoverImageFile(null);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Failed to create post. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    await submitPost(false);
  };

  const handleGenerateCopilot = async () => {
    if (!values.content.trim() || values.content.trim().length < 80) {
      setMessage('Add a bit more draft content before using AI writing copilot.');
      return;
    }

    setIsGeneratingAi(true);
    setAiSuggestions(null);
    setAiPreview(null);
    setAiStatus('');
    setMessage('');

    try {
      const data = await apiStreamRequest<WritingCopilotResponse>(
        '/ai/writing-copilot',
        {
          method: 'POST',
          body: JSON.stringify({
            title: values.title,
            category: values.category,
            excerpt: values.excerpt,
            content: values.content,
            tags: values.tags,
          }),
        },
        {
          onStatus: setAiStatus,
          onPartial: (partial) => setAiPreview(partial),
          onFinal: (finalPayload) => {
            setAiPreview(finalPayload);
            setAiSuggestions(finalPayload.suggestions);
            setAiStatus('AI suggestions ready.');
          },
        }
      );

      setAiSuggestions(data.suggestions);
      setAiPreview(data);
      setMessage('AI writing copilot generated fresh ideas and saved them to your history.');
      await loadAiHistory();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not generate writing suggestions right now.'
      );
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleCoverImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setCoverImageFile(null);
      setValues((current) => ({ ...current, coverImage: '' }));
      return;
    }

    if (values.coverImage.startsWith('blob:')) {
      URL.revokeObjectURL(values.coverImage);
    }

    const previewUrl = URL.createObjectURL(file);
    setCoverImageFile(file);
    setValues((current) => ({ ...current, coverImage: previewUrl }));
    setMessage('');
  };

  const displayedSuggestions = aiSuggestions || aiPreview?.suggestions;

  const handleApplyTopSuggestions = () => {
    if (!displayedSuggestions) {
      return;
    }

    const topHeadline = displayedSuggestions.headlineIdeas?.[0]?.trim();

    setValues((current) => ({
      ...current,
      title: topHeadline || current.title,
      slug: current.slug || (topHeadline ? toSlug(topHeadline) : current.slug),
      excerpt: displayedSuggestions.suggestedExcerpt || current.excerpt,
      tags: displayedSuggestions.seoKeywords?.length
        ? displayedSuggestions.seoKeywords.join(', ')
        : current.tags,
    }));

    setMessage('Applied the top AI headline, excerpt, and SEO tags to your draft.');
  };

  const handleQuickAction = (action: string) => {
    const promptLine = `AI note: prioritize ${action.toLowerCase()}.`;

    setValues((current) => ({
      ...current,
      content: current.content.includes(promptLine)
        ? current.content
        : `${current.content.trim()}\n\n${promptLine}`.trim(),
    }));

    setMessage(`Added a drafting cue for ${action.toLowerCase()}.`);
  };

  const handleGenerateDraftPopup = async () => {
    if (!promptInput.trim()) {
      return;
    }

    setIsDrafting(true);
    setDraftStatus('Contacting server...');

    try {
      type DraftResponsePayload = {
        draft: {
          title: string;
          excerpt: string;
          content: string;
          tags: string[];
          readTime: string;
        };
      };

      const result = await apiRequest<DraftResponsePayload>('/ai/draft', {
        method: 'POST',
        body: JSON.stringify({
          prompt: promptInput.trim(),
          category: popupCategory || undefined,
        }),
      });

      const draft = result.draft;
      if (draft) {
        setValues((current) => ({
          ...current,
          title: draft.title || current.title,
          slug: draft.title ? toSlug(draft.title) : current.slug,
          excerpt: draft.excerpt || current.excerpt,
          content: draft.content || current.content,
          tags: Array.isArray(draft.tags) ? draft.tags.join(', ') : current.tags,
          readTime: draft.readTime || current.readTime,
          category: popupCategory || current.category,
        }));
        setMessage('Draft details generated and applied to the form!');
        setIsPopupOpen(false);
        setPromptInput('');
        setPopupCategory('');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to generate draft details.');
    } finally {
      setIsDrafting(false);
      setDraftStatus('');
    }
  };

  return (
    <section className="px-4 py-6 sm:px-6 md:px-10 md:py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Create New Post</h1>
            <p className="mt-1 text-sm text-slate-600">
              Fill in the details below and publish when ready.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsPopupOpen(true)}
            className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 shadow-md flex items-center gap-2"
          >
            ✨ Auto Draft with Prompt
          </button>
        </div>

        {/* Prompt Auto Draft Popup Modal */}
        {isPopupOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-slate-900">Auto-Draft Your Blog</h3>
              <p className="mt-1 text-xs text-slate-500 leading-normal">
                State what you want your blog to be about. The AI will write a professional title, outline, key tags, and full content body!
              </p>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Select Desired Category
                  </label>
                  <select
                    value={popupCategory}
                    onChange={(e) => setPopupCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
                  >
                    <option value="">Any Category</option>
                    {categories.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Blog Details & Guidelines
                  </label>
                  <textarea
                    rows={4}
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    placeholder="E.g., An article explaining clean architecture in Node.js, highlighting dependency injection, repository pattern, and robust unit testing with Jest."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {isDrafting && (
                <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-sky-600">
                  <span className="h-1.5 w-1.5 animate-ping rounded-[999px] bg-sky-500" />
                  <span>{draftStatus || 'Generating customized outline...'}</span>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsPopupOpen(false);
                    setPromptInput('');
                    setPopupCategory('');
                  }}
                  disabled={isDrafting}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleGenerateDraftPopup}
                  disabled={isDrafting || !promptInput.trim()}
                  className="rounded-lg bg-sky-600 px-4 py-2.5 font-semibold text-white hover:bg-sky-500 disabled:opacity-50 transition"
                >
                  {isDrafting ? 'Writing draft...' : 'Generate and Fill'}
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
            <h2 className="text-base font-semibold text-slate-900">Post details</h2>

            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="title" className={labelClass}>
                  Title
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={values.title}
                  onChange={handleChange}
                  placeholder="A clear headline for your post"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="slug" className={labelClass}>
                  Slug
                </label>
                <input
                  id="slug"
                  name="slug"
                  type="text"
                  value={values.slug}
                  onChange={handleChange}
                  placeholder="clear-headline-for-your-post"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="excerpt" className={labelClass}>
                  Excerpt
                </label>
                <textarea
                  id="excerpt"
                  name="excerpt"
                  rows={3}
                  value={values.excerpt}
                  onChange={handleChange}
                  placeholder="Short summary shown in cards and previews"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="content" className={labelClass}>
                  Content
                </label>
                <textarea
                  id="content"
                  name="content"
                  rows={12}
                  value={values.content}
                  onChange={handleChange}
                  placeholder="Write your blog post here..."
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-slate-500">Word count: {contentWords}</p>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
              <h2 className="text-base font-semibold text-slate-900">Publishing</h2>

              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="category" className={labelClass}>
                    Category
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={values.category}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="">Select category</option>
                    {categories.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {isLoadingCategories && (
                    <p className="mt-2 text-xs text-slate-500">Loading categories...</p>
                  )}
                </div>

                <div>
                  <label htmlFor="tags" className={labelClass}>
                    Tags
                  </label>
                  <input
                    id="tags"
                    name="tags"
                    type="text"
                    value={values.tags}
                    onChange={handleChange}
                    placeholder="react, css, productivity"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="coverImage" className={labelClass}>
                    Cover Image
                  </label>

                  <input
                    id="coverImage"
                    name="coverImage"
                    type="file"
                    accept="image/*"
                    onChange={handleCoverImageChange}
                    className={inputClass}
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    JPG, PNG, WEBP supported.
                  </p>

                  {coverImageFile && (
                    <p className="mt-2 text-xs text-slate-600">
                      Selected: {coverImageFile.name}
                    </p>
                  )}

                  {values.coverImage && (
                    <div className="mt-3 w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                      <img
                        src={values.coverImage}
                        alt="Cover preview"
                        className="block h-36 w-full max-w-full object-cover"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="readTime" className={labelClass}>
                    Read time
                  </label>
                  <input
                    id="readTime"
                    name="readTime"
                    type="text"
                    value={values.readTime}
                    onChange={handleChange}
                    placeholder="6 min read"
                    className={inputClass}
                  />
                </div>

                <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                  The primary save action publishes immediately. Use the draft button below if you want to keep this post unpublished.
                </div>

                <label className="flex items-center gap-2.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="allowComments"
                    checked={values.allowComments}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Allow comments
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">AI Writing Copilot</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Headline ideas, stronger excerpt, SEO tags, and sharper content angles.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {writingQuickActions.map((action) => (
                      <button
                        key={action}
                        type="button"
                        onClick={() => handleQuickAction(action)}
                        className="rounded-2xl bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-sky-100 hover:text-sky-700"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {displayedSuggestions && (
                    <button
                      type="button"
                      onClick={handleApplyTopSuggestions}
                      className="rounded-lg border border-sky-200 px-3 py-2 text-xs font-semibold text-sky-700 transition hover:border-sky-300 hover:text-sky-600"
                    >
                      Apply top picks
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleGenerateCopilot}
                    disabled={isGeneratingAi}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
                  >
                    {isGeneratingAi ? 'Streaming...' : 'Run AI'}
                  </button>
                </div>
              </div>

              {isGeneratingAi && (
                <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-700">
                    Live generation
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-sm text-slate-600">
                    <span>{aiStatus || 'Drafting useful suggestions for this post...'}</span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-4xl bg-sky-500" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-4xl bg-sky-400" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-4xl bg-sky-300" />
                    </span>
                  </div>
                </div>
              )}

              {displayedSuggestions ? (
                <div className="mt-4 space-y-4 text-sm text-slate-700">
                  <div>
                    <p className="font-semibold text-slate-900">Headline ideas</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(displayedSuggestions.headlineIdeas || []).map((idea) => (
                        <button
                          key={idea}
                          type="button"
                          onClick={() =>
                            setValues((current) => ({
                              ...current,
                              title: idea,
                              slug: current.slug || toSlug(idea),
                            }))
                          }
                          className="rounded-2xl bg-slate-100 px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-sky-100 hover:text-sky-800"
                        >
                          {idea}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-900">Suggested excerpt</p>
                      <button
                        type="button"
                        disabled={!displayedSuggestions.suggestedExcerpt}
                        onClick={() =>
                          setValues((current) => ({
                            ...current,
                            excerpt: displayedSuggestions.suggestedExcerpt || current.excerpt,
                          }))
                        }
                        className="text-xs font-semibold text-sky-700 transition hover:text-sky-500"
                      >
                        Use this
                      </button>
                    </div>
                    <p className="mt-2 leading-6 text-slate-600">
                      {displayedSuggestions.suggestedExcerpt || 'Waiting for the AI to finish the excerpt...'}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-900">SEO keywords</p>
                      <button
                        type="button"
                        disabled={!displayedSuggestions.seoKeywords?.length}
                        onClick={() =>
                          setValues((current) => ({
                            ...current,
                            tags: (displayedSuggestions.seoKeywords || []).join(', '),
                          }))
                        }
                        className="text-xs font-semibold text-sky-700 transition hover:text-sky-500"
                      >
                        Use as tags
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(displayedSuggestions.seoKeywords || []).map((keyword) => (
                        <span
                          key={keyword}
                          className="rounded-2xl bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-900">Suggested CTA</p>
                    <p className="mt-2 leading-6 text-slate-600">
                      {displayedSuggestions.callToAction || 'Waiting for a CTA suggestion...'}
                    </p>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-900">Content angles to strengthen</p>
                    <ul className="mt-2 space-y-2 text-slate-600">
                      {(displayedSuggestions.contentAngles || []).map((angle) => (
                        <li key={angle}>• {angle}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-900">Tone notes</p>
                    <ul className="mt-2 space-y-2 text-slate-600">
                      {(displayedSuggestions.toneNotes || []).map((note) => (
                        <li key={note}>• {note}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-slate-500">
                  Feed it a rough draft and it will turn that into stronger headlines, cleaner excerpt copy, and better keyword suggestions.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Saved AI Generations</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Your recent writing, repurposing, and contrarian runs are stored here.
                  </p>
                </div>
                {isHistoryLoading && (
                  <span className="text-xs font-semibold text-slate-500">Refreshing...</span>
                )}
              </div>

              {aiHistory.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {aiHistory.map((entry) => (
                    <div key={entry._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-2xl bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-sky-700">
                          {AI_FEATURE_LABELS[entry.feature]}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500">
                          {new Date(entry.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-900">{entry.title}</p>
                      <p className="mt-2 text-xs leading-5 text-slate-500">{entry.inputSummary}</p>
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {entry.previewText || 'Saved generation available.'}
                      </p>
                      {entry.targetPost?.slug && (
                        <p className="mt-2 text-[11px] font-medium text-slate-500">
                          Source: /posts/{entry.targetPost.slug}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-slate-500">
                  Saved AI generations will appear here after you run the writing copilot or the post detail AI tools while signed in.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                {isSubmitting ? 'Saving...' : 'Save and Publish'}
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSubmitting}
                className="mt-2.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Draft'}
              </button>
            </div>

            {message && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {message}
              </p>
            )}
          </aside>
        </form>
      </div>
    </section>
  );
};

export default NewBlogForm;