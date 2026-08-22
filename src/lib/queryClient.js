import {QueryClient} from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

export const prefetchQuery = (key, fetcher) =>
  queryClient.prefetchQuery({queryKey: key, queryFn: fetcher});

export const invalidateQuery = (key) =>
  queryClient.invalidateQueries({queryKey: key});

export const setQueryData = (key, data) =>
  queryClient.setQueryData(key, data);

export const getQueryData = (key) =>
  queryClient.getQueryData(key);