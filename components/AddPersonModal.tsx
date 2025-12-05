import React, { useState, useEffect, useRef } from 'react';
import { Gender, ModalContext, Person, Relationship } from '../types';
import { convertDisplayToStorage, convertStorageToDisplay } from '../utils/dateUtils';
import { getStoredSupabaseConfig, getSupabaseClient } from '../utils/supabaseClient';
import { 
    ImageIcon, DeleteIcon, CloseIcon, CheckIcon, CloudUploadIcon
} from './Icons';

interface AddPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    formData: Partial<{ firstName: string; lastName:string; gender: Gender; }>,
    details: Partial<{ 
      birthDate: string; 
      deathDate: string; 
      imageUrl: string; 
      contactInfo: { phone: string; email: string; address: string; }; 
      bio: string;
      cemeteryAddress: string;
    }>,
    relationship?: Relationship,
    existingPersonId?: string,
  ) => void;
  onDelete: (personId: string) => void;
  context: ModalContext | null;
  anchorPerson?: Person | null;
  anchorSpouse?: Person | null;
  personToEdit?: Person | null;
  anchorPersonExSpouses?: Person[];
}

const AddPersonModal: React.FC<AddPersonModalProps> = ({ isOpen, onClose, onSubmit, onDelete, context, anchorPerson, anchorSpouse, personToEdit, anchorPersonExSpouses }) => {
  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<Gender>(Gender.Male);
  const [birthDate, setBirthDate] = useState(''); // Stores display format
  const [deathDate, setDeathDate] = useState(''); // Stores display format
  const [imageUrl, setImageUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [bio, setBio] = useState('');
  const [cemeteryAddress, setCemeteryAddress] = useState('');
  
  // Modal state
  const [relationship, setRelationship] = useState<Relationship>('child');
  const [title, setTitle] = useState('');
  const [submitText, setSubmitText] = useState('');
  const [spouseMode, setSpouseMode] = useState<'new' | 'existing'>('new');
  const [selectedExSpouseId, setSelectedExSpouseId] = useState('');
  
  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [hasSupabaseConfig, setHasSupabaseConfig] = useState(false); // Supabase Config
  const [useCloudStorage, setUseCloudStorage] = useState(true);

  // Crop State
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [tempImgSrc, setTempImgSrc] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = context?.action === 'edit';

  // Check for API keys/Config on mount
  useEffect(() => {
      // Check Supabase
      const sbConfig = getStoredSupabaseConfig();
      if (sbConfig.url && sbConfig.key) {
          setHasSupabaseConfig(true);
          setUseCloudStorage(true);
      } else {
          setUseCloudStorage(false);
      }
  }, []);

  // Effect to initialize or reset the form
  useEffect(() => {
    if (!isOpen) return;

    const resetFields = () => {
      setFirstName('');
      setLastName('');
      setGender(Gender.Male);
      setBirthDate('');
      setDeathDate('');
      setImageUrl('');
      setPhone('');
      setEmail('');
      setAddress('');
      setBio('');
      setCemeteryAddress('');
      setRelationship('child');
      setSpouseMode('new');
      setSelectedExSpouseId('');
      setIsUploading(false);
      setCropModalOpen(false);
      setTempImgSrc(null);
    };

    if (isEditMode && personToEdit) {
      setTitle('პიროვნების რედაქტირება');
      setSubmitText('შენახვა');
      setFirstName(personToEdit.firstName);
      setLastName(personToEdit.lastName);
      setGender(personToEdit.gender);
      setBirthDate(convertStorageToDisplay(personToEdit.birthDate));
      setDeathDate(convertStorageToDisplay(personToEdit.deathDate));
      setImageUrl(personToEdit.imageUrl || '');
      setPhone(personToEdit.contactInfo?.phone || '');
      setEmail(personToEdit.contactInfo?.email || '');
      setAddress(personToEdit.contactInfo?.address || '');
      setBio(personToEdit.bio || '');
      setCemeteryAddress(personToEdit.cemeteryAddress || '');
    } else if (context?.action === 'add') {
      setTitle('ნათესავის დამატება');
      setSubmitText('დამატება');
      resetFields();
    }
  }, [isOpen, context, personToEdit, isEditMode]);

  // Effect for UI texts
  useEffect(() => {
    if (isOpen && context?.action === 'add' && anchorPerson) {
      const relationshipTranslations: Record<Relationship, string> = {
        child: 'შვილის',
        spouse: 'მეუღლის',
        parent: 'მშობლის',
        sibling: 'დის/ძმის'
      };
      const relText = relationshipTranslations[relationship] || '';
      const anchorFullName = `${anchorPerson.firstName} ${anchorPerson.lastName}`.trim();
      setTitle(`${relText} დამატება ${anchorFullName}-თვის`);

      if (relationship === 'spouse') {
          setGender(anchorPerson.gender === Gender.Male ? Gender.Female : Gender.Male);
          setSpouseMode('new');
          setSelectedExSpouseId('');
      }

      if (relationship === 'child') {
        const father = anchorPerson.gender === Gender.Male ? anchorPerson : anchorSpouse;
        if (father && father.lastName) {
          setLastName(father.lastName);
        } else {
          setLastName(''); 
        }
      } else {
         if(!isEditMode) {
           setLastName('');
        }
      }
    }
  }, [isOpen, context, anchorPerson, anchorSpouse, relationship, isEditMode]);

  const transliterate = (text: string) => {
    const map: Record<string, string> = {
      'ა': 'a', 'ბ': 'b', 'გ': 'g', 'დ': 'd', 'ე': 'e', 'ვ': 'v', 'ზ': 'z', 'თ': 't',
      'ი': 'i', 'კ': 'k', 'ლ': 'l', 'მ': 'm', 'ნ': 'n', 'ო': 'o', 'პ': 'p', 'ჟ': 'zh',
      'რ': 'r', 'ს': 's', 'ტ': 't', 'უ': 'u', 'ფ': 'p', 'ქ': 'k', 'ღ': 'gh', 'ყ': 'q',
      'შ': 'sh', 'ჩ': 'ch', 'ც': 'ts', 'ძ': 'dz', 'წ': 'ts', 'ჭ': 'ch', 'ხ': 'kh', 'ჯ': 'j', 'ჰ': 'h'
    };
    return text.split('').map(char => map[char] || char).join('');
  };

  const deleteImageFromStorage = async (url: string) => {
      if (!url || !hasSupabaseConfig) return;
      
      // Check if it's actually a Supabase URL
      const config = getStoredSupabaseConfig();
      if (!url.includes(config.url)) return; // Don't try to delete external images or base64

      try {
          const supabase = getSupabaseClient(config.url, config.key);
          
          // Extract filename from URL
          // Example: https://xyz.supabase.co/storage/v1/object/public/images/Name_Surname_123.jpg
          const parts = url.split('/');
          const fileName = parts[parts.length - 1];
          
          if (fileName) {
              const { error } = await supabase.storage.from('images').remove([fileName]);
              if (error) console.error("Error deleting old image:", error);
              else console.log("Old image deleted successfully:", fileName);
          }
      } catch (err) {
          console.error("Failed to delete image:", err);
      }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = () => {
              setTempImgSrc(reader.result as string);
              setCropZoom(1);
              setCropOffset({ x: 0, y: 0 });
              setCropModalOpen(true);
              if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
          };
          reader.readAsDataURL(file);
      }
  };

  const handleCropSave = async () => {
      if (!imgRef.current) return;
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set output size to 500x500 for consistency and storage saving
      const OUTPUT_SIZE = 500;
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      
      // Fill background (white for transparency if any)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      
      const CONTAINER_SIZE = 280;
      const ratio = OUTPUT_SIZE / CONTAINER_SIZE;

      // Move context to center
      ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
      ctx.scale(ratio, ratio); // Scale up to match output resolution
      ctx.translate(cropOffset.x, cropOffset.y);
      ctx.scale(cropZoom, cropZoom);
      
      // Draw image centered
      const img = imgRef.current;
      const aspect = img.naturalWidth / img.naturalHeight;
      let renderWidth, renderHeight;
      if (aspect > 1) {
          // Wider
          renderWidth = CONTAINER_SIZE;
          renderHeight = CONTAINER_SIZE / aspect;
      } else {
          // Taller
          renderHeight = CONTAINER_SIZE;
          renderWidth = CONTAINER_SIZE * aspect;
      }
      
      ctx.drawImage(img, -renderWidth / 2, -renderHeight / 2, renderWidth, renderHeight);

      // Convert to Blob (JPEG, 0.8 quality)
      canvas.toBlob((blob) => {
          if (blob) {
              uploadProcessedImage(blob);
          }
          setCropModalOpen(false);
          setTempImgSrc(null);
      }, 'image/jpeg', 0.8);
  };

  const uploadProcessedImage = async (blob: Blob) => {
      // Determine upload method
      // Priority 1: Supabase (if configured and enabled)
      // Priority 2: Local Base64 (fallback)

      if (useCloudStorage && hasSupabaseConfig) {
         setIsUploading(true);

         // --- METHOD 1: SUPABASE ---
         try {
             // 1. If we are editing and replacing an existing image, DELETE the old one first.
             // We do this check before upload.
             if (isEditMode && personToEdit?.imageUrl) {
                 await deleteImageFromStorage(personToEdit.imageUrl);
             }

             const config = getStoredSupabaseConfig();
             const supabase = getSupabaseClient(config.url, config.key);
             
             // 2. Generate Naming: LatinName_LatinSurname_Timestamp.jpg
             const latinFirst = transliterate(firstName || 'Name').replace(/[^a-zA-Z0-9]/g, '');
             const latinLast = transliterate(lastName || 'Surname').replace(/[^a-zA-Z0-9]/g, '');
             const timestamp = Date.now();
             const fileName = `${latinFirst}_${latinLast}_${timestamp}.jpg`;

             const { error: uploadError } = await supabase.storage
                .from('images')
                .upload(fileName, blob, {
                    contentType: 'image/jpeg',
                    upsert: false
                });

             if (uploadError) throw uploadError;

             const { data } = supabase.storage
                .from('images')
                .getPublicUrl(fileName);
             
             setImageUrl(data.publicUrl);
             setIsUploading(false);
             return; // Exit after successful Supabase upload

         } catch (err: any) {
             console.error("Supabase Upload Failed:", err);
             alert(`Supabase-ზე ატვირთვა ვერ მოხერხდა: ${err.message}. ვცდით ლოკალურ შენახვას.`);
             // Fallthrough to Local Base64 if Supabase fails
         }
      }

      // --- METHOD 2: LOCAL BASE64 (Fallback) ---
      const reader = new FileReader();
      reader.onloadend = () => {
          setImageUrl(reader.result as string);
          setIsUploading(false);
      };
      reader.readAsDataURL(blob);
  };

  const handleManualImageDelete = async () => {
      if (imageUrl && hasSupabaseConfig) {
          setIsUploading(true); // show loading during delete
          await deleteImageFromStorage(imageUrl);
          setIsUploading(false);
      }
      setImageUrl('');
  };
  
  const handleDateBlur = (e: React.FocusEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
        let value = e.target.value.trim();
        if (!value) {
            setter('');
            return;
        }
        let cleanedValue = value.replace(/[-/\\_]/g, '.').replace(/[^0-9.]/g, '');
        const parts = cleanedValue.split('.').filter(Boolean);

        if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            if (year.length === 4) {
                 setter(`${day}.${month}.${year}`);
            } else {
                setter(cleanedValue);
            }
        } else if (parts.length === 1 && parts[0].length === 8) {
            const day = parts[0].slice(0, 2);
            const month = parts[0].slice(2, 4);
            const year = parts[0].slice(4, 8);
            setter(`${day}.${month}.${year}`);
        } else if (parts.length === 1 && /^\d{4}$/.test(parts[0])) {
            setter(parts[0]);
        } else {
            setter(cleanedValue);
        }
    };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const detailsToSubmit = {
        birthDate: convertDisplayToStorage(birthDate),
        deathDate: convertDisplayToStorage(deathDate),
        imageUrl,
        contactInfo: { phone, email, address },
        bio,
        cemeteryAddress,
    };

    if (isEditMode) {
        if (firstName.trim() || lastName.trim()) {
            onSubmit({ firstName, lastName, gender }, detailsToSubmit);
        }
    } else { // Add mode
        if (relationship === 'spouse' && spouseMode === 'existing') {
            if (selectedExSpouseId) {
                onSubmit({}, {}, relationship, selectedExSpouseId);
            }
        } else {
             if (firstName.trim() || lastName.trim()) {
                onSubmit({ firstName, lastName, gender }, detailsToSubmit, relationship);
            }
        }
    }
  };
  
  const handleDeletePerson = async () => {
    if(isEditMode && personToEdit){
      // If person has an image in Supabase, delete it first
      if (personToEdit.imageUrl && hasSupabaseConfig) {
          await deleteImageFromStorage(personToEdit.imageUrl);
      }
      onDelete(personToEdit.id);
    }
  }

  // Crop Handlers
  const onMouseDown = (e: React.MouseEvent) => {
      setIsDraggingCrop(true);
      setDragStart({ x: e.clientX - cropOffset.x, y: e.clientY - cropOffset.y });
  };
  const onMouseMove = (e: React.MouseEvent) => {
      if (!isDraggingCrop) return;
      setCropOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const onMouseUp = () => setIsDraggingCrop(false);
  
  // Touch handlers for mobile cropping
  const onTouchStart = (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
          setIsDraggingCrop(true);
          setDragStart({ x: e.touches[0].clientX - cropOffset.x, y: e.touches[0].clientY - cropOffset.y });
      }
  };
  const onTouchMove = (e: React.TouchEvent) => {
      if (isDraggingCrop && e.touches.length === 1) {
          setCropOffset({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
      }
  };


  if (!isOpen || !context) return null;

  const showGenderSelector = isEditMode || relationship !== 'spouse';
  const showFullForm = !(!isEditMode && relationship === 'spouse' && spouseMode === 'existing');

  const inputStyles = "w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white";
  const selectStyles = `${inputStyles} appearance-none`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 transition-opacity p-4" onClick={onClose}>
      
      {/* CROP MODAL OVERLAY */}
      {cropModalOpen && tempImgSrc && (
          <div 
            className="absolute inset-0 z-[60] bg-black bg-opacity-90 flex flex-col justify-center items-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
              <h3 className="text-white text-lg font-bold mb-4">სურათის მორგება</h3>
              
              {/* Crop Container */}
              <div 
                className="relative overflow-hidden bg-gray-900 border-2 border-white shadow-2xl" 
                style={{ width: '280px', height: '280px', cursor: isDraggingCrop ? 'grabbing' : 'grab' }}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onMouseUp}
              >
                  {/* Image Display */}
                  <div className="w-full h-full flex items-center justify-center pointer-events-none">
                     <img 
                        ref={imgRef}
                        src={tempImgSrc} 
                        alt="Crop Preview" 
                        style={{ 
                            maxWidth: '100%', 
                            maxHeight: '100%',
                            transform: `translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${cropZoom})`,
                            transition: isDraggingCrop ? 'none' : 'transform 0.1s'
                        }}
                     />
                  </div>
                  
                  {/* Grid Overlay */}
                  <div className="absolute inset-0 pointer-events-none border border-white/30 grid grid-cols-3 grid-rows-3">
                      <div className="border-r border-b border-white/20"></div><div className="border-r border-b border-white/20"></div><div className="border-b border-white/20"></div>
                      <div className="border-r border-b border-white/20"></div><div className="border-r border-b border-white/20"></div><div className="border-b border-white/20"></div>
                      <div className="border-r border-white/20"></div><div className="border-r border-white/20"></div><div></div>
                  </div>
              </div>

              {/* Controls */}
              <div className="mt-6 w-full max-w-xs space-y-4">
                  <div>
                      <label className="text-white text-xs mb-1 block">გადიდება: {cropZoom.toFixed(1)}x</label>
                      <input 
                        type="range" 
                        min="0.5" 
                        max="3" 
                        step="0.1" 
                        value={cropZoom} 
                        onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      />
                  </div>
                  <div className="flex gap-4">
                      <button onClick={() => setCropModalOpen(false)} className="flex-1 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors">გაუქმება</button>
                      <button onClick={handleCropSave} className="flex-1 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors font-semibold">შენახვა</button>
                  </div>
              </div>
          </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg border border-gray-300 dark:border-gray-700 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-600">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">

          {!isEditMode && anchorPerson && (
             <div>
                <label htmlFor="relationship" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">ურთიერთობა</label>
                <select id="relationship" value={relationship} onChange={e => setRelationship(e.target.value as Relationship)} className={selectStyles}>
                    <option value="child">შვილი</option>
                    <option value="spouse">მეუღლე</option>
                    <option value="parent" disabled={anchorPerson.parentIds.length >= 2}>მშობელი</option>
                    <option value="sibling" disabled={anchorPerson.parentIds.length === 0}>და/ძმა</option>
                </select>
                {relationship === 'sibling' && anchorPerson.parentIds.length === 0 && <p className="text-xs text-yellow-500 dark:text-yellow-400 mt-1">არ შეგიძლიათ დაამატოთ და/ძმა პიროვნებას, რომელსაც ხეში მშობლები განსაზღვრული არ აქვს.</p>}
                {relationship === 'parent' && anchorPerson.parentIds.length >= 2 && <p className="text-xs text-yellow-500 dark:text-yellow-400 mt-1">ამ პიროვნებას უკვე ჰყავს ორი მშობელი.</p>}
             </div>
          )}
          
          {!isEditMode && relationship === 'spouse' && anchorPersonExSpouses && anchorPersonExSpouses.length > 0 && (
             <div className="p-3 rounded-md border border-gray-300 dark:border-gray-700">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">მეუღლის დამატების მეთოდი</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="spouseMode" value="new" checked={spouseMode === 'new'} onChange={() => setSpouseMode('new')} className="form-radio text-purple-500 bg-gray-200 dark:bg-gray-700 border-gray-400 dark:border-gray-600 focus:ring-purple-500" />
                    <span>ახალი პიროვნება</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="spouseMode" value="existing" checked={spouseMode === 'existing'} onChange={() => setSpouseMode('existing')} className="form-radio text-purple-500 bg-gray-200 dark:bg-gray-700 border-gray-400 dark:border-gray-600 focus:ring-purple-500" />
                    <span>არსებულის არჩევა</span>
                  </label>
                </div>
                 {spouseMode === 'existing' && (
                    <div className="mt-3">
                        <label htmlFor="exSpouseSelect" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">აირჩიეთ ყოფილი მეუღლე</label>
                        <select id="exSpouseSelect" value={selectedExSpouseId} onChange={e => setSelectedExSpouseId(e.target.value)} className={selectStyles} required>
                            <option value="" disabled>აირჩიეთ...</option>
                            {anchorPersonExSpouses.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
                        </select>
                    </div>
                )}
             </div>
          )}

        {showFullForm && (
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">სახელი</label>
                    <input type="text" id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputStyles} placeholder="შეიყვანეთ სახელი" required autoFocus />
                    </div>
                    <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">გვარი</label>
                    <input type="text" id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputStyles} placeholder="შეიყვანეთ გვარი" />
                    </div>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">პროფილის სურათი</label>
                    <div className="mt-2 flex items-center gap-4">
                        {imageUrl ? (
                        <div className="relative">
                            <img src={imageUrl} alt="პროფილი" className="w-16 h-16 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600" />
                            {isUploading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                </div>
                            )}
                        </div>
                        ) : (
                        <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-2 border-gray-300 dark:border-gray-600 relative">
                            {isUploading ? (
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                            ) : (
                                <ImageIcon className="w-8 h-8 text-gray-400 dark:text-gray-500"/>
                            )}
                        </div>
                        )}
                        <input
                        type="file"
                        id="imageUpload"
                        accept="image/png, image/jpeg, image/gif"
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={isUploading}
                        ref={fileInputRef}
                        />
                        <label htmlFor="imageUpload" className={`cursor-pointer px-3 py-2 rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-sm font-medium text-gray-800 dark:text-gray-100 flex items-center gap-2 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            {isUploading ? (
                                <span>იტვირთება...</span>
                            ) : (
                                <>
                                    <CloudUploadIcon className="w-4 h-4" />
                                    <span>სურათის არჩევა</span>
                                </>
                            )}
                        </label>
                        {imageUrl && !isUploading && (
                        <button type="button" onClick={handleManualImageDelete} className="text-xs text-red-500 dark:text-red-400 hover:underline">
                            წაშლა
                        </button>
                        )}
                    </div>
                    
                    {/* Storage Status */}
                    <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700/30 rounded border border-gray-200 dark:border-gray-700">
                        {hasSupabaseConfig ? (
                            <div className="flex items-center gap-2 mb-1">
                                <input 
                                    type="checkbox" 
                                    id="cloudToggle" 
                                    checked={useCloudStorage} 
                                    onChange={(e) => setUseCloudStorage(e.target.checked)}
                                    className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                />
                                <label htmlFor="cloudToggle" className="text-xs font-medium text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                                    სურათის სერვერზე ატვირთვა
                                </label>
                            </div>
                        ) : null}

                        <p className={`text-xs ${hasSupabaseConfig && useCloudStorage ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                            {hasSupabaseConfig 
                                ? (useCloudStorage 
                                    ? "✅ Supabase Storage აქტიურია. უსაფრთხო ატვირთვა." 
                                    : "ℹ️ ატვირთვა გამორთულია. სურათი შეინახება ფაილში (ლოკალურად).")
                                : "⚠️ სერვერი ვერ მოიძებნა. სურათი შეინახება ფაილში (გაზრდის ზომას)."}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="birthDate" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">დაბადების თარიღი</label>
                        <input type="text" id="birthDate" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} onBlur={(e) => handleDateBlur(e, setBirthDate)} className={inputStyles} placeholder="DD.MM.YYYY ან YYYY"/>
                    </div>
                    <div>
                        <label htmlFor="deathDate" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">გარდაცვალების თარიღი</label>
                        <input type="text" id="deathDate" value={deathDate} onChange={(e) => setDeathDate(e.target.value)} onBlur={(e) => handleDateBlur(e, setDeathDate)} className={inputStyles} placeholder="DD.MM.YYYY ან YYYY"/>
                    </div>
                </div>

                {convertDisplayToStorage(deathDate) && (
                  <div>
                    <label htmlFor="cemeteryAddress" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">სასაფლაოს მისამართი</label>
                    <input type="text" id="cemeteryAddress" value={cemeteryAddress} onChange={(e) => setCemeteryAddress(e.target.value)} className={inputStyles} placeholder="მისამართი ან Google Maps-ის ბმული"/>
                  </div>
                )}
                
                <div className="space-y-4 rounded-md border border-gray-300 dark:border-gray-700 p-3">
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">საკონტაქტო ინფორმაცია</h3>
                    <div>
                        <label htmlFor="phone" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">ტელეფონი</label>
                        <input type="tel" id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="ტელეფონის ნომერი" className={inputStyles}/>
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">ელ. ფოსტა</label>
                        <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ელექტრონული ფოსტა" className={inputStyles}/>
                    </div>
                    <div>
                        <label htmlFor="address" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">მისამართი</label>
                        <input type="text" id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="საცხოვრებელი მისამართი" className={inputStyles}/>
                    </div>
                </div>
                
                <div>
                    <label htmlFor="bio" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">ბიოგრაფია</label>
                    <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="მოკლე ბიოგრაფია..." className={inputStyles}></textarea>
                </div>

                {showGenderSelector && (
                    <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">სქესი</label>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="gender" value={Gender.Male} checked={gender === Gender.Male} onChange={() => setGender(Gender.Male)} className="form-radio text-blue-500 bg-gray-200 dark:bg-gray-700 border-gray-400 dark:border-gray-600 focus:ring-blue-500" />
                        <span className="text-blue-600 dark:text-blue-400">მამრობითი</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="gender" value={Gender.Female} checked={gender === Gender.Female} onChange={() => setGender(Gender.Female)} className="form-radio text-pink-500 bg-gray-200 dark:bg-gray-700 border-gray-400 dark:border-gray-600 focus:ring-pink-500" />
                        <span className="text-pink-600 dark:text-pink-400">მდედრობითი</span>
                        </label>
                    </div>
                    </div>
                )}
            </div>
        )}

          <div className="flex justify-between items-center pt-2">
            <div>
              {isEditMode && personToEdit?.id !== 'root' && (
                <button
                  type="button"
                  onClick={handleDeletePerson}
                  className="h-10 px-3 sm:px-4 rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center gap-2"
                  title="წაშლა"
                >
                  <DeleteIcon className="w-5 h-5" />
                  <span className="hidden sm:inline">წაშლა</span>
                </button>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={onClose} className="h-10 px-3 sm:px-4 rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 transition-colors flex items-center gap-2" title="გაუქმება">
                <CloseIcon className="w-5 h-5" />
                <span className="hidden sm:inline">გაუქმება</span>
              </button>
              <button type="submit" disabled={isUploading} className="h-10 px-3 sm:px-4 rounded-md bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 dark:disabled:bg-purple-800 disabled:cursor-not-allowed text-white transition-colors flex items-center gap-2" title={submitText}>
                <CheckIcon className="w-5 h-5" />
                <span className="hidden sm:inline">{submitText}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPersonModal;