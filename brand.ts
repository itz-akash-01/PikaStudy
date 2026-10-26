import mascotUrl from './mascot.jpg'

export const brand = {
  name: 'PikaStudy',
  tagline: 'Learn Smart. Shine Bright.',
  // Single place to swap the mascot image (replace mascot.jpg or change this import).
  mascot: mascotUrl,
  mascotSize: { width: 736, height: 981 },
  contactEmail: (import.meta.env.VITE_CONTACT_EMAIL as string | undefined) ?? '',
} as const
