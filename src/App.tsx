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
    <main className="relative min-h-screen overflow-x-clip bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_42%,#eef6ff_100%)] text-slate-900">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.045)_1px,transparent_1px)] bg-[size:48px_48px]" />

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
