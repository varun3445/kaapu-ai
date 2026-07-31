import React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import NotificationBanner from './NotificationBanner'
import { AppContext } from '../../../.storybook/MockAppContext'

const BASE_VALUE = {
  notifications: [],
  dismissNotification: () => {},
  notifCentreOpen: false,
  setNotifCentreOpen: () => {},
  currentUser: { id: 'usr-1', name: 'Olga Morgan', role: 'user' },
}

const SAMPLE_NOTIFICATIONS = [
  {
    id: 'n-1',
    type: 'warning',
    title: 'Symptom escalation',
    body: 'Your headache has been logged for 3 days. Consider seeing a doctor.',
    timestamp: new Date().toISOString(),
    forUserId: 'usr-1',
  },
  {
    id: 'n-2',
    type: 'info',
    title: 'Check-in reminder',
    body: "Don't forget your daily check-in!",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    forUserId: 'usr-1',
  },
]

const meta = {
  title: 'Components/Core UI/Notification Banner',
  component: NotificationBanner,
  tags: ['ai-generated'],
} satisfies Meta<typeof NotificationBanner>

export default meta
type Story = StoryObj<typeof meta>

// No notifications — banner hidden
export const Empty: Story = {
  decorators: [(Story) => <AppContext.Provider value={BASE_VALUE}><Story /></AppContext.Provider>],
}

// With live notifications showing in the feed
export const WithNotifications: Story = {
  decorators: [
    (Story) => (
      <AppContext.Provider value={{ ...BASE_VALUE, notifications: SAMPLE_NOTIFICATIONS }}>
        <Story />
      </AppContext.Provider>
    ),
  ],
}
