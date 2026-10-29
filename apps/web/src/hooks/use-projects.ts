import type {
  CreateProjectRequest,
  UpdateProjectRequest,
} from "@mingzhan/core/contract";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useAuth } from "@/context/use-auth";
import { client } from "@/lib/client";
import { queryKeys } from "@/lib/query-keys";

const ACTIVE_PROJECT_KEY = "mingzhan:active-project-id";

export function useProjectsQuery() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await client.listProjects();

      return res.projects;
    },
    queryKey: queryKeys.projects.all,
  });
}

export function useCreateProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateProjectRequest) =>
      client.createProject(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useUpdateProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      request,
    }: {
      id: string;
      request: UpdateProjectRequest;
    }) => client.updateProject(id, request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.id),
      });
    },
  });
}

export function useDeleteProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => client.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useProjectQuery(id: string | undefined) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    enabled: isAuthenticated && Boolean(id),
    queryFn: async () => {
      if (!id) {
        throw new Error("Project ID required");
      }

      return client.getProject(id);
    },
    queryKey: queryKeys.projects.detail(id ?? ""),
  });
}

export function useProjectFilesQuery(projectId: string | undefined) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    enabled: isAuthenticated && Boolean(projectId),
    queryFn: async () => {
      if (!projectId) {
        throw new Error("Project ID required");
      }

      const res = await client.listProjectFiles(projectId);

      return res.files;
    },
    queryKey: queryKeys.projects.files(projectId ?? ""),
  });
}

export function useUploadProjectFileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, file }: { file: File; projectId: string }) =>
      client.uploadProjectFile(projectId, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.files(variables.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.all,
      });
    },
  });
}

export function useDeleteProjectFileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      fileId,
      projectId,
    }: {
      fileId: string;
      projectId: string;
    }) => client.deleteProjectFile(projectId, fileId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.files(variables.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.all,
      });
    },
  });
}

export function useActiveProject() {
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_PROJECT_KEY)
  );

  const setActiveProjectId = useCallback((id: string | null) => {
    setActiveProjectIdState(id);

    if (id) {
      localStorage.setItem(ACTIVE_PROJECT_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_PROJECT_KEY);
    }
  }, []);

  return { activeProjectId, setActiveProjectId };
}

export function useProjectSessionsQuery(id: string | undefined) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    enabled: isAuthenticated && Boolean(id),
    queryFn: async () => (await client.listProjectSessions(id!)).sessions,
    queryKey: ["sessions", "project", id],
  });
}
