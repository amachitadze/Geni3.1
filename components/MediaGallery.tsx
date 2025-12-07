import React, { useState, useRef } from 'react';
import { CloudUploadIcon, DeleteIcon, CloseIcon, PhotoIcon } from './Icons';
import { getStoredSupabaseConfig, getSupabaseClient } from '../utils/supabaseClient';
import { translations, Language } from '../utils/translations';

interface MediaGalleryProps {
    personId: string;
    gallery: string[];
    onUpdate: (newGallery: string[]) => void;
    readOnly: boolean;
    language: Language;
}

const MediaGallery: React.FC<MediaGalleryProps> = ({ personId, gallery, onUpdate, readOnly, language }) => {
    const t = translations[language];
    const [isUploading, setIsUploading] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        const newImages: string[] = [];
        const config = getStoredSupabaseConfig();
        const hasSupabase = !!(config.url && config.key);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // Compression Logic (Canvas)
            try {
                const blob = await compressImage(file);
                
                if (hasSupabase) {
                    const supabase = getSupabaseClient(config.url, config.key);
                    const fileName = `gallery/${personId}_${Date.now()}_${i}.jpg`;
                    const { error } = await supabase.storage
                        .from('images')
                        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false });
                    
                    if (!error) {
                        const { data } = supabase.storage.from('images').getPublicUrl(fileName);
                        newImages.push(data.publicUrl);
                    } else {
                        console.error("Supabase upload failed, falling back to local", error);
                        newImages.push(await blobToBase64(blob));
                    }
                } else {
                    newImages.push(await blobToBase64(blob));
                }
            } catch (err) {
                console.error("Image processing error", err);
            }
        }

        if (newImages.length > 0) {
            onUpdate([...gallery, ...newImages]);
        }
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDelete = async (index: number) => {
        if (!window.confirm(t.gal_delete_confirm)) return;
        
        const imageUrl = gallery[index];
        const config = getStoredSupabaseConfig();
        
        // Try to delete from Supabase if it looks like a supabase URL
        if (config.url && config.key && imageUrl.includes(config.url)) {
            try {
                const supabase = getSupabaseClient(config.url, config.key);
                const parts = imageUrl.split('/');
                // Assuming path structure .../images/gallery/filename.jpg
                // We need 'gallery/filename.jpg'
                const fileNameIndex = parts.indexOf('gallery');
                if (fileNameIndex !== -1) {
                    const path = parts.slice(fileNameIndex).join('/');
                    await supabase.storage.from('images').remove([path]);
                }
            } catch (e) {
                console.error("Failed to delete remote image", e);
            }
        }

        const newGallery = gallery.filter((_, i) => i !== index);
        onUpdate(newGallery);
        if (lightboxIndex === index) setLightboxIndex(null);
    };

    // --- Helpers ---

    const compressImage = (file: File): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1200; // Better quality for gallery
                    let width = img.width;
                    let height = img.height;

                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return reject(new Error("Canvas context failed"));
                    
                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error("Blob creation failed"));
                    }, 'image/jpeg', 0.85);
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        });
    };

    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    };

    return (
        <div className="mt-4">
            {/* Header / Upload */}
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <PhotoIcon className="w-5 h-5"/>
                    {t.tab_gallery}
                </h3>
                {!readOnly && (
                    <div>
                        <input 
                            type="file" 
                            multiple 
                            accept="image/*" 
                            ref={fileInputRef} 
                            onChange={handleUpload} 
                            className="hidden" 
                            id="gallery-upload" 
                            disabled={isUploading}
                        />
                        <label 
                            htmlFor="gallery-upload"
                            className={`cursor-pointer px-3 py-1.5 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium flex items-center gap-2 hover:bg-purple-200 transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                            {isUploading ? (
                                <span className="animate-pulse">{t.loading}</span>
                            ) : (
                                <>
                                    <CloudUploadIcon className="w-4 h-4"/>
                                    {t.gal_add}
                                </>
                            )}
                        </label>
                    </div>
                )}
            </div>

            {/* Grid */}
            {gallery.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{t.gal_no_photos}</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {gallery.map((src, idx) => (
                        <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer border border-gray-200 dark:border-gray-700 shadow-sm">
                            <img 
                                src={src} 
                                alt={`Gallery ${idx}`} 
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                onClick={() => setLightboxIndex(idx)}
                            />
                            {!readOnly && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDelete(idx); }}
                                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
                                >
                                    <DeleteIcon className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Lightbox */}
            {lightboxIndex !== null && (
                <div 
                    className="fixed inset-0 z-[100] bg-black bg-opacity-95 flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => setLightboxIndex(null)}
                >
                    <button 
                        className="absolute top-4 right-4 p-2 text-white hover:text-gray-300"
                        onClick={() => setLightboxIndex(null)}
                    >
                        <CloseIcon className="w-8 h-8"/>
                    </button>
                    
                    <img 
                        src={gallery[lightboxIndex]} 
                        alt="Fullscreen" 
                        className="max-w-full max-h-full rounded shadow-2xl"
                        onClick={(e) => e.stopPropagation()} 
                    />
                    
                    {gallery.length > 1 && (
                        <>
                            <button 
                                className="absolute left-4 top-1/2 -translate-y-1/2 p-4 text-white hover:bg-white/10 rounded-full transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setLightboxIndex((prev) => prev !== null ? (prev - 1 + gallery.length) % gallery.length : 0);
                                }}
                            >
                                &#10094;
                            </button>
                            <button 
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-4 text-white hover:bg-white/10 rounded-full transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setLightboxIndex((prev) => prev !== null ? (prev + 1) % gallery.length : 0);
                                }}
                            >
                                &#10095;
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default MediaGallery;