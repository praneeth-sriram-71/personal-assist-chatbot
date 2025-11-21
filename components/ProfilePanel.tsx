import React, { useState, useEffect } from 'react';
import { EditIcon } from './Icons';
import { ImageEditor } from './ImageEditor';
import { DEFAULT_PROFILE_IMAGE } from '../constants';

interface ProfilePanelProps {
  className?: string;
  onEditPersona?: () => void;
}

export const ProfilePanel: React.FC<ProfilePanelProps> = ({ className = '', onEditPersona }) => {
  const skills = ['AI', 'React', 'Node.js'];
  const email = 'praneethsriram699@gmail.com';
  const location = 'Coimbatore, Tamil Nadu';
  const [profileImage, setProfileImage] = useState<string>(() => {
    // Load from localStorage on mount, fallback to default image
    const stored = localStorage.getItem('profileImage');
    return stored || DEFAULT_PROFILE_IMAGE;
  });
  const [imageError, setImageError] = useState(false);
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);

  // Reset error state when profile image changes
  useEffect(() => {
    setImageError(false);
  }, [profileImage]);

  return (
    <aside className="w-full h-full flex">
      <div
        className={`relative flex flex-col gap-6 rounded-[32px] bg-gray-900 border border-orange-500/30 shadow-sm p-6 lg:p-8 w-full ${className}`}
      >
        {onEditPersona && (
          <button
            onClick={onEditPersona}
            className="absolute top-4 right-4 p-2 rounded-full border border-orange-500/30 bg-gray-800 text-orange-400 shadow-sm hover:bg-gray-700 transition"
            title="Edit persona"
            aria-label="Edit persona"
          >
            <EditIcon className="w-4 h-4" />
          </button>
        )}
        <div className="flex flex-col items-center gap-4">
          <div className="relative group">
            <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-orange-500 shadow-lg bg-gray-800 cursor-pointer transition-transform hover:scale-105">
              {!imageError ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-orange-500/40 to-orange-600/40 flex items-center justify-center">
                  <span className="text-4xl">🤖</span>
                </div>
              )}
            </div>
            <button
              onClick={() => setIsImageEditorOpen(true)}
              className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-orange-500 text-white shadow-lg flex items-center justify-center hover:bg-orange-600 transition-colors opacity-0 group-hover:opacity-100"
              title="Edit profile picture"
            >
              <EditIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-semibold text-white">Praneeth Sriram</h2>
            <p className="text-sm text-orange-300">AI Developer</p>
          </div>
        </div>

        <section>
          <p className="text-xs font-semibold text-orange-300 tracking-[0.35em]">SKILLS</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span
                key={skill}
                className="px-3 py-1 text-sm font-medium text-white bg-gray-800 rounded-full border border-orange-500/30"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="rounded-2xl border border-orange-500/30 bg-gray-800 p-4">
            <p className="text-xs font-semibold text-orange-300 tracking-[0.3em]">EMAIL</p>
            <p className="mt-1 text-sm font-medium text-white break-all">{email}</p>
          </div>
          <div className="rounded-2xl border border-orange-500/30 bg-gray-800 p-4">
            <p className="text-xs font-semibold text-orange-300 tracking-[0.3em]">LOCATION</p>
            <p className="mt-1 text-sm font-medium text-white">{location}</p>
          </div>
          <div className="rounded-2xl border border-orange-500/30 bg-gray-800 p-4">
            <p className="text-xs font-semibold text-orange-300 tracking-[0.3em]">LINKEDIN</p>
            <a 
              href="https://www.linkedin.com/in/praneeth-sriram-67b95025a/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-1 text-sm font-medium text-white hover:text-orange-400 transition-colors block"
            >
              LinkedIn : praneeth-sriram-67b95025a
            </a>
          </div>
          <div className="rounded-2xl border border-orange-500/30 bg-gray-800 p-4">
            <p className="text-xs font-semibold text-orange-300 tracking-[0.3em]">GITHUB</p>
            <a 
              href="https://github.com/praneeth-sriram-71" 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-1 text-sm font-medium text-white hover:text-orange-400 transition-colors block"
            >
              GitHub : praneeth-sriram-71
            </a>
          </div>
        </section>

        <div className="w-full pt-2 text-xs text-orange-300/70 text-center">
          Always exploring the intersection of human insight and AI craft.
        </div>
      </div>

      <ImageEditor
        isOpen={isImageEditorOpen}
        onClose={() => setIsImageEditorOpen(false)}
        onSave={(imageDataUrl) => {
          setProfileImage(imageDataUrl);
          setImageError(false);
          // Store in localStorage for persistence
          localStorage.setItem('profileImage', imageDataUrl);
          // Dispatch custom event to notify other components
          window.dispatchEvent(new CustomEvent('profileImageUpdated', { detail: imageDataUrl }));
        }}
        currentImage={profileImage}
      />
    </aside>
  );
};

export default ProfilePanel;

