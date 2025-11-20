import React, { useState, useEffect } from 'react';
import { EditIcon, FileIcon, VoiceIcon } from './Icons';
import { ImageEditor } from './ImageEditor';
import { DEFAULT_PROFILE_IMAGE } from '../constants';

interface ProfilePanelProps {
  className?: string;
  onEditPersona?: () => void;
}

const highlights = [
  { label: 'Experience', value: '4+ yrs' },
  { label: 'Latency', value: '120ms' },
  { label: 'Response', value: 'Realtime' },
];

export const ProfilePanel: React.FC<ProfilePanelProps> = ({ className = '', onEditPersona }) => {
  const skills = ['MERN Stack', 'Python', 'Java', 'JavaScript'];
  const email = 'praneethsriram699@gmail.com';
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
    <aside className="w-full h-full">
      <div
        className={`relative flex flex-col gap-8 rounded-3xl bg-gray-900/95 backdrop-blur-xl shadow-[0_20px_55px_rgba(255,140,0,0.15)] border border-orange-500/30 p-8 lg:p-10 ${className}`}
      >
        {onEditPersona && (
          <button
            onClick={onEditPersona}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 lg:top-6 lg:right-6 p-2 rounded-2xl border border-orange-500/30 bg-gray-800 text-orange-400 shadow-sm hover:shadow-md hover:bg-gray-700 transition-all"
            title="Edit persona"
            aria-label="Edit persona"
          >
            <EditIcon className="w-4 h-4" />
          </button>
        )}
        <div className="flex flex-col items-center gap-4">
          <div className="relative group">
            <div className="relative w-32 h-32 rounded-full overflow-hidden border-[6px] border-orange-500/50 shadow-[0_10px_25px_rgba(255,140,0,0.3)] cursor-pointer transition-transform hover:scale-105">
              {!imageError ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-orange-500/40 to-orange-600/40 flex items-center justify-center">
                  <span className="text-5xl">🤖</span>
                </div>
              )}
            </div>
            <button
              onClick={() => setIsImageEditorOpen(true)}
              className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-orange-500 text-white shadow-lg flex items-center justify-center hover:bg-orange-600 transition-colors opacity-0 group-hover:opacity-100"
              title="Edit profile picture"
            >
              <EditIcon className="w-5 h-5" />
            </button>
          </div>
          <p className="text-[13px] uppercase tracking-[0.35em] text-orange-500 font-semibold text-center">
            Profile
          </p>
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-3xl font-semibold text-white">Praneeth Sriram</h2>
          <p className="text-base text-gray-400">AI Developer</p>
        </div>

        <div className="w-full space-y-6">
          <section>
            <p className="text-xs uppercase tracking-[0.4em] text-gray-500 mb-4">
              Skills
            </p>
            <div className="flex flex-wrap gap-3">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="px-4 py-2 text-sm font-semibold text-orange-400 bg-gray-800 rounded-2xl border border-orange-500/30"
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>

          <section className="space-y-4 text-sm text-gray-300">
            <div>
              <p className="text-[11px] uppercase tracking-[0.45em] text-gray-500 mb-1">
                Email
              </p>
              <p className="font-medium text-orange-400">{email}</p>
            </div>
          </section>
        </div>

        <div className="w-full pt-4 border-t border-orange-500/20 text-[13px] text-gray-400 leading-relaxed">
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

