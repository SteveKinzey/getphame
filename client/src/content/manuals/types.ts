export type ManualAccess = "all" | "paid" | "admin";

export type ManualIconName =
  | "activity"
  | "badgePercent"
  | "bell"
  | "building"
  | "chart"
  | "compass"
  | "creditCard"
  | "dollar"
  | "fileText"
  | "gauge"
  | "gift"
  | "inbox"
  | "key"
  | "mail"
  | "plug"
  | "rocket"
  | "rotate"
  | "send"
  | "shield"
  | "trendDown"
  | "users";

export interface ManualTopic {
  id: string;
  title: string;
  access: ManualAccess;
  body: string;
  steps: string[];
  notes?: string[];
  route?: string;
}

export interface ManualSection {
  id: string;
  title: string;
  summary: string;
  icon: ManualIconName;
  access?: "admin";
  topics: ManualTopic[];
}

export interface ManualDocument {
  version: number;
  title: string;
  eyebrow: string;
  introduction: string;
  lastUpdated: string;
  sections: ManualSection[];
}

export type ManualRole = "user" | "admin";
