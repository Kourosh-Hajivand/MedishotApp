export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: string;
  routable_points?: Array<{
    name: string;
    latitude: number;
    longitude: number;
  }>;
}

export interface ContextItem {
  mapbox_id: string;
  name: string;
  wikidata_id?: string;
  region_code?: string;
  region_code_full?: string;
  country_code?: string;
  country_code_alpha_3?: string;
  address_number?: string;
  street_name?: string;
}

export interface Context {
  address?: ContextItem;
  street?: ContextItem;
  neighborhood?: ContextItem;
  postcode?: ContextItem;
  place?: ContextItem;
  district?: ContextItem;
  region?: ContextItem;
  country?: ContextItem;
  locality?: ContextItem;
}

export interface ExternalIds {
  dataplor?: string;
}

export interface Metadata {
  wheelchair_accessible?: boolean;
  [key: string]: unknown;
}

export interface FeatureProperties {
  mapbox_id: string;
  feature_type: string;
  full_address: string;
  name: string;
  coordinates: Coordinates;
  place_formatted?: string;
  context?: Context;
  poi_category?: string[];
  poi_category_ids?: string[];
  external_ids?: ExternalIds;
  metadata?: Metadata;
  operational_status?: string;
  language?: string;
  maki?: string;
}

export interface Geometry {
  type: "Point";
  coordinates: [number, number];
}

export interface Feature {
  type: "Feature";
  geometry: Geometry;
  properties: FeatureProperties;
}

export interface MapboxRetrieveResponse {
  type: "FeatureCollection";
  features: Feature[];
  attribution?: string;
}

export interface Suggestion {
  name: string;
  mapbox_id: string;
  feature_type: string;
  address: string;
  full_address: string;
  place_formatted: string;
  context: Context;
  language: string;
  maki: string;
  poi_category: string[];
  poi_category_ids: string[];
  external_ids: ExternalIds;
  metadata: Record<string, any>;
  distance: number;
}

export interface MapboxSearchBoxResponse {
  suggestions: Suggestion[];
  attribution: string;
  response_id: string;
}
