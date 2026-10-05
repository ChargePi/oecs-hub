import { useEffect, useState } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { FolderKanban, Plus, Trash2 } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { redirectToLogin } from '@/lib/auth/use-identity'
import { AuthRequiredError } from '@/lib/errors'
import { useToastAction } from '@/lib/use-toast-action'
import { createProject, deleteProject, listProjects } from '@/lib/user-chargers/client'
import { ProjectDetail } from './project-detail'
import { ProjectFormDialog } from './project-form-dialog'

const PAGE_SIZE = 20

export function ProjectsSegment() {
  const queryClient = useQueryClient()
  const { run } = useToastAction()
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

  async function handleDelete(projectId: string) {
    const result = await run(() => deleteProject(projectId))
    if (result !== undefined) {
      await queryClient.invalidateQueries({ queryKey: ['user-chargers', 'projects'] })
    }
  }

  const projects = data?.pages.flatMap((page) => page.projects) ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold">Projects</h2>
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
            <li
              key={project.id}
              className="flex items-center gap-2 rounded-lg border border-border pr-2 transition-colors hover:bg-muted"
            >
              <button
                type="button"
                onClick={() => setSelectedProjectId(project.id)}
                className="flex min-w-0 flex-1 items-center justify-between gap-3 py-3 pl-4 text-left"
              >
                <span className="min-w-0">
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
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                    <span className="sr-only">Delete project</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this project?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes "{project.name}" and its charger list. This can't be
                      undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep project</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={() => handleDelete(project.id)}
                    >
                      Delete project
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
