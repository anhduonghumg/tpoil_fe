import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthApi } from "./api";
import { loadUserFromCache, saveUserToCache, User } from "./session";
import { useMemo } from "react";

const KEY = ["auth", "me"];

export const useMe = () => {
  const qc = useQueryClient();
  const initial = useMemo(() => loadUserFromCache(), []);

  return useQuery<User>({
    queryKey: KEY,
    queryFn: AuthApi.me,
    initialData: initial ?? undefined,
    enabled: true,
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    select: (u) => ({ id: u.id, name: u.name, email: u.email }),
  });
};

export function usePrimeUser() {
  const qc = useQueryClient();
  return (u: User | null) => {
    qc.setQueryData(KEY, u ?? undefined);
    saveUserToCache(u);
  };
}

export const useLogin = () =>
  useMutation({ mutationFn: AuthApi.login, retry: 0 });

export const useLogout = () =>
  useMutation({ mutationFn: AuthApi.logout, retry: 0 });


const PROFILE_KEY = ["auth", "profile"] as const;

export function useProfile() {
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn: AuthApi.me,
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useUpdateOwnProfile() {
  const client = useQueryClient();
  const primeUser = usePrimeUser();
  return useMutation({
    mutationFn: AuthApi.updateProfile,
    onSuccess: (user) => {
      primeUser(user);
      client.setQueryData(PROFILE_KEY, user);
    },
  });
}

export function useChangeOwnPassword() {
  return useMutation({ mutationFn: AuthApi.changePassword, retry: false, gcTime: 0 });
}
