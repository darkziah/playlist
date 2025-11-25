import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { View, Image, Platform } from 'react-native';

import { useWizard } from '@/app/wizard/_layout';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { authClient } from '@/lib/auth-client';
import { savePlayerIdentityProfile, uploadPlayerProfilePhoto } from '@/lib/playerProfile';

export default function Step2ProfilePhoto() {
  const router = useRouter();
  const { data, updateData } = useWizard();
  const [preview, setPreview] = useState<string | null>(data.profilePhotoUrl);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    // Create preview using FileReader
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadClick = () => {
    if (Platform.OS === 'web' && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleNext = async () => {
    const { data: session } = await authClient.getSession();
    const userId = session?.user.id;

    if (!userId) {
      router.replace('/');
      return;
    }

    setUploading(true);

    try {
      let photoUrl = data.profilePhotoUrl;

      if (selectedFile) {
        photoUrl = await uploadPlayerProfilePhoto(userId, selectedFile);
        updateData({ profilePhotoUrl: photoUrl });
      }

      await savePlayerIdentityProfile({
        userId,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dob,
        barangay: data.location,
        photoUrl: photoUrl || null,
      });
      router.push('/wizard/3');
    } catch (error) {
      console.error('Error completing profile:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSkip = async () => {
    const { data: session } = await authClient.getSession();
    const userId = session?.user.id;

    if (!userId) {
      router.replace('/');
      return;
    }

    setUploading(true);

    try {
      updateData({ profilePhotoUrl: null });

      await savePlayerIdentityProfile({
        userId,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dob,
        barangay: data.location,
        photoUrl: null,
      });
      router.push('/wizard/3');
    } catch (error) {
      console.error('Error completing profile:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View className="flex-1 items-center justify-center p-8">
      <View className="w-full max-w-md gap-8">
        <View className="gap-2">
          <Text className="text-3xl font-bold">Add a profile photo</Text>
          <Text className="text-muted-foreground">Step 2 of 3 (Optional)</Text>
        </View>

        <View className="items-center gap-6">
          {preview ? (
            <Image
              source={{ uri: preview }}
              style={{ width: 200, height: 200, borderRadius: 100 }}
            />
          ) : (
            <View className="h-[200px] w-[200px] items-center justify-center rounded-full bg-muted">
              <Text className="text-4xl">👤</Text>
            </View>
          )}

          {Platform.OS === 'web' && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          )}

          <Button onPress={handleUploadClick} variant="outline">
            <Text>{preview ? 'Change Photo' : 'Upload Photo'}</Text>
          </Button>
        </View>

        <View className="gap-3">
          <Button onPress={handleNext} disabled={uploading}>
            <Text>{uploading ? 'Uploading...' : 'Next'}</Text>
          </Button>
          <Button onPress={handleSkip} variant="ghost" disabled={uploading}>
            <Text>Skip for now</Text>
          </Button>
        </View>
      </View>
    </View>
  );
}
