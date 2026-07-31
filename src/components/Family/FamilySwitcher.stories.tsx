import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import FamilySwitcher from './FamilySwitcher'

const MEMBERS = [
  { id: 'member-1', name: 'Olga Morgan',  avatar: 'OM', avatarColor: '#6366f1', relationship: 'Self' },
  { id: 'member-2', name: 'James Morgan', avatar: 'JM', avatarColor: '#10b981', relationship: 'Spouse' },
  { id: 'member-3', name: 'Lily Morgan',  avatar: 'LM', avatarColor: '#f59e0b', relationship: 'Daughter' },
]

const meta = {
  title: 'Components/Core UI/Family Switcher',
  component: FamilySwitcher,
  tags: ['ai-generated'],
  args: {
    current: MEMBERS[0],
    members: MEMBERS,
    onSwitch: () => {},
  },
} satisfies Meta<typeof FamilySwitcher>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    const trigger = canvas.getAllByRole('button')[0]
    await expect(trigger).toBeVisible()
  },
}

export const Compact: Story = {
  args: { compact: true },
}

export const SingleMember: Story = {
  args: { members: [MEMBERS[0]] },
}
