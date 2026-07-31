import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import Header from './Header'

const meta = {
  title: 'Components/Layout/Header',
  component: Header,
  tags: ['ai-generated'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Header>

export default meta
type Story = StoryObj<typeof meta>

// Default: logged-in user with avatar, bell, and people button
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Hello,')).toBeVisible()
    // First name from MOCK_USER (Olga)
    await expect(canvas.getByText('Olga')).toBeVisible()
    await expect(canvas.getByRole('button', { name: /notifications/i })).toBeVisible()
    await expect(canvas.getByRole('button', { name: /family/i })).toBeVisible()
  },
}
