import { ConceptNode, ConceptRelation, SandboxRecord } from './types';
import { SEED_CONCEPTS, SEED_RELATIONS, SEED_SANDBOXES } from './seedData';

export class KnowledgeGraphClient {
  private concepts: Map<string, ConceptNode> = new Map();
  private relations: ConceptRelation[] = [];
  private sandboxes: Map<string, SandboxRecord> = new Map();

  constructor(
    concepts = SEED_CONCEPTS,
    relations = SEED_RELATIONS,
    sandboxes = SEED_SANDBOXES
  ) {
    this.seed(concepts, relations, sandboxes);
  }

  seed(
    concepts: ConceptNode[],
    relations: ConceptRelation[],
    sandboxes: SandboxRecord[]
  ): void {
    this.concepts.clear();
    this.relations = [...relations];
    this.sandboxes.clear();

    for (const c of concepts) {
      this.concepts.set(c.id, c);
    }
    for (const s of sandboxes) {
      this.sandboxes.set(s.id, s);
    }
  }

  getAllConcepts(): ConceptNode[] {
    return Array.from(this.concepts.values());
  }

  getConcept(id: string): ConceptNode | undefined {
    return this.concepts.get(id);
  }

  getRelationsForConcept(conceptId: string): ConceptRelation[] {
    return this.relations.filter(
      (r) => r.source_concept_id === conceptId || r.target_concept_id === conceptId
    );
  }

  getPrerequisites(conceptId: string): ConceptNode[] {
    // If A -(generalization)-> B, then A is a prerequisite of B
    const prereqIds = this.relations
      .filter((r) => r.target_concept_id === conceptId && r.relation_type === 'generalization')
      .map((r) => r.source_concept_id);

    return prereqIds
      .map((id) => this.concepts.get(id))
      .filter((c): c is ConceptNode => c !== undefined);
  }

  getAnalogousConcepts(conceptId: string): { concept: ConceptNode; explanation: string }[] {
    const matches = this.relations.filter(
      (r) =>
        r.relation_type === 'analogous_to' &&
        (r.source_concept_id === conceptId || r.target_concept_id === conceptId)
    );

    return matches
      .map((r) => {
        const otherId = r.source_concept_id === conceptId ? r.target_concept_id : r.source_concept_id;
        const concept = this.concepts.get(otherId);
        return concept ? { concept, explanation: r.explanation } : null;
      })
      .filter((item): item is { concept: ConceptNode; explanation: string } => item !== null);
  }

  getSandboxForConcept(conceptId: string): SandboxRecord | undefined {
    const concept = this.concepts.get(conceptId);
    if (!concept || !concept.sandbox_id) return undefined;
    return this.sandboxes.get(concept.sandbox_id);
  }

  /**
   * Generates a concise graph summary formatted for Gemini's prompt context
   */
  exportGraphSummaryForAI(): string {
    const conceptList = Array.from(this.concepts.values())
      .map((c) => `- [${c.id}] ${c.title} (${c.level}): ODE: ${c.governing_ode ?? 'N/A'}`)
      .join('\n');

    const relationList = this.relations
      .map((r) => `- [${r.source_concept_id}] --(${r.relation_type})--> [${r.target_concept_id}]: ${r.explanation}`)
      .join('\n');

    return `Available Concepts:\n${conceptList}\n\nConcept Relationships:\n${relationList}`;
  }
}

// Global singleton instance for app runtime
export const globalKnowledgeGraph = new KnowledgeGraphClient();
