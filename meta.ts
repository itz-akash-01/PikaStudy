import { supabase } from './supabase'
import type { Meta, Named } from './types'
import { ALL_SUBJECT_NAMES, CATEGORY_NAMES, CLASS_IDS, STREAM_NAMES } from './curriculum'

const named = (names: readonly string[]): Named[] => names.map((name, i) => ({ id: i + 1, name }))

let cache: Promise<Meta> | null = null

export function getMeta(): Promise<Meta> {
  cache ??= load().catch((e) => { cache = null; throw e })
  return cache
}

async function load(): Promise<Meta> {
  if (!supabase) {
    return {
      classes: CLASS_IDS.map((id) => ({ id, name: `Class ${id}` })),
      streams: named(STREAM_NAMES), subjects: named(ALL_SUBJECT_NAMES), categories: named(CATEGORY_NAMES),
    }
  }
  const [classes, streams, subjects, categories] = await Promise.all([
    supabase.from('classes').select('id, name').order('id'),
    supabase.from('streams').select('id, name').order('id'),
    supabase.from('subjects').select('id, name').order('name'),
    supabase.from('categories').select('id, name').order('id'),
  ])
  const err = classes.error ?? streams.error ?? subjects.error ?? categories.error
  if (err) throw new Error(err.message)
  return {
    classes: classes.data as Named[], streams: streams.data as Named[],
    subjects: subjects.data as Named[], categories: categories.data as Named[],
  }
}

export const idByName = (list: Named[], name: string) => list.find((x) => x.name === name)?.id
