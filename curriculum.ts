export const CLASS_IDS = [10, 11, 12] as const
export const STREAM_NAMES = ['Science', 'Commerce', 'Arts / Humanities'] as const
export type StreamName = (typeof STREAM_NAMES)[number]

export const CATEGORY_NAMES = [
  'NCERT', 'Reference Books', 'Notes', 'Question Banks', 'Sample Papers', 'PYQs', 'Practical Resources',
] as const

export const CLASS_10_SUBJECTS = [
  'Mathematics', 'Science', 'English', 'Hindi', 'Social Science', 'Information Technology',
]

export const STREAM_SUBJECTS: Record<StreamName, string[]> = {
  Science: ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'English', 'Computer Science', 'Informatics Practices'],
  Commerce: ['Accountancy', 'Business Studies', 'Economics', 'Statistics', 'English', 'Informatics Practices'],
  'Arts / Humanities': ['History', 'Political Science', 'Geography', 'Sociology', 'Psychology', 'English'],
}

export const ALL_SUBJECT_NAMES = [
  ...new Set([...CLASS_10_SUBJECTS, ...Object.values(STREAM_SUBJECTS).flat()]),
]

export const LANGUAGES = ['English', 'Hindi']
export const SESSIONS = ['2025-26', '2024-25']

export const subjectsFor = (classId: number, stream?: StreamName) =>
  classId === 10 ? CLASS_10_SUBJECTS : STREAM_SUBJECTS[stream ?? 'Science']
