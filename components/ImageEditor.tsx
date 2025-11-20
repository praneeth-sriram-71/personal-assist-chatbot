import React, { useState, useRef, useEffect } from 'react';
import { CheckIcon, XIcon } from './Icons';

interface ImageEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (imageDataUrl: string) => void;
  currentImage?: string;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({ isOpen, onClose, onSave, currentImage }) => {
  const [imageSrc, setImageSrc] = useState<string>(currentImage || '');
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isZooming, setIsZooming] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentImage) {
      setImageSrc(currentImage);
    } else {
      setImageSrc('');
    }
  }, [currentImage]);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen && !currentImage) {
      setImageSrc('');
      setScale(1);
      setPosition({ x: 0, y: 0 });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen, currentImage]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    // Check file extension as fallback (some browsers may not set MIME type correctly)
    const fileName = file.name.toLowerCase();
    const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
    
    // Check file type
    if (!file.type.startsWith('image/') && !hasValidExtension) {
      alert('Please select an image file (PNG, JPG, GIF, etc.)');
      return;
    }
    
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }
    
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setImageSrc(result);
          // Calculate initial scale and position to fit the image properly in the circular area
          const img = new Image();
          img.onload = () => {
            if (containerRef.current) {
              const containerSize = containerRef.current.offsetWidth;
              const imgAspect = img.width / img.height;
              const containerAspect = 1; // Square container
              
              // Calculate scale to fit the image within the container (contain, not cover)
              // This ensures the full image is visible and not too zoomed in
              let initialScale = 1;
              if (imgAspect > containerAspect) {
                // Image is wider - scale based on width to fit
                initialScale = (containerSize * 0.9) / img.width; // 0.9 to add some padding
              } else {
                // Image is taller - scale based on height to fit
                initialScale = (containerSize * 0.9) / img.height; // 0.9 to add some padding
              }
              
              // Ensure minimum scale so image is visible
              initialScale = Math.max(initialScale, 0.5);
              // Cap maximum initial scale to prevent over-zooming
              initialScale = Math.min(initialScale, 1.5);
              
              setScale(initialScale);
              setPosition({ x: 0, y: 0 });
            } else {
              setScale(1);
              setPosition({ x: 0, y: 0 });
            }
          };
          img.src = result;
        } else {
          alert('Error reading file. Please try again.');
        }
      };
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      alert('Error reading file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Reset to allow selecting same file again
      fileInputRef.current.click();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (!file) {
      return;
    }

    // Check file extension as fallback
    const fileName = file.name.toLowerCase();
    const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!file.type.startsWith('image/') && !hasValidExtension) {
      alert('Please drop an image file (PNG, JPG, GIF, etc.)');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setImageSrc(result);
        // Calculate initial scale and position to fit the image properly in the circular area
        const img = new Image();
        img.onload = () => {
          if (containerRef.current) {
            const containerSize = containerRef.current.offsetWidth;
            const imgAspect = img.width / img.height;
            const containerAspect = 1; // Square container
            
            // Calculate scale to fit the image within the container (contain, not cover)
            // This ensures the full image is visible and not too zoomed in
            let initialScale = 1;
            if (imgAspect > containerAspect) {
              // Image is wider - scale based on width to fit
              initialScale = (containerSize * 0.9) / img.width; // 0.9 to add some padding
            } else {
              // Image is taller - scale based on height to fit
              initialScale = (containerSize * 0.9) / img.height; // 0.9 to add some padding
            }
            
            // Ensure minimum scale so image is visible
            initialScale = Math.max(initialScale, 0.5);
            // Cap maximum initial scale to prevent over-zooming
            initialScale = Math.min(initialScale, 1.5);
            
            setScale(initialScale);
            setPosition({ x: 0, y: 0 });
          } else {
            setScale(1);
            setPosition({ x: 0, y: 0 });
          }
        };
        img.src = result;
      } else {
        alert('Error reading file. Please try again.');
      }
    };
    reader.onerror = () => {
      alert('Error reading file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageSrc) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && imageSrc) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!imageSrc) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((prev) => Math.max(0.5, Math.min(3, prev + delta)));
  };

  const handleSave = () => {
    if (!imageSrc || !imageRef.current || !containerRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 256; // Output size
    canvas.width = size;
    canvas.height = size;

    const img = new Image();
    img.onload = () => {
      const containerRect = containerRef.current!.getBoundingClientRect();
      const containerSize = containerRect.width;
      const imageRect = imageRef.current!.getBoundingClientRect();
      
      // Get the displayed image dimensions
      const displayedWidth = imageRect.width;
      const displayedHeight = imageRect.height;
      
      // Calculate scale factors
      const scaleX = img.width / displayedWidth;
      const scaleY = img.height / displayedHeight;
      
      // Container center (where the circular crop is)
      const containerCenterX = containerSize / 2;
      const containerCenterY = containerSize / 2;
      
      // Image position in container (accounting for centering and transform)
      const imageCenterX = containerCenterX + position.x;
      const imageCenterY = containerCenterY + position.y;
      
      // Calculate what part of the image is at the container center
      const imageOffsetX = (imageCenterX - containerCenterX) * scaleX;
      const imageOffsetY = (imageCenterY - containerCenterY) * scaleY;
      
      // The center point in the original image
      const sourceCenterX = img.width / 2 + imageOffsetX;
      const sourceCenterY = img.height / 2 + imageOffsetY;
      
      // Crop radius in image coordinates
      const cropRadius = (containerSize / 2) * Math.min(scaleX, scaleY);
      const cropSize = cropRadius * 2;
      
      // Calculate source coordinates
      const sourceX = Math.max(0, Math.min(img.width - cropSize, sourceCenterX - cropRadius));
      const sourceY = Math.max(0, Math.min(img.height - cropSize, sourceCenterY - cropRadius));
      const finalCropSize = Math.min(cropSize, img.width - sourceX, img.height - sourceY);

      // Draw the cropped circular image
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.clip();
      
      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        finalCropSize,
        finalCropSize,
        0,
        0,
        size,
        size
      );
      
      ctx.restore();

      const dataUrl = canvas.toDataURL('image/png');
      onSave(dataUrl);
      onClose();
    };
    img.src = imageSrc;
  };

  const handleReset = () => {
    // Reset to a reasonable default scale based on image dimensions
    if (imageSrc && containerRef.current) {
      const img = new Image();
      img.onload = () => {
        if (containerRef.current) {
          const containerSize = containerRef.current.offsetWidth;
          const imgAspect = img.width / img.height;
          const containerAspect = 1;
          
          let resetScale = 1;
          if (imgAspect > containerAspect) {
            resetScale = (containerSize * 0.9) / img.width;
          } else {
            resetScale = (containerSize * 0.9) / img.height;
          }
          
          resetScale = Math.max(0.5, Math.min(resetScale, 1.5));
          setScale(resetScale);
        } else {
          setScale(1);
        }
        setPosition({ x: 0, y: 0 });
      };
      img.src = imageSrc;
    } else {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl mx-4 p-6 border border-orange-500/30">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-white">Edit Profile Picture</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <XIcon className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          {!imageSrc ? (
            <label
              htmlFor="image-upload"
              className="border-2 border-dashed border-orange-500/30 rounded-2xl p-12 text-center hover:border-orange-500 hover:bg-orange-500/10 transition-colors cursor-pointer block"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/bmp,.png,.jpg,.jpeg,.gif,.webp,.bmp"
                onChange={handleFileSelect}
                className="hidden"
                id="image-upload"
                multiple={false}
              />
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                       <p className="text-sm font-medium text-white">Click to upload image</p>
                       <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF up to 10MB</p>
                       <p className="text-xs text-gray-500 mt-1">or drag and drop</p>
                </div>
              </div>
            </label>
          ) : (
            <>
              <div
                ref={containerRef}
                className="relative w-full h-96 bg-gray-800 rounded-2xl overflow-hidden border-2 border-orange-500/30 cursor-move"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
              >
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="Profile"
                  className="absolute select-none"
                  style={{
                    transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${scale})`,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    pointerEvents: 'none',
                    top: '50%',
                    left: '50%',
                    transformOrigin: 'center center',
                  }}
                  draggable={false}
                />
                <div className="absolute inset-0 border-4 border-dashed border-orange-500 rounded-full pointer-events-none" />
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Zoom: {Math.round(scale * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/bmp,.png,.jpg,.jpeg,.gif,.webp,.bmp"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="image-change-upload"
                />

                <div className="flex gap-3">
                  <button
                    onClick={handleReset}
                    className="flex-1 px-4 py-2 border border-orange-500/30 rounded-lg text-white hover:bg-gray-800 transition-colors font-medium"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.value = ''; // Reset input to allow selecting same file again
                        fileInputRef.current.click();
                      }
                    }}
                    className="flex-1 px-4 py-2 border border-orange-500/30 rounded-lg text-white hover:bg-gray-800 transition-colors font-medium"
                  >
                    Change Image
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <CheckIcon className="w-4 h-4" />
                    Save
                  </button>
                </div>

                <p className="text-xs text-gray-400 text-center">
                  Drag the image to align • Scroll to zoom • The circular area will be used as your profile picture
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

