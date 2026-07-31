import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import HealthIDCard from './HealthIDCard'

const meta = {
  title: 'Components/Core UI/Health ID Card',
  component: HealthIDCard,
  tags: ['ai-generated'],
} satisfies Meta<typeof HealthIDCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Health ID')).toBeVisible()
    await expect(canvas.getByText(/emergency snapshot/i)).toBeVisible()
    await expect(canvas.getByRole('button', { name: /health id/i })).toBeVisible()
  },
}
