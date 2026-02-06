'use client';
import { useEffect, useState, useCallback } from 'react';
import Masonry from 'react-masonry-css';
import { useAuth } from '../../context/AuthContext';
import { listShowcasePosts, deleteShowcasePost, updateShowcasePost, getUserDoc, togglePostVote } from '../../lib/firebaseHelpers';
import PostCard, { PostCardSkeleton } from '../../components/showcase/PostCard';
import NewPostCard from '../../components/showcase/NewPostCard';
import NewPostModal from '../../components/showcase/NewPostModal';
import EditPostModal from '../../components/showcase/EditPostModal';

export default function ShowcasePage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [authors, setAuthors] = useState({});
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [postToEdit, setPostToEdit] = useState(null);
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const postList = await listShowcasePosts(100);
      setPosts(postList);
      const authorIds = [...new Set(postList.map(p => p.uid))];
      const authorPromises = authorIds.map(uid => getUserDoc(uid));
      const authorDocs = await Promise.all(authorPromises);
      const authorMap = authorDocs.reduce((acc, doc) => {
        if (doc) acc[doc.id] = doc;
        return acc;
      }, {});
      setAuthors(authorMap);
    } catch (error) {
      console.error("Error loading showcase posts:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleDelete = async (postId) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      try {
        await deleteShowcasePost(postId);
        await loadPosts();
      } catch (error) {
        console.error("Error deleting post:", error);
        alert("Failed to delete post.");
      }
    }
  };

  const handleUpdate = async (postId, data) => {
    try {
      await updateShowcasePost(postId, data);
      await loadPosts();
      return true;
    } catch (error) {
      console.error("Error updating post:", error);
      return false;
    }
  };

  const handleVote = async (postId) => {
    if (!user) return alert("You must be logged in to vote.");
    try {
      await togglePostVote(postId, user.uid);
      // Optimistically update UI or reload
      loadPosts(); 
    } catch (error) {
      console.error("Error toggling vote:", error);
    }
  };

  const openEditModal = (post) => {
    setPostToEdit(post);
    setIsEditModalOpen(true);
  };

  const breakpointColumnsObj = {
    default: 3,
    1100: 2,
    700: 1
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">Community Showcase</h1>
          <p className="mt-4 max-w-3xl mx-auto text-lg md:text-xl text-gray-500 dark:text-gray-400">Discover the creativity and talent within the Intwana Hub community.</p>
        </div>

        <Masonry
          breakpointCols={breakpointColumnsObj}
          className="my-masonry-grid"
          columnClassName="my-masonry-grid_column px-4">
          
          {user && <div className="mb-8"><NewPostCard onClick={() => setIsNewPostModalOpen(true)} /></div>}
          
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <div className="mb-8" key={i}><PostCardSkeleton /></div>)
          ) : (
            posts.map(post => (
              <div className="mb-8" key={post.id}>
                <PostCard 
                  post={post} 
                  author={authors[post.uid]} 
                  isOwner={user && user.uid === post.uid}
                  onEdit={() => openEditModal(post)}
                  onDelete={() => handleDelete(post.id)}
                  onVote={() => handleVote(post.id)}
                />
              </div>
            ))
          )}
        </Masonry>
      </div>

      <NewPostModal 
        isOpen={isNewPostModalOpen} 
        onClose={() => setIsNewPostModalOpen(false)} 
        onPostCreated={loadPosts} 
      />

      <EditPostModal
        isOpen={isEditModalOpen}
        onClose={() => setPostToEdit(null)}
        post={postToEdit}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
