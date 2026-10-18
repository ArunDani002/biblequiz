import { useMutation, useQuery } from "@tanstack/react-query";

type ApiOptions = {
  method?: string;
  data?: unknown;
};

let tokenGetter: (() => string | null | Promise<string | null>) | null = null;

export function setAuthTokenGetter(
  getter: (() => string | null | Promise<string | null>) | null,
) {
  tokenGetter = getter;
}

async function request(path: string, options: ApiOptions = {}) {
  const token = tokenGetter
    ? await tokenGetter()
    : typeof localStorage === "undefined"
      ? null
      : localStorage.getItem("timothy_token");
  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers: {
      ...(options.data ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.data ? JSON.stringify(options.data) : undefined,
  });
  const payload = response.status === 204 ? undefined : await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || `Request failed (${response.status}).`);
  }
  return payload;
}

function useQueryEndpoint(path: string, options: any = {}) {
  return useQuery({
    queryKey: [path],
    queryFn: () => request(path),
    ...options.query,
  });
}

function useAction(path: string) {
  return useMutation({
    mutationFn: () => request(path, { method: "POST" }),
  });
}

export const getGetCurrentQuizQueryKey = () => ["/api/quiz/current"];
export const getListTeamsQueryKey = () => ["/api/teams"];

export function useAdminLogin() {
  return useMutation({
    mutationFn: ({ data }: any) =>
      request("/api/auth/admin/login", { method: "POST", data }),
  });
}

export function useTeamLogin() {
  return useMutation({
    mutationFn: ({ data }: any) =>
      request("/api/auth/team/login", { method: "POST", data }),
  });
}

export function useGetCurrentUser() {
  return useQueryEndpoint("/api/auth/me");
}

export function useListTeams() {
  return useQueryEndpoint("/api/teams");
}

export function useListQuestions() {
  return useQueryEndpoint("/api/questions");
}

export function useGetCurrentQuiz(options: any = {}) {
  return useQueryEndpoint("/api/quiz/current", options);
}

export function useCreateTeam() {
  return useMutation({
    mutationFn: ({ data }: any) =>
      request("/api/teams", { method: "POST", data }),
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

export const useStartQuiz = () => useAction("/api/quiz/start");
export const useCloseAnswers = () => useAction("/api/quiz/close");
export const useRevealAnswer = () => useAction("/api/quiz/reveal");
export const useShowLeaderboard = () => useAction("/api/quiz/leaderboard");
export const useNextQuestion = () => useAction("/api/quiz/next");
export const useFinishQuiz = () => useAction("/api/quiz/finish");
export const useResetQuiz = () => useAction("/api/quiz/reset");

export function useSubmitAnswer() {
  return useMutation({
    mutationFn: ({ data }: any) =>
      request("/api/quiz/answer", { method: "POST", data }),
  });
}
