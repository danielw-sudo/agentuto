export interface TutorialRegistration {
  id: string;
  title: string;
  load: () => Promise<any>;
}

export const TUTORIAL_REGISTRY: Record<string, TutorialRegistration> = {
  'shannon-entropy': {
    id: 'shannon-entropy',
    title: 'How many bits per letter?',
    load: () => import('./shannon-entropy/ShannonEntropyTutorial').then((m) => m.ShannonEntropyTutorial),
  },
};
