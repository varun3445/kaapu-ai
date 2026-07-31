import React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'
import AddMedicationModal from './AddMedicationModal'

const CONDITIONS = [
  { id: 'cond-1', name: 'Asthma', icon: '🫁' },
  { id: 'cond-2', name: 'Chronic Migraine', icon: '🤕' },
]

const meta = {
  title: 'Components/Health/Add Medication',
  component: AddMedicationModal,
  tags: ['ai-generated'],
  args: {
    onClose: () => {},
    conditions: CONDITIONS,
  },
} satisfies Meta<typeof AddMedicationModal>

export default meta
type Story = StoryObj<typeof meta>

// AddMedicationModal renders via createPortal → content is in document.body, not canvas
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    await expect(body.getByPlaceholderText(/medication name/i)).toBeInTheDocument()
  },
}

export const NoConditions: Story = {
  args: { conditions: [] },
}
