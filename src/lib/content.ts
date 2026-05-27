export type PostAuthor = {
  firstName: string;
  lastName: string;
  username: string;
};

export type BlogPost = {
  _id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  tags: string[];
  coverImageUrl: string;
  readTime: string;
  publishNow: boolean;
  allowComments: boolean;
  author?: PostAuthor;
  createdAt: string;
  updatedAt?: string;
};

export type CategoryItem = {
  _id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
  createdAt?: string;
};

export type PostsResponse = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  posts: BlogPost[];
};

export type PostResponse = {
  post: BlogPost;
};

export type CategoriesResponse = {
  categories: CategoryItem[];
};

type CategoryVisual = {
  description: string;
  imageUrl: string;
};

const categoryVisuals: Record<string, CategoryVisual> = {
  Technology: {
    description: 'Latest trends in software, AI, gadgets, and innovation.',
    imageUrl:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
  },
  Lifestyle: {
    description: 'Wellness, habits, productivity, and everyday inspiration.',
    imageUrl:
      'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=80',
  },
  Business: {
    description: 'Startup ideas, growth strategy, and career insights.',
    imageUrl:
      'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80',
  },
  Travel: {
    description: 'Guides, stories, and experiences from around the world.',
    imageUrl:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
  },
  Health: {
    description: 'Practical ideas for wellness, energy, and sustainable routines.',
    imageUrl:
      'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80',
  },
  'Personal Development': {
    description: 'Growth systems, mindset shifts, and skills that compound over time.',
    imageUrl:
      'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=1200&q=80',
  },
};

export const getCategoryMeta = (
  categoryName: string,
  fallbackDescription = 'Fresh stories, lessons, and ideas from this category.',
  fallbackImageUrl = ''
): CategoryVisual => {
  if (fallbackImageUrl.trim()) {
    return {
      description: fallbackDescription,
      imageUrl: fallbackImageUrl,
    };
  }

  const preset = categoryVisuals[categoryName];

  if (preset) {
    return preset;
  }

  return {
    description: fallbackDescription,
    imageUrl:
      'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80',
  };
};

export const getPostImageUrl = (post: Partial<BlogPost>) =>
  post.coverImageUrl || getCategoryMeta(post.category || '').imageUrl;

export const getPostExcerpt = (post: Partial<BlogPost>) => {
  if (post.excerpt && post.excerpt.trim()) {
    return post.excerpt.trim();
  }

  const compactContent = String(post.content || '').replace(/\s+/g, ' ').trim();

  if (!compactContent) {
    return 'Fresh perspective, practical ideas, and a story worth reading.';
  }

  return `${compactContent.slice(0, 150)}${compactContent.length > 150 ? '...' : ''}`;
};

export const getReadTimeLabel = (post: Partial<BlogPost>) => {
  if (post.readTime && post.readTime.trim()) {
    return post.readTime.trim();
  }

  const wordCount = String(post.content || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return `${Math.max(1, Math.ceil(wordCount / 200))} min read`;
};

export const getAuthorName = (author?: Partial<PostAuthor>) => {
  if (!author) {
    return 'BatBlogs';
  }

  const fullName = `${author.firstName || ''} ${author.lastName || ''}`.trim();
  return fullName || author.username || 'BatBlogs';
};