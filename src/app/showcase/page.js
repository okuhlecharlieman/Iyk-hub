'use client';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit, startAfter } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import ContentCard from '../../components/ContentCard';
import PostEditor from '../../components/PostEditor';
import InstallButton from '../../components/InstallButton';
import { useAuth } from '../../context/AuthContext';
import { togglePostVote } from '../../lib/firebase/helpers';
import { SkeletonGrid } from '../../components/loaders/SkeletonLoader';
import { ErrorAlert, ErrorEmptyState } from '../../components/alerts/Alerts';
import { ErrorBoundary } from '../../components/error/ErrorBoundary';
import { FaPlus, FaSearch, FaExclamationTriangle, FaRocket } from 'react-icons/fa';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useToast } from '../../components/ui/ToastProvider';

export default function ShowcasePage() {
  const { user, isAdmin } = useAuth();
  const [posts, setPosts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [error, setError] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const toast = useToast();

  useEffect(() => {
    const q = query(collection(db, 'showcase'), orderBy('createdAt', 'desc'), limit(20));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(newPosts);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError('Could not load the showcase. Please try again later.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loadMorePosts = async () => {
    if (!lastVisible || loadingMore) return;
    setLoadingMore(true);

    const q = query(
      collection(db, 'showcase'),
      orderBy('createdAt', 'desc'),
      startAfter(lastVisible),
      limit(20)
    );

    try {
      const snapshot = await getDocs(q);
      const newPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(prev => [...prev, ...newPosts]);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
    } catch (err) {
      console.error(err);
      toast('error', `Failed to load more posts: ${err.message}`);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleAddPost = () => {
    setEditingPost(null);
    setIsEditorOpen(true);
  };

  const handleEditPost = (post) => {
    setEditingPost(post);
    setIsEditorOpen(true);
  };

  const handleSavePost = async (postData) => {
    if (!user) {
      toast('warning', 'You must be logged in to save a post.');
      return;
    }

    const isEditing = !!editingPost;
    setLoading(true);
    setIsEditorOpen(false);

    try {
      const token = await user.getIdToken();
      let response;

      if (isEditing) {
        const isEditingAnotherUsersPost = editingPost.uid !== user.uid;
        const endpoint = (isAdmin && isEditingAnotherUsersPost)
          ? '/api/admin/updatePost'
          : '/api/showcase/update';

        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ postId: editingPost.id, updates: postData }),
        });
      } else {
        response = await fetch('/api/showcase/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(postData),
        });
      }

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || `Failed to ${isEditing ? 'update' : 'submit'} post.`);
      }

      toast('success', `Post ${isEditing ? 'updated' : 'created'} successfully!`);
      // No need to fetchPosts, onSnapshot will handle it

      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);

    } catch (err) {
      console.error('Error saving post:', err);
      toast('error', `Error saving your post: ${err.message}`);
    } finally {
      setEditingPost(null);
      setLoading(false); // Reset loading state
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
      // No need to fetchPosts, onSnapshot will handle it
    } catch (err) {
      console.error('Error deleting post:', err);
      toast('error', `Failed to delete post: ${err.message}`);
    }
  };

  const handlePostReaction = async (postId, reactionType = 'thumbsUp') => {
    if (!user) {
      toast('warning', 'Please log in to react to posts.');
      return;
    }
    try {
      await togglePostVote(postId, user.uid, reactionType);
    } catch (err) {
      console.error('Failed to react to post:', err);
      toast('error', `Unable to update reaction: ${err.message || 'Please try again.'}`);
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

  const featuredPosts = filteredPosts.filter((p) => p.isBoosted);
  const regularPosts = filteredPosts.filter((p) => !p.isBoosted);

  const content = (
    loading ? <SkeletonGrid /> :
    error ? <ErrorAlert message={error} /> :
    (filteredPosts.length === 0 && !searchTerm) ? <ErrorEmptyState title="No Showcase Posts Yet" message="Be the first to share your work!" /> :
    filteredPosts.length > 0 ? (
      <>
        {featuredPosts.length > 0 && !searchTerm && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <FaRocket className="text-purple-500" />
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Featured Creators</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredPosts.map(p => (
                <ContentCard
                  key={p.id}
                  p={p}
                  react={handlePostReaction}
                  onEdit={() => handleEditPost(p)}
                  onDelete={() => handleDeletePost(p.id, p.uid)}
                  canManage={isAdmin || (user && user.uid === p.uid)}
                />
              ))}
            </div>
          </div>
        )}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {(searchTerm ? filteredPosts : regularPosts).map(p => (
            <ContentCard
              key={p.id}
              p={p}
              react={handlePostReaction}
              onEdit={() => handleEditPost(p)}
              onDelete={() => handleDeletePost(p.id, p.uid)}
              canManage={isAdmin || (user && user.uid === p.uid)}
            />
          ))}
        </div>
        {!searchTerm && lastVisible && (
          <div className="flex justify-center mt-10">
            <button
              onClick={loadMorePosts}
              disabled={loadingMore}
              className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {loadingMore ? <LoadingSpinner size="sm"/> : 'Load more'}
            </button>
          </div>
        )}
      </>
    ) : (
        <ErrorEmptyState title="No Results Found" message="No posts matched your search criteria." />
    )
  );

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-12 md:px-8 md:py-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
                <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Community Showcase</h1>
                <InstallButton />
              </div>
              <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">Creations from our talented community members.</p>
            </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
                <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search posts..."
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <FaSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            </div>
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
    </ErrorBoundary>
  );
}
