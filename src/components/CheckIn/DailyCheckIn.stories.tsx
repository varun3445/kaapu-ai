import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import DailyCheckIn from './DailyCheckIn'

const meta = {
  title: 'Components/Health/Daily Check-In',
  component: DailyCheckIn,
  tags: ['ai-generated'],
  args: {
    onClose: () => {},
  },
} satisfies Meta<typeof DailyCheckIn>

export default meta
type Story = StoryObj<typeof meta>

// Fresh check-in for today
export const Today: Story = {
  play: async ({ canvas }) => {
    // The feeling grid should be present
    const grid = canvas.getByRole('button', { name: /great/i })
    await expect(grid).toBeVisible()
  },
}

// Editing a past day
export const PastDay: Story = {
  args: {
    targetDate: new Date(Date.now() - 2 * 24 * 3600000),
  },
}
