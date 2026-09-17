import { useEffect, useState } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { FolderKanban, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { redirectToLogin } from '@/lib/auth/use-identity'
import { AuthRequiredError } from '@/lib/errors'
import { createProject, listProjects } from '@/lib/user-chargers/client'
import { ProjectDetail } from './project-detail'
import { ProjectFormDialog } from './project-form-dialog'

const PAGE_SIZE = 20

export function ProjectsSegment() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  const { data, isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey: ['user-chargers', 'projects'],
      queryFn: ({ pageParam }) => listProjects({ pageSize: PAGE_SIZE, pageToken: pageParam }),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextPageToken || undefined,
    })

  useEffect(() => {
    if (error instanceof AuthRequiredError) redirectToLogin()
  }, [error])

  if (selectedProjectId) {
    return <ProjectDetail projectId={selectedProjectId} onBack={() => setSelectedProjectId(null)} />
  }

  if (isLoading) return <Skeleton className="h-48 w-full" />

  const projects = data?.pages.flatMap((page) => page.projects) ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Named shortlists of chargers you're evaluating.
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          New project
        </Button>
      </div>

      {isError || projects.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
          <FolderKanban className="size-6" aria-hidden="true" />
          <p>
            {isError
              ? "Projects aren't available right now."
              : "You haven't created any projects yet."}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {projects.map((project) => (
            <li key={project.id}>
              <button
                type="button"
                onClick={() => setSelectedProjectId(project.id)}
                className="flex w-full items-center justify-between rounded-lg border border-border px-4 py-3 text-left transition-colors hover:bg-muted"
              >
                <span>
                  <span className="font-medium">{project.name}</span>
                  {project.description ? (
                    <span className="ml-2 text-sm text-muted-foreground">
                      {project.description}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {project.chargerCount} charger{project.chargerCount === 1 ? '' : 's'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {hasNextPage ? (
        <Button
          variant="outline"
          size="sm"
          className="self-center"
          disabled={isFetchingNextPage}
          onClick={() => fetchNextPage()}
        >
          {isFetchingNextPage ? 'Loading…' : 'Load more'}
        </Button>
      ) : null}

      <ProjectFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New project"
        onSubmit={async (values) => {
          const project = await createProject(values.name, values.description)
          await queryClient.invalidateQueries({ queryKey: ['user-chargers', 'projects'] })
          return project
        }}
      />
    </div>
  )
}
