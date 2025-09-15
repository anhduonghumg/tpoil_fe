import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AuthApi } from './api'
import { loadUserFromCache, saveUserToCache, User } from './session'

const KEY = ['auth','me']

export const useMe = () => {
  const initial = loadUserFromCache()
  return useQuery<User>({
    queryKey: KEY,
    queryFn: AuthApi.me,               
    initialData: initial ?? undefined, 
    staleTime: Infinity,               
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 0,
    enabled: initial == null,
    select: (u) => ({ id: u.id, fullname: u.fullname, email: u.email }),
  })
}

export function usePrimeUser() {
  const qc = useQueryClient()
  return (u: User | null) => {
    qc.setQueryData(KEY, u ?? undefined)
    saveUserToCache(u)
  }
}

export const useLogin = () =>
  useMutation({ mutationFn: AuthApi.login, retry: 0 })

export const useLogout = () =>
  useMutation({ mutationFn: AuthApi.logout, retry: 0 })
