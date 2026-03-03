'use client';
import { useEffect, useState } from 'react';
import { doc, collection, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import ContentCard from '../../components/ContentCard';
import PostEditor from '../../components/PostEditor'; // Import the new editor
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import { FaPlus } from 'react-icons/fa';

export default function ShowcasePage() {
  const { user, isAdmin } = useAuth(); // Get user and admin status
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // State for the PostEditor modal
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null); // If not null, we are editing

  const fetchPosts = async () => {
    // No need to set loading to true here, to avoid flashing on re-fetches
    try {
      const response = await fetch('/api/showcase');
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      const data = await response.json();
      setPosts(data);
    } catch (err) {
      console.error(err);
      setError('Could not load the showcase. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // ---- CRUD Handlers ----

  const handleAddPost = () => {
    setEditingPost(null); // Ensure we are creating, not editing
    setIsEditorOpen(true);
  };

  const handleEditPost = (post) => {
    setEditingPost(post);
    setIsEditorOpen(true);
  };

  const handleSavePost = async (postData) => {
    if (!user) {
      alert('You must be logged in to save a post.');
      return;
    }

    try {
      if (editingPost) {
        // Update existing post
        const postRef = doc(db, 'wallPosts', editingPost.id);
        await updateDoc(postRef, { ...postData, updatedAt: serverTimestamp() });
      } else {
        // Create new post
        await addDoc(collection(db, 'wallPosts'), {
          ...postData,
          uid: user.uid,
          createdAt: serverTimestamp(),
          reactions: { likes: 0, hearts: 0, laughs: 0 },
        });
      }
      setIsEditorOpen(false);
      fetchPosts(); // Refresh posts after saving
    } catch (err) {
      console.error('Error saving post:', err);
      alert('There was an error saving your post. Please try again.');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!user || !window.confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
        // A user can delete their own post. An admin can delete any post.
        // The API endpoint handles the security check for non-admins.
        if (isAdmin) {
            // Use admin privilege to delete directly
            const postRef = doc(db, 'wallPosts', postId);
            await deleteDoc(postRef);
        } else {
            // Use the secure API endpoint for regular users
            const response = await fetch('/api/showcase/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId, uid: user.uid }),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Could not delete the post.');
            }
        }
        fetchPosts(); // Refresh posts
    } catch (err) {
        console.error('Error deleting post:', err);
        alert(`Failed to delete post: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-12 md:px-8 md:py-16">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <div className="text-center flex-grow">
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white">Community Showcase</h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">Creations from our talented community members.</p>
          </div>
          {user && (
            <button onClick={handleAddPost} className="ml-4 flex-shrink-0 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              <FaPlus size={20} />
            </button>
          )}
        </div>

        {loading ? <LoadingSpinner /> :
          error ? <div className="text-red-500 text-center py-10">{error}</div> :
          posts.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map(p => (
                <ContentCard 
                  key={p.id} 
                  p={p} 
                  onEdit={() => handleEditPost(p)} 
                  onDelete={() => handleDeletePost(p.id)}
                  canManage={isAdmin || (user && user.uid === p.uid)} // Pass down permission
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-500 dark:text-gray-400">The showcase is empty. Be the first to post!</p>
            </div>
          )
        }
      </div>
      
      {isEditorOpen && (
        <PostEditor 
          post={editingPost}
          onSave={handleSavePost}
          onClose={() => setIsEditorOpen(false)}
        />
      )}
    </div>
  );
}
