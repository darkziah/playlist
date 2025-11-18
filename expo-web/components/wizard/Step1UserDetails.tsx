import { useForm } from '@tanstack/react-form';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View, ScrollView } from 'react-native';

import { useWizard } from '@/app/wizard/_layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { isUsernameAvailable } from '@/lib/playerProfile';

export default function Step1UserDetails() {
  const router = useRouter();
  const { data, updateData } = useWizard();
  const [checkingUsername, setCheckingUsername] = useState(false);

  const form = useForm({
    defaultValues: {
      username: data.username || '',
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      dob: data.dob || '',
      location: data.location || '',
    },
    onSubmit: async ({ value }) => {
      updateData(value);
      router.push('/wizard/2');
    },
  });

  const validateUsername = async ({ value }: { value: string }) => {
    if (!value.trim()) {
      return 'Username is required';
    }
    setCheckingUsername(true);
    const available = await isUsernameAvailable(value);
    setCheckingUsername(false);
    if (!available) {
      return 'Username is already taken';
    }
    return undefined;
  };

  return (
    <ScrollView className="flex-1">
      <View className="mx-auto w-full max-w-md gap-8 p-8">
        <View className="gap-2">
          <Text className="text-3xl font-bold text-center">Welcome to</Text>
          <Text className="text-3xl font-bold text-center">PlayList (SlamDrunk)!</Text>
          <Text className="text-xl font-bold mt-4">Let's set up your profile</Text>
          <Text className="text-muted-foreground">Step 1 of 3</Text>
        </View>

        <View className="gap-6">
          {/* Username Field */}
          <form.Field
            name="username"
            validators={{
              onChange: ({ value }) => (!value.trim() ? 'Username is required' : undefined),
              onSubmitAsync: validateUsername,
            }}
          >
            {(field) => (
              <View className="gap-2">
                <Label nativeID="username">Username</Label>
                <Input
                  placeholder="Choose a unique username"
                  value={field.state.value}
                  onChangeText={(text) => field.handleChange(text)}
                  onBlur={field.handleBlur}
                  aria-labelledby="username"
                  aria-invalid={!!field.state.meta.errors.length}
                />
                {checkingUsername && (
                  <Text className="text-sm text-muted-foreground">Checking availability...</Text>
                )}
                {field.state.meta.errors.length > 0 && (
                  <Text className="text-sm text-destructive">{field.state.meta.errors[0]}</Text>
                )}
              </View>
            )}
          </form.Field>

          {/* First Name Field */}
          <form.Field
            name="firstName"
            validators={{
              onChange: ({ value }) => (!value.trim() ? 'First name is required' : undefined),
            }}
          >
            {(field) => (
              <View className="gap-2">
                <Label nativeID="firstName">First Name</Label>
                <Input
                  placeholder="Your first name"
                  value={field.state.value}
                  onChangeText={(text) => field.handleChange(text)}
                  onBlur={field.handleBlur}
                  aria-labelledby="firstName"
                  aria-invalid={!!field.state.meta.errors.length}
                />
                {field.state.meta.errors.length > 0 && (
                  <Text className="text-sm text-destructive">{field.state.meta.errors[0]}</Text>
                )}
              </View>
            )}
          </form.Field>

          {/* Last Name Field */}
          <form.Field
            name="lastName"
            validators={{
              onChange: ({ value }) => (!value.trim() ? 'Last name is required' : undefined),
            }}
          >
            {(field) => (
              <View className="gap-2">
                <Label nativeID="lastName">Last Name</Label>
                <Input
                  placeholder="Your last name"
                  value={field.state.value}
                  onChangeText={(text) => field.handleChange(text)}
                  onBlur={field.handleBlur}
                  aria-labelledby="lastName"
                  aria-invalid={!!field.state.meta.errors.length}
                />
                {field.state.meta.errors.length > 0 && (
                  <Text className="text-sm text-destructive">{field.state.meta.errors[0]}</Text>
                )}
              </View>
            )}
          </form.Field>

          {/* Date of Birth Field */}
          <form.Field
            name="dob"
            validators={{
              onChange: ({ value }) => (!value.trim() ? 'Date of birth is required' : undefined),
            }}
          >
            {(field) => (
              <View className="gap-2">
                <Label nativeID="dob">Date of Birth</Label>
                <input
                  type="date"
                  id="dob"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  className="web:flex h-10 native:h-12 web:w-full rounded-md border border-input bg-background px-3 web:py-2 text-base lg:text-sm native:text-lg native:leading-[1.25] text-foreground placeholder:text-muted-foreground web:ring-offset-background file:border-0 file:bg-transparent file:font-medium web:focus-visible:outline-none web:focus-visible:ring-2 web:focus-visible:ring-ring web:focus-visible:ring-offset-2"
                  aria-labelledby="dob"
                  aria-invalid={!!field.state.meta.errors.length}
                />
                {field.state.meta.errors.length > 0 && (
                  <Text className="text-sm text-destructive">{field.state.meta.errors[0]}</Text>
                )}
              </View>
            )}
          </form.Field>

          {/* Location Field */}
          <form.Field
            name="location"
            validators={{
              onChange: ({ value }) => (!value.trim() ? 'Location is required' : undefined),
            }}
          >
            {(field) => (
              <View className="gap-2">
                <Label nativeID="location">Location</Label>
                <Input
                  placeholder="NIA, NPC, Zytek, etc."
                  value={field.state.value}
                  onChangeText={(text) => field.handleChange(text)}
                  onBlur={field.handleBlur}
                  aria-labelledby="location"
                  aria-invalid={!!field.state.meta.errors.length}
                />
                {field.state.meta.errors.length > 0 && (
                  <Text className="text-sm text-destructive">{field.state.meta.errors[0]}</Text>
                )}
              </View>
            )}
          </form.Field>
        </View>

        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
        >
          {([canSubmit, isSubmitting]) => (
            <Button
              onPress={() => form.handleSubmit()}
              disabled={!canSubmit || isSubmitting}
            >
              <Text>{isSubmitting ? 'Validating...' : 'Next'}</Text>
            </Button>
          )}
        </form.Subscribe>
      </View>
    </ScrollView>
  );
}
