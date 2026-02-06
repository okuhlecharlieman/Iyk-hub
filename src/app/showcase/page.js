'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { listShowcasePosts, deleteShowcasePost, updateShowcasePost, getUserDoc } from '../../lib/firebaseHelpers';
import PostCard from '../../components/showcase/PostCard';
import NewPostCard from '../../components/showcase/NewPostCard.jsx';
import LoadingSpinner from '../../components/LoadingSpinner';
import EditPostModal from '../../components/showcase/EditPostModal';
import Link from 'next/link';

export default function ShowcasePage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [authors, setAuthors] = useState({});
  const [loading, setLoading] = useState(true);
  
  // State for the modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [postToEdit, setPostToEdit] = useState(null);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const postList = await listShowcasePosts(100);
      setPosts(postList);

      // Fetch author details for each post
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
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleDelete = async (postId) => {
    if (window.confirm("Are you sure you want to delete this post? This cannot be undone.")) {
      try {
        await deleteShowcasePost(postId);
        await loadPosts(); // Refresh the list
      } catch (error) {
        console.error("Error deleting post:", error);
        alert("Failed to delete post. Please try again.");
      }
    }
  };

  const handleUpdate = async (postId, data) => {
    try {
      await updateShowcasePost(postId, data);
      await loadPosts(); // Refresh the list
      return true; // Indicate success
    } catch (error) {
      console.error("Error updating post:", error);
      return false; // Indicate failure
    }
  };

  // Functions to handle opening and closing the modal
  const openEditModal = (post) => {
    setPostToEdit(post);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setPostToEdit(null);
    setIsEditModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white">Community Showcase</h1>
          {user && (
            <Link href="/profile" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition-colors">
              My Profile
            </Link>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-3 sm:grid-cols-2 grid-cols-1">
          {user && <NewPostCard onPostCreated={loadPosts} />}
          
          {loading ? (
            <div className="lg:col-span-3 flex justify-center items-center"><LoadingSpinner /></div>
          ) : (
            posts.map(post => (
              <PostCard 
                key={post.id} 
                post={post} 
                author={authors[post.uid]} 
                isOwner={user && user.uid === post.uid}
                onEdit={() => openEditModal(post)} // Pass the edit handler
                onDelete={() => handleDelete(post.id)} // Pass the delete handler
              />
            ))
          )}
        </div>
      </div>

      {/* Edit Post Modal Render */}
      <EditPostModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        post={postToEdit}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
