export type SheetMode = "exact" | "contains" | "index";
export type FilterMode = "include" | "exclude";
export type PageKey = "scheme" | "source" | "rules" | "ocr" | "run" | "about";

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
  sheet_choices: SheetChoice[];
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

export interface SheetChoice {
  file_path: string;
  rule_index: number;
  sheet_name: string;
}

export interface SheetConflict {
  file_path: string;
  file_name: string;
  rule_index: number;
  output_column: string;
  sheet_value: string;
  matched_sheets: string[];
}

export interface OcrRuntimeStatus {
  version: string;
  bundled: boolean;
  prepared: boolean;
  message: string;
}

export interface ImagePayload {
  path: string;
  data_url: string;
  size_bytes: number;
}

export interface OcrTextItem {
  text: string;
  score: number;
  box_points: Array<[number, number]>;
  end: string;
}

export interface OcrImageResult {
  text: string;
  items: OcrTextItem[];
  elapsed_seconds: number;
}
