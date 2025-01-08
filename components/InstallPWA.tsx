"use client";

import { useState, useEffect } from "react";

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check if iOS
    setIsIOS(
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    );

    // Handle install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setIsInstalled(true);
    }
  };

  if (isInstalled) return null;

  return (
    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-8">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-blue-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-blue-800">Install Our App</h3>
          <div className="mt-2 text-sm text-blue-700">
            {isIOS ? (
              <div>
                <p className="mb-2">To install this app on your iOS device:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>
                    Tap the Share button{" "}
                    <span className="inline-block">
                      <svg
                        className="w-5 h-5 inline"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                      </svg>
                    </span>
                  </li>
                  <li>
                    Scroll down and tap &quot;Add to Home Screen&quot;
                    <span className="inline-block">
                      <svg
                        className="w-5 h-5 inline"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  </li>
                  <li>Tap &quot;Add&quot; to install</li>
                </ol>
              </div>
            ) : deferredPrompt ? (
              <div>
                <p className="mb-2">Install our app for the best experience:</p>
                <button
                  onClick={handleInstallClick}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Install App
                </button>
              </div>
            ) : (
              <p>
                You can install this app from your browser&quot;s menu for quick
                access.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
