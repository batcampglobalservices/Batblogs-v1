import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import BlogsList, { TopicCard } from '../components/BlogsList';
import LastestPosts from '../components/LastestPosts';
import { PageReveal, Reveal } from '../components/motion/Reveal';
import WelcomeComponent from '../components/Welcome';
import { apiRequest } from '../lib/api';
import {
    BlogPost,
    CategoriesResponse,
    PostsResponse,
    getCategoryMeta,
} from '../lib/content';

const HomePage = () => {
    const [topics, setTopics] = useState<TopicCard[]>([]);
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        let isMounted = true;

        const loadHomeContent = async () => {
            setIsLoading(true);

            try {
                const [categoriesData, postsData] = await Promise.all([
                    apiRequest<CategoriesResponse>('/categories'),
                    apiRequest<PostsResponse>('/posts?published=true&limit=12'),
                ]);

                if (!isMounted) {
                    return;
                }

                const publishedPosts = postsData.posts || [];
                const postsCountByCategory = publishedPosts.reduce<Map<string, number>>((map, post) => {
                    map.set(post.category, (map.get(post.category) || 0) + 1);
                    return map;
                }, new Map());

                const nextTopics = categoriesData.categories
                    .map((category) => {
                        const categoryMeta = getCategoryMeta(
                            category.name,
                            category.description,
                            category.imageUrl
                        );
                        return {
                            id: category._id,
                            name: category.name,
                            description: category.description || categoryMeta.description,
                            posts: postsCountByCategory.get(category.name) || 0,
                            imageUrl: categoryMeta.imageUrl,
                        };
                    })
                    .sort((left, right) => right.posts - left.posts)
                    .slice(0, 4);

                setTopics(nextTopics);
                setPosts(publishedPosts);
                setErrorMessage('');
            } catch (error) {
                if (!isMounted) {
                    return;
                }

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : 'Could not load the latest posts and categories.'
                );
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadHomeContent();

        return () => {
            isMounted = false;
        };
    }, []);

    const featuredPost = posts[0] || null;
    const recommendedPosts = useMemo(() => posts.slice(1, 3), [posts]);
    const latestPosts = useMemo(() => posts.slice(3, 6), [posts]);
    const quickStats = useMemo(
        () => [
            {
                label: 'Published stories',
                value: String(posts.length).padStart(2, '0'),
                note: 'Fresh pieces live on the site right now.',
            },
            {
                label: 'Hot categories',
                value: String(topics.length).padStart(2, '0'),
                note: 'Topics readers are leaning into this week.',
            },
            {
                label: 'Front-page signal',
                value: featuredPost?.category || 'Ready',
                note: featuredPost
                    ? 'The category currently leading the front page.'
                    : 'Waiting for the next standout story to land.',
            },
        ],
        [featuredPost, posts.length, topics.length]
    );

    return (
        <PageReveal>
            <WelcomeComponent />
            {errorMessage && (
                <div className="px-4 pt-6 sm:px-6 md:px-10">
                    <div className="mx-auto max-w-6xl rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
                        {errorMessage}
                    </div>
                </div>
            )}

            <section className="px-4 pb-2 pt-6 sm:px-6 md:px-10">
                <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1.05fr_0.95fr]">
                    <Reveal className="rounded-4xl border border-white/70 bg-white/78 p-6 shadow-xl shadow-slate-900/5 backdrop-blur sm:p-8">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                            Fresh energy
                        </p>
                        <h2 className="mt-4 max-w-xl text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
                            A sharper front page for readers who want signal, not filler.
                        </h2>
                        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                            Move from discovery to deep reading faster, then jump straight into writing when an idea hits.
                            BatBlogs is tuned for thoughtful browsing, cleaner publishing, and better follow-through.
                        </p>

                        <div className="mt-6 flex flex-wrap gap-3">
                            <Link
                                to="/posts"
                                className="rounded-3xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-600"
                            >
                                Start reading
                            </Link>
                            <Link
                                to="/new-blog"
                                className="rounded-3xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
                            >
                                Write something new
                            </Link>
                        </div>
                    </Reveal>

                    <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                        {quickStats.map((stat, index) => (
                            <Reveal
                                key={stat.label}
                                delay={index * 0.08}
                                className="rounded-3xl border border-white/70 bg-white/72 p-5 shadow-lg shadow-slate-900/5 backdrop-blur"
                            >
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                    {stat.label}
                                </p>
                                <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                                    {stat.value}
                                </p>
                                <p className="mt-2 text-sm leading-6 text-slate-600">{stat.note}</p>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            <BlogsList topics={topics} isLoading={isLoading} />
            <LastestPosts
                featuredPost={featuredPost}
                recommendedPosts={recommendedPosts}
                latestPosts={latestPosts}
                isLoading={isLoading}
            />

            <section className="px-4 pb-6 pt-2 sm:px-6 md:px-10 md:pb-10">
                <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[0.92fr_1.08fr]">
                    <Reveal className="rounded-4xl bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/10 sm:p-8">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
                            Keep momentum
                        </p>
                        <h2 className="mt-4 max-w-md text-3xl font-black leading-tight sm:text-4xl">
                            Read a strong idea, then publish your own while the spark is still there.
                        </h2>
                        <p className="mt-4 max-w-lg text-sm leading-7 text-slate-300 sm:text-base">
                            The best content flow is not just discovery. It is discovery, reaction, and a clean path to saying something worth sharing.
                        </p>
                    </Reveal>

                    <div className="grid gap-5 md:grid-cols-2">
                        <Reveal className="rounded-4xl border border-white/70 bg-white/76 p-6 shadow-lg shadow-slate-900/5 backdrop-blur">
                            <p className="text-lg font-semibold text-slate-950">Write with structure</p>
                            <p className="mt-3 text-sm leading-6 text-slate-600">
                                Use the drafting tools, topic suggestions, and category flow to get from blank page to publishable post with less friction.
                            </p>
                        </Reveal>

                        <Reveal delay={0.08} className="rounded-4xl border border-white/70 bg-white/76 p-6 shadow-lg shadow-slate-900/5 backdrop-blur">
                            <p className="text-lg font-semibold text-slate-950">Share with intent</p>
                            <p className="mt-3 text-sm leading-6 text-slate-600">
                                Repurpose strong ideas, share posts directly, and keep each article working harder after it goes live.
                            </p>
                        </Reveal>
                    </div>
                </div>
            </section>
        </PageReveal>
    );
};

export default HomePage;