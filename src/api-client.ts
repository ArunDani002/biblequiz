
import { useMutation, useQuery } from "@tanstack/react-query";

type ApiOptions = {
  method?: string;
  data?: unknown;
};

// Backend API URL
const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  "https://biblequizserver.onrender.com"
).replace(/\/+$/, "");

let tokenGetter:
  | (() => string | null | Promise<string | null>)
  | null = null;

export function setAuthTokenGetter(
  getter: (() => string | null | Promise<string | null>) | null,
) {
  tokenGetter = getter;
}

async function request(path: string, options: ApiOptions = {}) {
  // Get the authentication token
  const token = tokenGetter
    ? await tokenGetter()
    : typeof localStorage === "undefined"
      ? null
      : localStorage.getItem("timothy_token");

  // Ensure the request path starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // Send requests to the backend server
  const response = await fetch(`${API_BASE_URL}${normalizedPath}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.data !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body:
      options.data !== undefined
        ? JSON.stringify(options.data)
        : undefined,
  });

  // Handle empty responses and JSON parsing safely
  const payload =
    response.status === 204
      ? undefined
      : await response.json().catch(() => undefined);

  // Handle API errors
  if (!response.ok) {
    throw new Error(
      payload?.error ||
        payload?.message ||
        `Request failed (${response.status}).`,
    );
  }

  return payload;
}

// Generic query hook
function useQueryEndpoint(path: string, options: any = {}) {
  return useQuery({
    queryKey: [path],
    queryFn: () => request(path),
    ...options.query,
  });
}

// Generic POST action hook
function useAction(path: string) {
  return useMutation({
    mutationFn: () => request(path, { method: "POST" }),
  });
}

// Query keys
export const getGetCurrentQuizQueryKey = () => ["/api/quiz/current"];
export const getListTeamsQueryKey = () => ["/api/teams"];

// Admin login
export function useAdminLogin() {
  return useMutation({
    mutationFn: ({ data }: any) =>
      request("/api/auth/admin/login", {
        method: "POST",
        data,
      }),
  });
}

// Team login
export function useTeamLogin() {
  return useMutation({
    mutationFn: ({ data }: any) =>
      request("/api/auth/team/login", {
        method: "POST",
        data,
      }),
  });
}

// Authentication
export function useGetCurrentUser() {
  return useQueryEndpoint("/api/auth/me");
}

// Teams
export function useListTeams() {
  return useQueryEndpoint("/api/teams");
}

export function useCreateTeam() {
  return useMutation({
    mutationFn: ({ data }: any) =>
      request("/api/teams", {
        method: "POST",
        data,
      }),
  });
}

export function useUpdateTeam() {
  return useMutation({
    mutationFn: ({ teamId, data }: any) =>
      request(`/api/teams/${encodeURIComponent(teamId)}`, {
        method: "PUT",
        data,
      }),
  });
}

export function useDeactivateTeam() {
  return useMutation({
    mutationFn: ({ teamId }: any) =>
      request(`/api/teams/${encodeURIComponent(teamId)}`, {
        method: "DELETE",
      }),
  });
}

// Questions
export function useListQuestions() {
  return useQueryEndpoint("/api/questions");
}

// Quiz
export function useGetCurrentQuiz(options: any = {}) {
  return useQueryEndpoint("/api/quiz/current", options);
}

export const useStartQuiz = () => useAction("/api/quiz/start");
export const useCloseAnswers = () => useAction("/api/quiz/close");
export const useRevealAnswer = () => useAction("/api/quiz/reveal");
export const useShowLeaderboard = () => useAction("/api/quiz/leaderboard");
export const useNextQuestion = () => useAction("/api/quiz/next");
export const useFinishQuiz = () => useAction("/api/quiz/finish");
export const useResetQuiz = () => useAction("/api/quiz/reset");

// Submit answer
export function useSubmitAnswer() {
  return useMutation({
    mutationFn: ({ data }: any) =>
      request("/api/quiz/answer", {
        method: "POST",
        data,
      }),
  });
}
