import asthma from '../../assets/icons/conditions/asthma.svg'
import copd from '../../assets/icons/conditions/copd.svg'
import cardiovascular from '../../assets/icons/conditions/hypertension.svg'
import endocrine from '../../assets/icons/conditions/diabetes.svg'
import neurological from '../../assets/icons/conditions/epilepsy.svg'
import migraine from '../../assets/icons/conditions/migraine.svg'
import mental from '../../assets/icons/conditions/mental.svg'
import musculoskeletal from '../../assets/icons/conditions/musculoskeletal.svg'
import digestive from '../../assets/icons/conditions/digestive.svg'

// Exact per-condition icon mapping, matching the Figma "Kaapu - V2" condition
// list designs (node 915:10621) — most conditions share one icon per medical
// category, but Chronic Migraine gets its own distinct glyph within neurological.
const CONDITION_ICON_BY_NAME = {
  'Asthma': asthma,
  'COPD': copd,
  'Hypertension': cardiovascular,
  'Atrial Fibrillation': cardiovascular,
  'Heart Failure': cardiovascular,
  'Type 2 Diabetes': endocrine,
  'Type 1 Diabetes': endocrine,
  'Hypothyroidism': endocrine,
  'Epilepsy': neurological,
  'Multiple Sclerosis': neurological,
  'Chronic Migraine': migraine,
  'Depression': mental,
  'Anxiety Disorder': mental,
  'Rheumatoid Arthritis': musculoskeletal,
  "Crohn's Disease": digestive,
}

const CATEGORY_FALLBACK = {
  respiratory: asthma,
  cardiovascular,
  endocrine,
  neurological,
  mental,
  musculoskeletal,
  digestive,
}

export function getConditionIcon(condition) {
  if (!condition) return asthma
  return CONDITION_ICON_BY_NAME[condition.name]
    || CATEGORY_FALLBACK[condition.category]
    || asthma
}
