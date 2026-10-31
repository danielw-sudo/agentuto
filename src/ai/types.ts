export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface SimulationTelemetryContext {
  concept_id: string;
  concept_title: string;
  governing_ode?: string;
  active_parameters: Record<string, number>;
  telemetry_summary: {
    duration_s: number;
    sample_count: number;
    min_values: Record<string, number>;
    max_values: Record<string, number>;
    latest_values: Record<string, number>;
  };
}
