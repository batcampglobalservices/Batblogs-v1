import React, { useEffect, useMemo, useState } from 'react';
import BlogsList, { TopicCard } from '../components/BlogsList';
import LastestPosts from '../components/LastestPosts';
import { apiRequest } from '../lib/api';
import WelcomeComponent from '../components/Welcome';

function HomePage() {
  const [topics, setTopics] = useState<TopicCard[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      } catch (error) {
        if (!isMounted) return;
        setTopics([]);
        setPosts([]);
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
  return (
    <>
      <WelcomeComponent />

      <section className="pb-10">
        <div className="mx-auto max-w-6xl">
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
