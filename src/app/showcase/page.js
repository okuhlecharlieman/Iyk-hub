'use client';
import { useEffect, useState } from 'react';
import { doc, collection, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import ContentCard from '../../components/ContentCard';
import PostEditor from '../../components/PostEditor';
import { useAuth } from '../../context/AuthContext';
import { SkeletonGrid } from '../../components/loaders/SkeletonLoader';
import { ErrorAlert, ErrorEmptyState } from '../../components/alerts/Alerts';
import { ErrorBoundary } from '../../components/error/ErrorBoundary';
import { FaPlus, FaSearch, FaExclamationTriangle } from 'react-icons/fa';

export default function ShowcasePage() {
  const { user, isAdmin } = useAuth();
  const [posts, setPosts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [error, setError] = useState('');

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/showcase?limit=20');
      if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
      const data = await response.json();

      if (Array.isArray(data)) {
        setPosts(data);
        setNextCursor(null);
      } else {
        setPosts(data?.posts || []);
        setNextCursor(data?.nextCursor || null);
      }
    } catch (err) {
      console.error(err);
      setError('Could not load the showcase. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const loadMorePosts = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);

    try {
      const response = await fetch(`/api/showcase?limit=20&cursor=${encodeURIComponent(nextCursor)}`);
      if (!response.ok) throw new Error(`Failed to fetch more posts: ${response.statusText}`);

      const data = await response.json();
      const newPosts = Array.isArray(data) ? data : (data?.posts || []);
      setNextCursor(Array.isArray(data) ? null : (data?.nextCursor || null));

      setPosts((prev) => {
        const map = new Map(prev.map((p) => [p.id, p]));
        newPosts.forEach((p) => map.set(p.id, p));
        return Array.from(map.values());
      });
    } catch (err) {
      console.error(err);
      alert(`Failed to load more posts: ${err.message}`);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleAddPost = () => {
    setEditingPost(null);
    setIsEditorOpen(true);
  };

  const handleEditPost = (post) => {
    setEditingPost(post);
    setIsEditorOpen(true);
  };

  const handleSavePost = async (postData) => {
    if (!user) return alert('You must be logged in to save a post.');

    try {
      const isEditingAnotherUsersPost = editingPost && editingPost.uid !== user.uid;

      if (editingPost) {
        if (isAdmin && isEditingAnotherUsersPost) {
          const token = await user.getIdToken();
          const response = await fetch('/api/admin/updatePost', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ postId: editingPost.id, updates: postData }),
          });

          if (!response.ok) {
            let errorMessage = 'Could not update the post as admin.';
            const bodyText = await response.text();
            try {
              const result = JSON.parse(bodyText);
              if (result?.error) errorMessage = result.error;
            } catch {
              if (bodyText) errorMessage = bodyText;
            }
            throw new Error(errorMessage);
          }
        } else {
          const postRef = doc(db, 'wallPosts', editingPost.id);
          await updateDoc(postRef, { ...postData, updatedAt: serverTimestamp() });
        }
      } else {
        await addDoc(collection(db, 'wallPosts'), {
          ...postData,
          uid: user.uid,
          author: { displayName: user.displayName, photoURL: user.photoURL },
          createdAt: serverTimestamp(),
          reactions: { likes: 0, hearts: 0, laughs: 0 },
        });
      }

      setIsEditorOpen(false);
      setEditingPost(null);
      fetchPosts();
    } catch (err) {
      console.error('Error saving post:', err);
      alert(`There was an error saving your post: ${err.message}`);
    }
  };

  const handleDeletePost = async (postId, postUid) => {
    if (!user || !window.confirm('Are you sure you want to delete this post?')) return;

    try {
      const isOwner = user.uid === postUid;

      if (isAdmin) {
        const token = await user.getIdToken();
        const response = await fetch('/api/admin/deletePost', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ postId }),
        });
        if (!response.ok) {
          let errorMessage = 'Failed to delete post.';
          const bodyText = await response.text();
          try {
            const json = JSON.parse(bodyText);
            if (json?.error) errorMessage = json.error;
          } catch {
            if (bodyText) errorMessage = bodyText;
          }
          throw new Error(errorMessage);
        }
      } else if (isOwner) {
        const response = await fetch('/api/showcase/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId }),
        });
        if (!response.ok) {
          let errorMessage = 'Failed to delete post.';
          const bodyText = await response.text();
          try {
            const json = JSON.parse(bodyText);
            if (json?.error) errorMessage = json.error;
          } catch {
            if (bodyText) errorMessage = bodyText;
          }
          throw new Error(errorMessage);
        }
      } else {
        throw new Error('You do not have permission to delete this post.');
      }
      fetchPosts();
    } catch (err) {
      console.error('Error deleting post:', err);
      alert(`Failed to delete post: ${err.message}`);
    }
  };

  const filteredPosts = posts.filter((p) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      (p.title || '').toLowerCase().includes(search) ||
      (p.description || '').toLowerCase().includes(search) ||
      (p.author?.displayName || '').toLowerCase().includes(search)
    );
  });

  const content = (
    loading ? <LoadingSpinner /> :
    error ? <div className="text-red-500 text-center py-10">{error}</div> :
    filteredPosts.length > 0 ? (
      <>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.map(p => (
            <ContentCard
              key={p.id}
              p={p}
              onEdit={() => handleEditPost(p)}
              onDelete={() => handleDeletePost(p.id, p.uid)}
              canManage={isAdmin || (user && user.uid === p.uid)}
            />
          ))}
        </div>
        {!searchTerm && nextCursor && (
          <div className="flex justify-center mt-10">
            <button
              onClick={loadMorePosts}
              disabled={loadingMore}
              className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          </div>
        )}
      </>
    ) : (
      <div className="text-center py-10">
        <p className="text-gray-500 dark:text-gray-400">No posts match your search.</p>
      </div>
    )
  );

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-12 md:px-8 md:py-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Community Showcase</h1>
              <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">Creations from our talented community members.</p>
            </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search posts..."
              className="w-full sm:w-72 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {user && (
              <button onClick={handleAddPost} className="flex-shrink-0 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                <FaPlus size={20} />
              </button>
            )}
          </div>
        </div>

        {content}
      </div>

      {isEditorOpen && (
        <PostEditor
          post={editingPost}
          onSave={handleSavePost}
          onClose={() => setIsEditorOpen(false)}
        />
      )}
    </div></ErrorBoundary>
  );
}
