/** @jsxImportSource react */
import { useCallback, useEffect, useState } from 'react'
import { set, unset, useClient, type ArrayOfObjectsInputProps } from 'sanity'
import { Checkbox, Flex, Spinner, Stack, Text } from '@sanity/ui'

type Category = { _id: string; name: string }

/**
 * Renders the artwork "Categories" reference array as a flat checkbox list of
 * every category document, instead of Sanity's default add-one-at-a-time UI.
 * The stored value stays a normal array of references (`{_type, _ref, _key}`),
 * so frontend GROQ (`categories[]->slug.current`) is unaffected. New category
 * documents appear here automatically.
 */
export function CategoryCheckboxInput(props: ArrayOfObjectsInputProps) {
  const { value = [], onChange } = props
  const client = useClient({ apiVersion: '2024-01-01' })
  const [categories, setCategories] = useState<Category[] | null>(null)

  useEffect(() => {
    let active = true
    client
      .fetch<Category[]>(`*[_type == "category"] | order(name asc){_id, name}`)
      .then((res) => {
        if (active) setCategories(res)
      })
    return () => {
      active = false
    }
  }, [client])

  const selectedIds = new Set((value as Array<{ _ref: string }>).map((v) => v._ref))

  const toggle = useCallback(
    (id: string) => {
      const current = (value as Array<{ _ref: string }>) ?? []
      const next = selectedIds.has(id)
        ? current.filter((v) => v._ref !== id)
        : [...current, { _type: 'reference', _ref: id, _key: id }]
      onChange(next.length ? set(next) : unset())
    },
    [value, onChange, selectedIds],
  )

  if (!categories) return <Spinner muted />

  return (
    <Stack space={3}>
      {categories.map((cat) => (
        <Flex key={cat._id} align="center" gap={3}>
          <Checkbox
            id={`category-${cat._id}`}
            checked={selectedIds.has(cat._id)}
            onChange={() => toggle(cat._id)}
          />
          <Text>
            <label htmlFor={`category-${cat._id}`}>{cat.name}</label>
          </Text>
        </Flex>
      ))}
    </Stack>
  )
}
