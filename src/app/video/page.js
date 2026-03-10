'use client';

import ProtectedRoute from '../../components/ProtectedRoute';
import VideoChat from '../../components/VideoChat';

export default function VideoPage() {
  return (
    <ProtectedRoute>
      <VideoChat />
    </ProtectedRoute>
  );
}
