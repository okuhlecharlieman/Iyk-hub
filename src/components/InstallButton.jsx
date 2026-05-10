'use client';

import { useState, useEffect } from 'react';
import { FaDownload } from 'react-icons/fa';

const isIosBrowser = () => {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

const isStandaloneMode = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
};

const InstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    const ios = isIosBrowser();
    const standalone = isStandaloneMode();
    setIsIos(ios);

    if (!standalone && ios) {
      setIsInstallable(true);
    }

    if (standalone) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const trackDownload = async () => {
    try {
      await fetch('/api/downloads/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: isIos ? 'iOS' : 'web',
          userAgent: window.navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Download tracking failed:', error);
    }
  };

  const handleInstallClick = async () => {
    trackDownload();

    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        setDeferredPrompt(null);

        if (outcome === 'accepted') {
          console.log('User accepted the install prompt');
          setIsInstallable(false);
        } else {
          console.log('User dismissed the install prompt');
        }
      } catch (error) {
        console.error('Error during install prompt:', error);
      }
      return;
    }

    if (isIos) {
      window.alert(
        'To install Intwana Hub on iOS Safari, tap the Share button and choose "Add to Home Screen."'
      );
    }
  };

  if (!isInstallable) return null;

  return (
    <button
      onClick={handleInstallClick}
      className="group inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
      aria-label="Install Intwana Hub"
    >
      <FaDownload className="mr-2" />
      Download App
    </button>
  );
};

export default InstallButton;
