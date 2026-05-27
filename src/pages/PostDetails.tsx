import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageReveal } from '../components/motion/Reveal';
import { apiRequest, apiStreamRequest } from '../lib/api';
import {
  ContrarianInsightsResponse,
  RepurposeResponse,
  copyTextToClipboard,
  trackReadPost,
} from '../lib/ai';
import {
  BlogPost,
  PostResponse,
  getAuthorName,
  getPostImageUrl,
  getReadTimeLabel,
} from '../lib/content';

const PostDetailsPage = () => {
  const { slug = '' } = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isRepurposing, setIsRepurposing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [repurposeMessage, setRepurposeMessage] = useState('');
  const [contrarianMessage, setContrarianMessage] = useState('');
  const [repurposePreview, setRepurposePreview] =
    useState<Partial<RepurposeResponse> | null>(null);
  const [contrarianPreview, setContrarianPreview] =
    useState<Partial<ContrarianInsightsResponse> | null>(null);
  const [repurposeStatus, setRepurposeStatus] = useState('');
  const [contrarianStatus, setContrarianStatus] = useState('');
  const [repurposeAssets, setRepurposeAssets] =
    useState<RepurposeResponse['assets'] | null>(null);
  const [contrarianInsights, setContrarianInsights] =
    useState<ContrarianInsightsResponse['insights'] | null>(null);
  const [copyMessage, setCopyMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadPost = async () => {
      setIsLoading(true);

      try {
        const data = await apiRequest<PostResponse>(`/posts/${slug}`);

        if (!isMounted) {
          return;
        }

        setPost(data.post);
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

    loadPost();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  useEffect(() => {
    if (post?.slug) {
      trackReadPost(post.slug);
    }
  }, [post?.slug]);

  const handleRepurpose = async () => {
    if (!post) return;

    setIsRepurposing(true);
    setRepurposeMessage('');
    setRepurposeAssets(null);
    setRepurposePreview(null);
    setRepurposeStatus('');

    try {
      const data = await apiStreamRequest<RepurposeResponse>(
        '/ai/repurpose',
        {
          method: 'POST',
          body: JSON.stringify({ slug: post.slug }),
        },
        {
          onStatus: setRepurposeStatus,
          onPartial: (partial) => setRepurposePreview(partial),
          onFinal: (finalPayload) => {
            setRepurposePreview(finalPayload);
            setRepurposeAssets(finalPayload.assets);
            setRepurposeStatus('Repurpose assets ready.');
          },
        }
      );

      setRepurposeAssets(data.assets);
      setRepurposePreview(data);
    } catch (error) {
      setRepurposeMessage(
        error instanceof Error ? error.message : 'Could not repurpose this article.'
      );
    } finally {
      setIsRepurposing(false);
    }
  };

  const handleContrarian = async () => {
    if (!post) return;

    setIsAnalyzing(true);
    setContrarianMessage('');
    setContrarianInsights(null);
    setContrarianPreview(null);
    setContrarianStatus('');

    try {
      const data = await apiStreamRequest<ContrarianInsightsResponse>(
        '/ai/contrarian-insights',
        {
          method: 'POST',
          body: JSON.stringify({ slug: post.slug }),
        },
        {
          onStatus: setContrarianStatus,
          onPartial: (partial) => setContrarianPreview(partial),
          onFinal: (finalPayload) => {
            setContrarianPreview(finalPayload);
            setContrarianInsights(finalPayload.insights);
            setContrarianStatus('Contrarian insights ready.');
          },
        }
      );

      setContrarianInsights(data.insights);
      setContrarianPreview(data);
    } catch (error) {
      setContrarianMessage(
        error instanceof Error
          ? error.message
          : 'Could not generate contrarian insights for this article.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const paragraphs = String(post?.content || '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const displayedRepurposeAssets = repurposeAssets || repurposePreview?.assets;
  const displayedContrarianInsights = contrarianInsights || contrarianPreview?.insights;

  const handleCopy = async (label: string, value: string) => {
    const copied = await copyTextToClipboard(value);
    setCopyMessage(copied ? `${label} copied.` : `Could not copy ${label.toLowerCase()}.`);
    window.setTimeout(() => setCopyMessage(''), 2200);
  };

  return (
    <PageReveal>
      <section className="px-4 py-8 sm:px-6 md:px-10 md:py-12">
        <div className="mx-auto max-w-4xl">
        <Link
          to="/posts"
          className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
        >
          Back to posts
        </Link>

        {isLoading ? (
          <div className="mt-6 rounded-3xl bg-white/85 p-6 shadow-sm">
            <div className="h-12 w-2/3 animate-pulse rounded bg-slate-200" />
            <div className="mt-4 h-72 animate-pulse rounded-3xl bg-slate-200" />
            <div className="mt-6 h-32 animate-pulse rounded bg-slate-100" />
          </div>
        ) : message ? (
          <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            {message}
          </div>
        ) : post ? (
          <article className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-sm">
            <div
              className="min-h-80 bg-cover bg-center"
              style={{
                backgroundImage: `linear-gradient(to top, rgba(15, 23, 42, 0.66), rgba(15, 23, 42, 0.2)), url(${getPostImageUrl(post)})`,
              }}
            />

            <div className="p-6 sm:p-8 md:p-10">
              {copyMessage && (
                <div className="mb-5 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700">
                  {copyMessage}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
                <span className="rounded-2xl bg-sky-100 px-3 py-1 text-sky-700">
                  {post.category}
                </span>
                <span>{getReadTimeLabel(post)}</span>
                <span>{getAuthorName(post.author)}</span>
                <span>{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>

              <h1 className="mt-5 text-3xl font-black leading-tight text-slate-900 sm:text-4xl">
                {post.title}
              </h1>

              {post.excerpt && (
                <p className="mt-4 text-lg leading-8 text-slate-600">{post.excerpt}</p>
              )}

              <div className="mt-8 space-y-5 text-base leading-8 text-slate-700">
                {paragraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>

              {post.tags.length > 0 && (
                <div className="mt-10 flex flex-wrap gap-3">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-2xl bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Share box */}
              <div className="mt-8 border-t border-b border-slate-100 py-4 flex flex-wrap items-center justify-between gap-4">
                <span className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                  Share this post:
                </span>
                <div className="flex items-center gap-3">
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                      `${post.title} - Read more at: ${(
                        process.env.REACT_APP_FRONTEND_URL || window.location.origin
                      ).replace(/\/$/, '')}/posts/${post.slug}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366] text-white transition hover:scale-105 active:scale-95 shadow-md"
                    title="Share with WhatsApp"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12.031 2a9.972 9.972 0 00-8.643 5.015 10.016 10.016 0 00-1.344 6.077 9.97 9.97 0 004.914 7.575l-1.257 3.593 3.69-.97a9.94 9.94 0 004.64 1.157l.004.001h.001c5.498 0 9.974-4.476 9.974-9.974A9.925 9.925 0 0022 11.974c0-5.498-4.47-9.974-9.969-9.974zM8.336 6.9c.143-.314.4-.33.6-.33.155 0 .33 0 .465.015.15.015.344.06.495.344.185.346.63 1.547.69 1.666.06.12.09.255.015.4-.075.15-.165.255-.255.36-.09.105-.195.225-.27.3-.09.09-.18.18-.075.345.105.15.465.765.99 1.23.675.6 1.245.78 1.425.87.18.09.285.075.39-.045.105-.12.45-.525.57-.705.12-.18.24-.15.39-.09.15.06.945.45 1.11.525.165.075.27.105.315.18.045.075.045.435-.135.795-.18.36-.885.69-1.215.705-.33.015-.645-.105-1.035-.255a10.82 10.82 0 01-2.91-1.92 11.83 11.83 0 01-2.025-2.52c-.225-.36-.024-.555.157-.735.165-.165.345-.375.465-.54.12-.165.18-.27.27-.45.09-.18.045-.33-.015-.45a19.78 19.78 0 01-.6-1.575z" />
                    </svg>
                  </a>

                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                      post.title
                    )}&url=${encodeURIComponent(
                      `${(process.env.REACT_APP_FRONTEND_URL || window.location.origin).replace(
                        /\/$/,
                        ''
                      )}/posts/${post.slug}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white transition hover:scale-105 active:scale-95 shadow-md"
                    title="Share with X"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M18.244 2.25h3.308l-7.227 7.75 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.286L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>

                  <button
                    type="button"
                    onClick={async () => {
                      const finalUrl = `${(
                        process.env.REACT_APP_FRONTEND_URL || window.location.origin
                      ).replace(/\/$/, '')}/posts/${post.slug}`;
                      await copyTextToClipboard(finalUrl);
                      setCopyMessage('Link copied to clipboard! Open Instagram to share.');
                      window.open('https://www.instagram.com', '_blank', 'noopener,noreferrer');
                      window.setTimeout(() => setCopyMessage(''), 3000);
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white transition hover:scale-105 active:scale-95 shadow-md"
                    title="Share with Instagram"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="mt-10 grid gap-6 lg:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-sky-700">
                        AI Repurpose Engine
                      </p>
                      <h2 className="mt-2 text-xl font-bold text-slate-900">
                        Turn this post into shareable assets
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={handleRepurpose}
                      disabled={isRepurposing}
                      className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600"
                    >
                      {isRepurposing ? 'Streaming...' : 'Repurpose'}
                    </button>
                  </div>

                  {isRepurposing && (
                    <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                      <div className="flex items-center gap-3">
                        <span>{repurposeStatus || 'Building the social and newsletter variants...'}</span>
                        <span className="inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-4xl bg-sky-500" />
                          <span className="h-1.5 w-1.5 animate-pulse rounded-4xl bg-sky-400" />
                          <span className="h-1.5 w-1.5 animate-pulse rounded-4xl bg-sky-300" />
                        </span>
                      </div>
                    </div>
                  )}

                  {repurposeMessage && (
                    <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      {repurposeMessage}
                    </p>
                  )}

                  {displayedRepurposeAssets ? (
                    <div className="mt-4 space-y-4 text-sm text-slate-700">
                      <div>
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-slate-900">TL;DR</p>
                          {displayedRepurposeAssets.tldr && (
                            <button
                              type="button"
                              onClick={() => handleCopy('TL;DR', displayedRepurposeAssets.tldr || '')}
                              className="text-xs font-semibold text-sky-700 transition hover:text-sky-500"
                            >
                              Copy
                            </button>
                          )}
                        </div>
                        <p className="mt-2 leading-6 text-slate-600">
                          {displayedRepurposeAssets.tldr || 'Waiting for the summary...'}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-slate-900">Pull quote</p>
                          {displayedRepurposeAssets.pullQuote && (
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy('pull quote', displayedRepurposeAssets.pullQuote || '')
                              }
                              className="text-xs font-semibold text-sky-700 transition hover:text-sky-500"
                            >
                              Copy
                            </button>
                          )}
                        </div>
                        <p className="mt-2 border-l-2 border-sky-300 pl-4 italic text-slate-600">
                          {displayedRepurposeAssets.pullQuote || 'Waiting for a standout quote...'}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-slate-900">Meta description</p>
                          {displayedRepurposeAssets.metaDescription && (
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(
                                  'meta description',
                                  displayedRepurposeAssets.metaDescription || ''
                                )
                              }
                              className="text-xs font-semibold text-sky-700 transition hover:text-sky-500"
                            >
                              Copy
                            </button>
                          )}
                        </div>
                        <p className="mt-2 leading-6 text-slate-600">
                          {displayedRepurposeAssets.metaDescription || 'Waiting for the metadata...'}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-slate-900">X thread</p>
                          {(displayedRepurposeAssets.xThread || []).length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(
                                  'X thread',
                                  (displayedRepurposeAssets.xThread || []).join('\n')
                                )
                              }
                              className="text-xs font-semibold text-sky-700 transition hover:text-sky-500"
                            >
                              Copy
                            </button>
                          )}
                        </div>
                        <ul className="mt-2 space-y-2 text-slate-600">
                          {(displayedRepurposeAssets.xThread || []).map((tweet) => (
                            <li key={tweet}>• {tweet}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-slate-900">LinkedIn version</p>
                          {displayedRepurposeAssets.linkedinPost && (
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(
                                  'LinkedIn version',
                                  displayedRepurposeAssets.linkedinPost || ''
                                )
                              }
                              className="text-xs font-semibold text-sky-700 transition hover:text-sky-500"
                            >
                              Copy
                            </button>
                          )}
                        </div>
                        <p className="mt-2 whitespace-pre-line leading-6 text-slate-600">
                          {displayedRepurposeAssets.linkedinPost || 'Waiting for the LinkedIn version...'}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-slate-900">Newsletter blurb</p>
                          {displayedRepurposeAssets.newsletterBlurb && (
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(
                                  'newsletter blurb',
                                  displayedRepurposeAssets.newsletterBlurb || ''
                                )
                              }
                              className="text-xs font-semibold text-sky-700 transition hover:text-sky-500"
                            >
                              Copy
                            </button>
                          )}
                        </div>
                        <p className="mt-2 leading-6 text-slate-600">
                          {displayedRepurposeAssets.newsletterBlurb || 'Waiting for the newsletter blurb...'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm leading-6 text-slate-500">
                      Generate a TL;DR, social thread, LinkedIn version, newsletter teaser, and meta description from this article.
                    </p>
                  )}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-sky-700">
                        Contrarian Insight Mode
                      </p>
                      <h2 className="mt-2 text-xl font-bold text-slate-900">
                        Surface hidden angles and counterpoints
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={handleContrarian}
                      disabled={isAnalyzing}
                      className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600"
                    >
                      {isAnalyzing ? 'Streaming...' : 'Analyze'}
                    </button>
                  </div>

                  {isAnalyzing && (
                    <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                      <div className="flex items-center gap-3">
                        <span>{contrarianStatus || 'Pressure-testing the article for blind spots...'}</span>
                        <span className="inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-4xl bg-sky-500" />
                          <span className="h-1.5 w-1.5 animate-pulse rounded-4xl bg-sky-400" />
                          <span className="h-1.5 w-1.5 animate-pulse rounded-4xl bg-sky-300" />
                        </span>
                      </div>
                    </div>
                  )}

                  {contrarianMessage && (
                    <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      {contrarianMessage}
                    </p>
                  )}

                  {displayedContrarianInsights ? (
                    <div className="mt-4 space-y-4 text-sm text-slate-700">
                      <div>
                        <p className="font-semibold text-slate-900">Core claim</p>
                        <p className="mt-2 leading-6 text-slate-600">
                          {displayedContrarianInsights.coreClaim || 'Waiting for the core claim...'}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">Counterpoints</p>
                        <ul className="mt-2 space-y-2 text-slate-600">
                          {(displayedContrarianInsights.counterpoints || []).map((point) => (
                            <li key={point}>• {point}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">Blind spots</p>
                        <ul className="mt-2 space-y-2 text-slate-600">
                          {(displayedContrarianInsights.blindSpots || []).map((spot) => (
                            <li key={spot}>• {spot}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">Skeptic questions</p>
                        <ul className="mt-2 space-y-2 text-slate-600">
                          {(displayedContrarianInsights.skepticQuestions || []).map((question) => (
                            <li key={question}>• {question}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">Follow-up angles</p>
                        <ul className="mt-2 space-y-2 text-slate-600">
                          {(displayedContrarianInsights.followUpAngles || []).map((angle) => (
                            <li key={angle}>• {angle}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm leading-6 text-slate-500">
                      This mode highlights the strongest counterarguments, the assumptions the article leans on, and the follow-up angles worth exploring next.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </article>
        ) : null}
        </div>
      </section>
    </PageReveal>
  );
};

export default PostDetailsPage;