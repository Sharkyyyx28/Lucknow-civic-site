import { useMemo } from 'react'
import SearchableSelect, { type SelectOption } from './searchable-select'
import type { WardListEntry } from '../pages/api/wards-list'
import { wardDisplayName } from '../lib/communityTypes'

// What slice of Lucknow a feed is showing. "mine:*" is derived from the
// places the reader saved on their profile; the rest are explicit picks.
export type Scope = 'mine:wards' | 'mine:corps' | 'all' | `ward:${string}` | `corp:${string}`

/**
 * Scope picker for the community feed: the reader's own wards, a whole
 * corporation, one specific ward, or everything. Wraps the shared combobox so
 * the 369-ward list stays searchable.
 */
export default function ScopeSelect({
  value,
  onChange,
  wards,
  myWardNames,
  myCorporations,
  id = 'scope',
}: {
  value: Scope
  onChange: (scope: Scope) => void
  wards: WardListEntry[]
  myWardNames: string[]
  myCorporations: string[]
  id?: string
}) {
  const options = useMemo<SelectOption[]>(() => {
    const list: SelectOption[] = []

    if (myWardNames.length) {
      list.push({
        value: 'mine:wards',
        label: myWardNames.length === 1 ? 'My ward' : `My wards (${myWardNames.length})`,
        hint: myWardNames.map(wardDisplayName).join(', '),
        group: 'Your places',
        search: `my wards ${myWardNames.join(' ')}`.toLowerCase(),
      })
      if (myCorporations.length) {
        list.push({
          value: 'mine:corps',
          label: myCorporations.length === 1 ? 'My corporation' : 'My corporations',
          hint: myCorporations.join(', '),
          group: 'Your places',
          search: `my corporation ${myCorporations.join(' ')}`.toLowerCase(),
        })
      }
    }

    list.push({
      value: 'all',
      label: 'All of Lucknow',
      hint: wards.length ? `${wards.length} wards` : undefined,
      group: 'Everywhere',
      search: 'all of lucknow everywhere',
    })

    const corporations = [...new Set(wards.map(w => w.corporation).filter(Boolean))].sort()
    for (const corporation of corporations) {
      const count = wards.filter(w => w.corporation === corporation).length
      list.push({
        value: `corp:${corporation}`,
        label: corporation,
        hint: `${count} ward${count === 1 ? '' : 's'}`,
        group: 'Corporation',
        search: `${corporation} corporation`.toLowerCase(),
      })
    }

    for (const ward of wards) {
      list.push({
        value: `ward:${ward.wardName}`,
        label: wardDisplayName(ward.wardName),
        hint: [ward.wardNumber ? `Ward ${ward.wardNumber}` : '', ward.corporation]
          .filter(Boolean)
          .join(' · '),
        group: 'Ward',
        search: [ward.wardName, ward.wardNameKannada, ward.wardNumber, ward.corporation]
          .filter(Boolean)
          .join(' ')
          .toLowerCase(),
      })
    }

    return list
  }, [wards, myWardNames, myCorporations])

  // A ward can be selected via a deep link before /api/wards-list has landed,
  // so show something readable rather than a raw scope string in the meantime.
  const fallbackLabel = value.startsWith('ward:')
    ? wardDisplayName(value.slice(5))
    : value.startsWith('corp:')
      ? value.slice(5)
      : 'All of Lucknow'

  return (
    <SearchableSelect
      id={id}
      value={value}
      onChange={next => onChange(next as Scope)}
      options={options}
      placeholder={fallbackLabel}
      searchPlaceholder="Search a ward, number or corporation…"
      ariaLabel="Where"
    />
  )
}
