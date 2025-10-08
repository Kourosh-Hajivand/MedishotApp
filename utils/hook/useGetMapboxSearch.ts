import {useQuery, UseQueryResult} from '@tanstack/react-query';
import Mapbox, {SearchBoxQuery} from '../service/MapBox';
import {
  MapboxRetrieveResponse,
  MapboxSearchBoxResponse,
} from '../service/models/MapboxResponse';

export const useMapboxSearch = (
  query: SearchBoxQuery,
): UseQueryResult<MapboxSearchBoxResponse, Error> => {
  return useQuery({
    queryKey: ['MapboxSearch', query],
    queryFn: () => Mapbox.Search(query),
    enabled: !!query.query.trim(),
  });
};
export const useGetSearchDetail = (
  mapboxId?: string,
): UseQueryResult<MapboxRetrieveResponse, Error> => {
  return useQuery({
    queryKey: ['SearchDetail', mapboxId],
    queryFn: () => Mapbox.GetSearchDetail(mapboxId),
    enabled: !!mapboxId,
  });
};
