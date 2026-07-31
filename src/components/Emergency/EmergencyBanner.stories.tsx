import React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import EmergencyBanner from './EmergencyBanner'
import { AppContext } from '../../../.storybook/MockAppContext'

const ACTIVE_EMERGENCY = {
  id: 'em-1',
  triggeredAt: new Date().toISOString(),
  location: { lat: 37.7749, lng: -122.4194, address: '1 Market St, San Francisco' },
  triggeredBy: 'member-1',
  status: 'active',
}

const withActive = (Story: any) => (
  <AppContext.Provider value={{ activeEmergency: ACTIVE_EMERGENCY, resolveEmergency: () => {} }}>
    <Story />
  </AppContext.Provider>
)

const withNone = (Story: any) => (
  <AppContext.Provider value={{ activeEmergency: null, resolveEmergency: () => {} }}>
    <Story />
  </AppContext.Provider>
)

const meta = {
  title: 'Components/Emergency/Emergency Banner',
  component: EmergencyBanner,
  tags: ['ai-generated'],
} satisfies Meta<typeof EmergencyBanner>

export default meta
type Story = StoryObj<typeof meta>

// Active emergency — the red pulsing banner
export const Active: Story = {
  decorators: [withActive],
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/EMERGENCY ACTIVE/i)).toBeInTheDocument()
  },
}

// No active emergency — component renders nothing (correct behaviour)
export const Inactive: Story = {
  decorators: [withNone],
}
