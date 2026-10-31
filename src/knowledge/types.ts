export type RelationType = 'prerequisite' | 'generalization' | 'analogous_to';

export interface ConceptNode {
  id: string;
  title: string;
  discipline: 'Physics' | 'Mathematics' | 'Chemistry';
  level: 'High School (AP/IB)' | 'Undergraduate (MIT)';
  summary_markdown: string;
  governing_ode?: string;
  sandbox_id?: string;
}

export interface ConceptRelation {
  source_concept_id: string;
  target_concept_id: string;
  relation_type: RelationType;
  explanation: string;
}

export interface SandboxRecord {
  id: string;
  concept_id: string;
  title: string;
  engine_type: '2D_CANVAS' | '3D_THREE';
  default_parameters: Record<string, number>;
  telemetry_schema: string[];
}

export interface PlaylistStep {
  step_index: number;
  sandbox_id: string;
  concept_id: string;
  learning_objective: string;
  suggested_parameters: Record<string, number>;
  socratic_challenge: string;
}

export interface StudyPlaylist {
  playlist_title: string;
  description: string;
  steps: PlaylistStep[];
}
