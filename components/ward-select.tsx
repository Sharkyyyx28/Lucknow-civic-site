import { useMemo } from 'react'
import SearchableSelect, { type SelectOption } from './searchable-select'
import type { WardListEntry } from '../pages/api/wards-list'
import { wardDisplayName } from '../lib/communityTypes'

/**
 * Picks one of the 369 wards. The stored value stays the full ward name as the
 * boundary set spells it ("4 - Sampangirama Nagar"); the number and
 * corporation move into the hint so the list reads as names rather than as a
 * column of numbers. Searchable by name, Kannada name, number or corporation,
 * since people know their ward by whichever of those stuck.
 */
export default function WardSelect({
  value,
  onChange,
  wards,
  id = 'ward',
  placeholder = 'Select a ward…',
}: {
  value: string
  onChange: (wardName: string) => void
  wards: WardListEntry[]
  id?: string
  placeholder?: string
}) {
  const options = useMemo<SelectOption[]>(
    () =>
      wards.map(ward => ({
        value: ward.wardName,
        label: wardDisplayName(ward.wardName),
        hint: [ward.wardNumber ? `Ward ${ward.wardNumber}` : '', ward.corporation]
          .filter(Boolean)
          .join(' · '),
        search: [ward.wardName, ward.wardNameKannada, ward.wardNumber, ward.corporation]
          .filter(Boolean)
          .join(' ')
          .toLowerCase(),
      })),
    [wards]
  )

  return (
    <SearchableSelect
      id={id}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={wards.length ? placeholder : 'Loading wards…'}
      searchPlaceholder="Search a ward, number or corporation…"
      ariaLabel="Ward"
    />
  )
}
