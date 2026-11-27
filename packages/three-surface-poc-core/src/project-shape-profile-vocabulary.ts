// Shared internally by the built-in readers and their profile.
export const PILLAR_LABELS = {
  'heart-and-soul': 'Heart and Soul',
  'legends-and-lore': 'Legends and Lore',
  'spec-and-spine': 'Spec and Spine',
  'lay-and-land': 'Lay and Land',
  'craft-and-care': 'Craft and Care',
} as const;

export const ROOT_SUMMARY_HEADING = 'Key Architectural Facts';
export const PRECEDENCE_HEADING = 'Precedence Order When Layers Disagree';
export const PRECEDENCE_COLUMNS = ['#', 'Layer', 'Owns', 'Home'] as const;
export const STATED_COUNT_FACTS = ['catalog-count:Staffers', 'catalog-count:Butlers'] as const;
