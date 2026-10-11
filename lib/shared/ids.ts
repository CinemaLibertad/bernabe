export type Brand<T, Name extends string> = T & { readonly __brand: Name };
export type StudioId = Brand<string, "StudioId">;
export type ClientId = Brand<string, "ClientId">;
export type CaseId = Brand<string, "CaseId">;
export type ActivityId = Brand<string, "ActivityId">;
export type UserId = Brand<string, "UserId">;
