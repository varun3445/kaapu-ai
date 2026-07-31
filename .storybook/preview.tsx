import React from 'react'
import type { Preview } from '@storybook/react-vite'
import { BrowserRouter } from 'react-router-dom'
import { initialize, mswLoader } from 'msw-storybook-addon'
import '../src/index.css'
// AppProvider here resolves to MockAppContext.jsx via viteFinal alias
import { AppProvider } from '../src/context/AppContext'

initialize({ onUnhandledRequest: 'bypass' })

const preview: Preview = {
  decorators: [
    (Story) => (
      <BrowserRouter>
        <AppProvider>
          <div style={{ background: '#eeeae6', minHeight: '100vh', padding: '1rem' }}>
            <Story />
          </div>
        </AppProvider>
      </BrowserRouter>
    ),
  ],
  loaders: [mswLoader],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
    options: {
      storySort: {
        order: [
          'Foundations',
          ['Colors', 'Typography', 'Glassmorphism', 'Shadows', 'Icons', 'Spacing'],
          'Components',
          [
            'Layout',
            ['Header', 'Bottom Navigation'],
            'Core UI',
            ['Family Switcher', 'Notification Banner', 'Health ID Card'],
            'Health',
            ['Condition Card', 'Daily Check-In', 'Add Medication'],
            'Emergency',
            ['Emergency Banner'],
          ],
        ],
      },
    },
  },
}

export default preview
