import axios from 'axios';

import {
  MapboxSearchBoxResponse,
  MapboxRetrieveResponse,
} from './models/MapboxResponse';
import {getTokens} from '../helper/tokenStorage';

export interface SearchBoxQuery {
  query: string;
  proximity?: {longitude: number; latitude: number};
  limit?: number;
  language?: string;
  country?: string;
}
export interface GetSearchDetailQuery {
  mapboxId: string;
}
const MAPBOX_ACCESS_TOKEN =
  'pk.eyJ1IjoibmF2aWRiYWhyYW1pIiwiYSI6ImNtZTFnemppODBmYnQya24zY2Z0ZzZlM3MifQ.uTVxbxu9InBb1M8pFx8gcA';
const Mapbox = {
  Search: async (
    queryParams: SearchBoxQuery,
  ): Promise<MapboxSearchBoxResponse> => {
    const tokens = await getTokens();
    try {
      const url = `https://api.mapbox.com/search/searchbox/v1/suggest`;

      const params = new URLSearchParams({
        q: queryParams.query,
        access_token: MAPBOX_ACCESS_TOKEN || '',
      });
      queryParams.proximity &&
        params.append(
          'proximity',
          `${queryParams.proximity.longitude},${queryParams.proximity.latitude}`,
        );
      params.append('session_token', tokens.accessToken ?? '');
      queryParams.limit && params.append('limit', queryParams.limit.toString());
      queryParams.language && params.append('language', queryParams.language);
      queryParams.country && params.append('country', queryParams.country);
      const response = await axios.get<MapboxSearchBoxResponse>(
        `${url}?${params.toString()}`,
      );

      if (response.status === 200 || response.status === 201) {
        return response.data;
      } else {
        throw new Error(`Request failed with status ${response.status}`);
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.message || 'Unknown error occurred',
        );
      }
      throw error;
    }
  },

  GetSearchDetail: async (
    mapboxId?: string,
  ): Promise<MapboxRetrieveResponse> => {
    try {
      const tokens = await getTokens();
      const url = `https://api.mapbox.com/search/searchbox/v1/retrieve/${mapboxId}`;

      const params = new URLSearchParams({
        language: 'en',
        session_token: tokens.accessToken ?? '',
        access_token: MAPBOX_ACCESS_TOKEN || '',
      });

      const response = await axios.get<MapboxRetrieveResponse>(
        `${url}?${params.toString()}`,
      );

      if (response.status === 200 || response.status === 201) {
        return response.data;
      } else {
        throw new Error(`Request failed with status ${response.status}`);
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.message || 'Unknown error occurred',
        );
      }
      throw error;
    }
  },
};

export default Mapbox;
