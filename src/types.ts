export type SheetMode = "exact" | "contains" | "index";
export type FilterMode = "include" | "exclude";
export type PageKey = "scheme" | "source" | "rules" | "run";

export interface Rule {
  output_column: string;
  sheet_mode: SheetMode;
  sheet_value: string;
  cell: string;
}

export interface Scheme {
  name: string;
  target_folder: string;
  output_file: string;
  keyword: string;
  filter_mode: FilterMode;
  rules: Rule[];
}

export interface SummaryRequest {
  target_folder: string;
  output_file: string;
  keyword: string;
  filter_mode: FilterMode;
  rules: Rule[];
}

export interface SummaryResult {
  output_path: string;
  total_files: number;
  processed_files: number;
}

export interface LogEvent {
  level: "INFO" | "WARN" | "ERROR" | "DONE";
  message: string;
}

export interface ProgressEvent {
  processed: number;
  total: number;
}

export interface CurrentFileEvent {
  path: string;
}
