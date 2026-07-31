import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import BottomNav from './BottomNav'

const meta = {
  title: 'Components/Layout/Bottom Navigation',
  component: BottomNav,
  tags: ['ai-generated'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof BottomNav>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    const nav = canvas.getByRole('navigation')
    await expect(nav).toBeVisible()
    // Confirm all 4 tabs render
    await expect(canvas.getByText('Home')).toBeVisible()
    await expect(canvas.getByText('Timeline')).toBeVisible()
    await expect(canvas.getByText('Ask Kaapu')).toBeVisible()
    await expect(canvas.getByText('People')).toBeVisible()
  },
}

// CSS check — confirms Tailwind + global CSS loaded (bottom-nav uses rgba beige bg)
export const CssCheck: Story = {
  play: async ({ canvas }) => {
    const nav = canvas.getByRole('navigation')
    const style = getComputedStyle(nav)
    // bottom-nav class applies position: fixed — confirms CSS loaded
    await expect(style.position).toBe('fixed')
  },
}
