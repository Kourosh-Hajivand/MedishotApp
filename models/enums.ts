export enum Status {
  Ok = 200,
  Created = 201,
  UnAuth = 401,
  BadRequest = 400,
  NotFound = 404,
  ServerError = 500,
  Found = 302,
  NoContent = 204,
}

export enum StorageKeys {
  token = 'token',
  refreshToken = 'refreshToken',
  lang = 'lang',
}

export enum QueryKeys {
  tokens = 'tokens',
  profile = 'profile',
}
