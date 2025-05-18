export interface TranscriptionMetrics {
  queue_size: number;
  avg_processing_time: number;
  avg_processing_speed: number;
  files_processed: number;
}

export interface TranscriptionStatus {
  status: 'queued' | 'processing' | 'completed' | 'error';
  created_at: string;
  input_path: string;
  output_path?: string;
  completed_at?: string;
  processing_time?: number;
  file_size?: number;
  error?: string;
  metrics: TranscriptionMetrics;
}

export interface TranscriptionResponse {
  file_id: string;
  status: string;
  queue_position: number;
  metrics: TranscriptionMetrics;
} 