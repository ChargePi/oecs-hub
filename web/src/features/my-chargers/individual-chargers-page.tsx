import { useState } from 'react'

import { SegmentedPage } from '@/components/layout/segmented-page'
import { FavoritesSegment } from './favorites-segment'
import { ProjectAccessGate } from './project-access-gate'
import { ProjectsSegment } from './projects-segment'
import { RatedChargersSegment } from './rated-chargers-segment'

type Segment = 'favorites' | 'projects' | 'ratings'

const NAV_ITEMS: { value: Segment; label: string }[] = [
  { value: 'favorites', label: 'Favorites' },
  { value: 'projects', label: 'Projects' },
  { value: 'ratings', label: 'Rated chargers' },
]

/** The individual-account segment set for the shared "My chargers" shell - see
 *  MyChargersPage, which picks this or the manufacturer segment set by account type. */
export function IndividualChargersPage() {
  const [segment, setSegment] = useState<Segment>('favorites')

  return (
    <SegmentedPage
      title="My chargers"
      description="Chargers you've favorited, rated, or organized into projects."
      items={NAV_ITEMS}
      value={segment}
      onChange={setSegment}
    >
      {segment === 'favorites' ? (
        <FavoritesSegment />
      ) : segment === 'projects' ? (
        <ProjectAccessGate>
          <ProjectsSegment />
        </ProjectAccessGate>
      ) : (
        <RatedChargersSegment />
      )}
    </SegmentedPage>
  )
}
