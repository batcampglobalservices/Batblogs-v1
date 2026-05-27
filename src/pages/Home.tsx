import React, { useEffect, useMemo, useState } from 'react';
import BlogsList, { TopicCard } from '../components/BlogsList';
import LastestPosts from '../components/LastestPosts';
import { apiRequest } from '../lib/api';

function HomePage() {
  const [topics, setTopics] = useState<TopicCard[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;
    const loadHomeContent = async () => {
      setIsLoading(true);
      try {
        const [categoriesData, postsData] = await Promise.all([
          apiRequest('/categories'),
          apiRequest('/posts?published=true&limit=12'),
        ]);
        if (!isMounted) return;
        const publishedPosts = postsData.posts || [];
        const postsCountByCategory = publishedPosts.reduce((map: Map<string, number>, post: any) => {
          map.set(post.category, (map.get(post.category) || 0) + 1);
          return map;
        }, new Map());
        const nextTopics = categoriesData.categories
          .map((category: any) => ({
            id: category._id,
            name: category.name,
            description: category.description,
            posts: postsCountByCategory.get(category.name) || 0,
            imageUrl: category.imageUrl,
          }))
          .sort((left: any, right: any) => right.posts - left.posts)
          .slice(0, 4);
        setTopics(nextTopics);
        setPosts(publishedPosts);
        setErrorMessage('');
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Could not load the latest posts and categories.'
        );
      } finally {
        if (isMounted) setIsLoading(false);
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
    <>
      {errorMessage && (
        <div className="px-4 pt-6 sm:px-6 md:px-10">
          <div className="mx-auto max-w-2xl rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {errorMessage}
          </div>
        </div>
      )}

      <section className="px-4 py-10 sm:px-6 md:px-10">
        <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome to BatBlogs</h1>
          <p className="text-base text-slate-600 mb-6">A clean, focused space for reading and writing. No distractions, just stories and ideas.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-6">
            <a href="/posts" className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">Browse Posts</a>
            <a href="/new-blog" className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-500">Write a Post</a>
          </div>
          <div className="flex justify-center gap-8 mt-6">
            {quickStats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-xs uppercase text-slate-500 font-semibold tracking-widest">{stat.label}</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</div>
                <div className="text-xs text-slate-400 mt-1">{stat.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-10 sm:px-6 md:px-10">
        <div className="mx-auto max-w-4xl">
          <BlogsList topics={topics} isLoading={isLoading} />
          <LastestPosts
            featuredPost={featuredPost}
            recommendedPosts={recommendedPosts}
            latestPosts={latestPosts}
            isLoading={isLoading}
          />
        </div>
      </section>
    </>
  );
}

export default HomePage;