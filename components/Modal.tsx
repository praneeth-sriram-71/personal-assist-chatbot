import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-orange-500/30 rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200" style={{ boxShadow: '0 24px 60px rgba(251, 146, 60, 0.25)' }}>
        <div className="flex justify-between items-center p-5 border-b border-orange-500/20">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button 
            onClick={onClose}
            className="text-orange-400 hover:text-orange-500 transition-colors w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-800"
          >
            ✕
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};
