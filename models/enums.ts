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
    token = "token",
    refreshToken = "refreshToken",
    lang = "lang",
}

export enum QueryKeys {
    tokens = "tokens",
    profile = "profile",
}

export enum DynamicFieldType {
    Phone = "phone",
    Email = "email",
    Address = "address",
    Date = "date",
    URL = "url",
    Text = "text",
    Number = "number",
}

export enum PhoneLabel {
    Mobile = "mobile",
    Home = "home",
    Work = "work",
    iPhone = "iPhone",
    Main = "main",
    Other = "other",
}

export enum EmailLabel {
    Home = "home",
    Work = "work",
    iCloud = "iCloud",
    Personal = "personal",
    Other = "other",
}

export enum AddressLabel {
    Home = "home",
    Work = "work",
    Other = "other",
}

export enum DateLabel {
    Birthday = "birthday",
    Anniversary = "anniversary",
    Other = "other",
}

export enum URLLabel {
    Instagram = "instagram",
    Facebook = "facebook",
    Twitter = "twitter",
    LinkedIn = "linkedin",
    YouTube = "youtube",
    TikTok = "tiktok",
    Telegram = "telegram",
    WhatsApp = "whatsapp",
    Other = "other",
}
