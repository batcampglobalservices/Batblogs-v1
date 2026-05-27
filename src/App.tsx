import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import './App.scss';
import Footer from './components/Footer';
import Navbar from './components/Navbar';
import HomePage from './pages/Home';
import EditMyPostPage from './pages/EditMyPost';
import NewBlogForm from './pages/NewBlog';
import LoginPage from './pages/Login';
import MyPostsPage from './pages/MyPosts';
import PostDetailsPage from './pages/PostDetails';
import PostsPage from './pages/Posts';
import RegisterPage from './pages/Register';
import SuperAdminPage from './pages/SuperAdminDashboard';
import { getAuthToken, getAuthUser } from './lib/api';

type ProtectedRouteProps = {
  children: React.ReactNode;
  roles?: Array<'user' | 'admin' | 'superadmin'>;
};

const ProtectedRoute = ({ children, roles }: ProtectedRouteProps) => {
  const token = getAuthToken();
  const user = getAuthUser();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <main className="relative min-h-screen overflow-x-clip bg-linear-to-br from-slate-100 via-white to-sky-100 text-slate-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8rem] top-24 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute right-[-5rem] top-0 h-80 w-80 rounded-full bg-cyan-100/60 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-64 w-64 rounded-full bg-amber-100/55 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar />
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/posts" element={<PostsPage />} />
            <Route path="/posts/:slug" element={<PostDetailsPage />} />
            <Route
              path="/new-blog"
              element={
                <ProtectedRoute>
                  <NewBlogForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-posts"
              element={
                <ProtectedRoute>
                  <MyPostsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-posts/:id/edit"
              element={
                <ProtectedRoute>
                  <EditMyPostPage />
                </ProtectedRoute>
              }
            />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/superadmin"
              element={
                <ProtectedRoute roles={['superadmin']}>
                  <SuperAdminPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
        <Footer />
      </div>
    </main>
  );
};

export default App;
