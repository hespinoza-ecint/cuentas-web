import { api } from '../../lib/api/client.ts'
import { problemFrom } from '../../lib/problem.ts'

export interface Category {
  id: string
  userId: string | null
  parentId: string | null
  name: string
  kind: string
  icon: string | null
  isSystem: boolean
}

export interface CategoryInput {
  name: string
  kind: 'EXPENSE' | 'INCOME' | 'BOTH'
  parentId?: string | null
  icon?: string
}

export async function listCategories(kind?: 'EXPENSE' | 'INCOME'): Promise<Category[]> {
  const { data, error, response } = await api.GET('/api/v1/categories', {
    params: { query: kind ? { kind } : {} },
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as Category[]
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const { data, error, response } = await api.POST('/api/v1/categories', {
    body: {
      name: input.name,
      kind: input.kind,
      parentId: input.parentId ?? undefined,
      icon: input.icon,
    },
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as Category
}

export async function updateCategory(id: string, input: Partial<CategoryInput>): Promise<Category> {
  const { data, error, response } = await api.PATCH('/api/v1/categories/{id}', {
    params: { path: { id } },
    body: input,
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as Category
}

export async function removeCategory(id: string): Promise<void> {
  const { error, response } = await api.DELETE('/api/v1/categories/{id}', {
    params: { path: { id } },
  })
  if (error) {
    throw problemFrom(error, response)
  }
}
