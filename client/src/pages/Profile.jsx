import React, { useState, useRef } from 'react';
import { User, Mail, Image as ImageIcon, Check, Camera, ShieldCheck, Upload, Trash2, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLock } from '../context/LockContext';
import { useToast } from '../context/ToastContext';
import { useTabRefresh } from '../context/RefreshContext';
import {
  PageHeader,
  Card,
  Button,
  Input,
  ProtectedAction,
} from '../components/common';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
];

export const Profile = () => {
  const { currentUser, updateProfile, uploadAvatarFile } = useAuth();
  const { canEdit, notifyLocked } = useLock();
  const { toast } = useToast();

  const [name, setName] = useState(currentUser?.name || 'Ayush Admin');
  const [email, setEmail] = useState(currentUser?.email || 'admin@example.com');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState(currentUser?.avatar || AVATAR_PRESETS[0]);
  const [customAvatarInput, setCustomAvatarInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Tab Refresh Hook
  useTabRefresh(() => {
    if (currentUser) {
      setName(currentUser.name || 'Ayush Admin');
      setEmail(currentUser.email || 'admin@example.com');
      setAvatar(currentUser.avatar || AVATAR_PRESETS[0]);
    }
  });

  const fileInputRef = useRef(null);

  // Handle local image file upload directly to backend server/uploads/
  const handleImageUpload = async (e) => {
    if (!canEdit) {
      notifyLocked('upload profile photo');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setIsUploading(true);
      const serverImageUrl = await uploadAvatarFile(file);
      setAvatar(serverImageUrl);
      setCustomAvatarInput('');
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleTriggerFileInput = () => {
    if (!canEdit) {
      notifyLocked('upload profile photo');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleResetAvatar = () => {
    setAvatar(AVATAR_PRESETS[0]);
    setCustomAvatarInput('');
    toast.info('Photo reset to default preset. Click Save Changes to apply.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = {
      name: name.trim() || currentUser.name,
      email: email.trim() || currentUser.email,
      avatar: customAvatarInput.trim() || avatar,
    };
    if (password.trim() && password.trim().length >= 6) {
      payload.password = password.trim();
    }
    await updateProfile(payload);
    setIsSubmitting(false);
    setPassword('');
  };

  const currentPreviewAvatar = customAvatarInput.trim() || avatar;
  const isCustomImage = currentPreviewAvatar.includes('/uploads/') || (customAvatarInput.trim().length > 0);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {/* Hidden File Input for Device Image Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      <PageHeader
        title="Admin Profile"
        subtitle="Manage your administrator credentials and server-stored profile photo"
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left Column: Avatar & Photo Actions */}
        <div className="md:col-span-4">
          <Card padding="normal" className="flex flex-col items-center text-center">
            {/* Avatar with click-to-upload */}
            <div
              onClick={handleTriggerFileInput}
              className="relative mb-3 group cursor-pointer"
              title="Click to upload new photo to server"
            >
              <img
                src={currentPreviewAvatar}
                alt="Profile Avatar"
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-4 ring-red-100 shadow-md transition-transform group-hover:scale-105"
                onError={(e) => {
                  e.target.src = AVATAR_PRESETS[0];
                }}
              />
              <div className="absolute inset-0 bg-black/45 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 p-2">
                <Camera className="w-5 h-5" />
                <span className="text-[10px] font-semibold">{isUploading ? 'Uploading...' : 'Upload Photo'}</span>
              </div>
            </div>

            <h3 className="text-base font-bold text-gray-900">{name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{email}</p>

            <div className="mt-3 pt-3 border-t border-gray-100 w-full flex items-center justify-center gap-1.5 text-xs text-green-700 bg-green-50 py-1.5 rounded-lg font-medium">
              <ShieldCheck className="w-4 h-4 text-green-600" />
              <span>Super Administrator</span>
            </div>

            {/* Direct Device Upload Button */}
            <div className="w-full mt-3 pt-3 border-t border-gray-100 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleTriggerFileInput}
                disabled={isUploading}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold bg-red-50 text-[#E53935] hover:bg-red-100 border border-red-200/80 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploading ? 'Uploading to server...' : 'Upload Photo from Device'}</span>
              </button>

              {isCustomImage && (
                <button
                  type="button"
                  onClick={handleResetAvatar}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-[11px] font-medium text-gray-600 hover:text-red-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  Reset to Default
                </button>
              )}
            </div>

            {/* Preset Photo Options */}
            <div className="w-full mt-3 pt-3 border-t border-gray-100 text-left">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                Or Select Preset Avatar
              </span>
              <div className="grid grid-cols-3 gap-2">
                {AVATAR_PRESETS.map((presetUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAvatar(presetUrl);
                      setCustomAvatarInput('');
                    }}
                    className={`relative rounded-full overflow-hidden p-0.5 ring-2 transition-all cursor-pointer mx-auto ${
                      avatar === presetUrl && !customAvatarInput
                        ? 'ring-[#E53935] scale-105 shadow-xs'
                        : 'ring-transparent hover:ring-gray-300'
                    }`}
                  >
                    <img src={presetUrl} alt={`Avatar ${idx}`} className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover" />
                    {avatar === presetUrl && !customAvatarInput && (
                      <div className="absolute inset-0 bg-[#E53935]/40 flex items-center justify-center text-white">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Edit Details Form */}
        <div className="md:col-span-8">
          <Card
            title="Edit Profile Information"
            subtitle="Update your administrator credentials and server-persisted profile data"
            padding="normal"
          >
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <Input
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                icon={User}
                required
              />

              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                icon={Mail}
                required
              />

              <Input
                label="New Password (Leave blank to keep current)"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                icon={KeyRound}
                helperText="Minimum 6 characters if you want to change your password"
              />

              <div className="space-y-1">
                <Input
                  label="Custom Photo URL (Optional)"
                  value={customAvatarInput}
                  onChange={(e) => setCustomAvatarInput(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  icon={ImageIcon}
                  helperText="Or upload directly from your device using the upload button on the left"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <ProtectedAction actionName="update profile details">
                  <Button
                    type="submit"
                    variant="primary"
                    loading={isSubmitting}
                  >
                    Save Changes
                  </Button>
                </ProtectedAction>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};
