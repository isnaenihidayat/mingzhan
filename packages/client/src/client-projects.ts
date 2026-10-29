import type {
  CreateProjectRequest,
  ListProjectFilesResponse,
  ListProjectsResponse,
  ProjectFileSummary,
  ProjectSummary,
  SessionSummary,
  UpdateProjectRequest,
} from "@mingzhan/core/contract";
import { PluginsClient } from "./client-plugins";

export class ProjectsClient extends PluginsClient {
  async listProjectSessions(
    id: string
  ): Promise<{ sessions: SessionSummary[] }> {
    return this.request(`/v1/projects/${encodeURIComponent(id)}/sessions`);
  }

  async listProjects(): Promise<ListProjectsResponse> {
    return this.request<ListProjectsResponse>("/v1/projects");
  }

  async createProject(request: CreateProjectRequest): Promise<ProjectSummary> {
    return this.request<ProjectSummary>("/v1/projects", {
      body: JSON.stringify(request),
      method: "POST",
    });
  }

  async getProject(id: string): Promise<ProjectSummary> {
    return this.request<ProjectSummary>(
      `/v1/projects/${encodeURIComponent(id)}`
    );
  }

  async updateProject(
    id: string,
    request: UpdateProjectRequest
  ): Promise<ProjectSummary> {
    return this.request<ProjectSummary>(
      `/v1/projects/${encodeURIComponent(id)}`,
      {
        body: JSON.stringify(request),
        method: "PATCH",
      }
    );
  }

  async deleteProject(id: string): Promise<void> {
    await this.request(`/v1/projects/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }

  async listProjectFiles(projectId: string): Promise<ListProjectFilesResponse> {
    return this.request<ListProjectFilesResponse>(
      `/v1/projects/${encodeURIComponent(projectId)}/files`
    );
  }

  async uploadProjectFile(
    projectId: string,
    file: File
  ): Promise<ProjectFileSummary> {
    const formData = new FormData();

    formData.append("file", file);

    return this.request<ProjectFileSummary>(
      `/v1/projects/${encodeURIComponent(projectId)}/files`,
      {
        body: formData,
        method: "POST",
      }
    );
  }

  async deleteProjectFile(projectId: string, fileId: string): Promise<void> {
    await this.request(
      `/v1/projects/${encodeURIComponent(projectId)}/files/${encodeURIComponent(fileId)}`,
      {
        method: "DELETE",
      }
    );
  }

  getProjectFileDownloadUrl(projectId: string, fileId: string): string {
    return `/v1/projects/${encodeURIComponent(projectId)}/files/${encodeURIComponent(fileId)}/download`;
  }
}
