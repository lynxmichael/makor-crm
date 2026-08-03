import { api, http } from "./api";
import type { Resource, ResourceCategory, ResourceGroups, ResourceType } from "@/types/resource";

/**
 * Espace Ressources. Nommé `resourcesLibrary` pour ne pas se confondre avec
 * `services/resources.ts`, qui est la fabrique CRUD générique.
 */
export const resourcesLibraryService = {
  list: (params: { category?: ResourceCategory; type?: ResourceType; search?: string } = {}) =>
    http.get<ResourceGroups>("/resources", { params }),

  get: (id: string) => http.get<Resource>(`/resources/${id}`),

  /** Appelé à l'ouverture réelle, pas au rendu de la liste. */
  registerView: (id: string) => http.post<{ id: string }>(`/resources/${id}/view`),

  save: (input: {
    id?: string;
    title: string;
    description?: string;
    category: ResourceCategory;
    type: ResourceType;
    url?: string;
    content?: string;
    isPublished?: boolean;
    file?: File | null;
  }) => {
    const { id, file, ...body } = input;

    if (!file) {
      return id
        ? http.patch<Resource>(`/resources/${id}`, body)
        : http.post<Resource>("/resources", body);
    }

    const form = new FormData();
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined && value !== "") form.append(key, String(value));
    }
    form.append("file", file);

    // Content-Type laissé au navigateur : le fixer omettrait la « boundary ».
    return api
      .request<Resource>({
        method: id ? "PATCH" : "POST",
        url: id ? `/resources/${id}` : "/resources",
        data: form,
        headers: { "Content-Type": undefined },
      })
      .then((r) => r.data);
  },

  remove: (id: string) => http.delete<{ id: string }>(`/resources/${id}`),
};
