import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'
import ConditionCard from './ConditionCard'

const MILD_CONDITION = {
  id: 'cond-mild',
  name: 'Hypothyroidism',
  icon: '🦋',
  severity: 'mild',
  icd: 'E03',
  diagnosedDate: '2021-05-10',
  linkedCategories: ['fatigue'],
  notes: 'Well controlled on Levothyroxine.',
}

const SEVERE_CONDITION = {
  id: 'cond-severe',
  name: 'Chronic Migraine',
  icon: '🤕',
  severity: 'severe',
  icd: 'G43',
  diagnosedDate: '2020-07-01',
  linkedCategories: ['neurological', 'pain'],
  notes: 'Triggered by stress and screen time.',
}

const MEDICATIONS = [
  { id: 'med-1', conditionId: 'cond-severe', name: 'Sumatriptan', dosage: '50mg', frequency: 'As needed', memberId: 'member-1' },
  { id: 'med-2', conditionId: 'cond-severe', name: 'Topiramate', dosage: '25mg', frequency: 'Once daily', memberId: 'member-1' },
]

const SYMPTOMS = [
  { id: 'sym-1', bodyLabel: 'Head', bodyRegion: 'head', type: 'Headache', category: 'neurological', severity: 7, resolved: false, timestamp: new Date().toISOString(), memberId: 'member-1' },
]

const meta = {
  title: 'Components/Health/Condition Card',
  component: ConditionCard,
  tags: ['ai-generated'],
  args: {
    medications: [],
    symptoms: [],
  },
} satisfies Meta<typeof ConditionCard>

export default meta
type Story = StoryObj<typeof meta>

export const Mild: Story = {
  args: { condition: MILD_CONDITION, medications: [], symptoms: [] },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Hypothyroidism')).toBeVisible()
    await expect(canvas.getByText('Mild')).toBeVisible()
    await expect(canvas.getByText('ICD: E03')).toBeVisible()
  },
}

export const Severe: Story = {
  args: { condition: SEVERE_CONDITION, medications: MEDICATIONS, symptoms: SYMPTOMS },
}

export const Moderate: Story = {
  args: {
    condition: {
      id: 'cond-mod',
      name: 'Asthma',
      icon: '🫁',
      severity: 'moderate',
      icd: 'J45',
      diagnosedDate: '2018-03-15',
      linkedCategories: ['respiratory'],
    },
    medications: [
      { id: 'med-3', conditionId: 'cond-mod', name: 'Salbutamol', dosage: '100mcg', frequency: 'As needed', memberId: 'member-1' },
    ],
    symptoms: [],
  },
}
