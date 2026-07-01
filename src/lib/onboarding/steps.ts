export type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center'

export interface TourStep {
  id: string
  target: string
  title: string
  description: string
  placement?: TourPlacement
  /** Called right before this step is shown. Useful for switching tabs or scrolling. */
  onBeforeShow?: () => void | Promise<void>
}

export const playerTourSteps: TourStep[] = [
  {
    id: 'welcome',
    target: '[data-tour-id="dashboard-header"]',
    title: 'Welcome to your court',
    description: 'This is your personal home. Your player card, stats, clubs, and upcoming games live here.',
    placement: 'bottom',
  },
  {
    id: 'player-card-tab',
    target: '[data-tour-id="tab-overview"]',
    title: 'Your Player Card',
    description: 'View your ELO, rank, win streak, and standout match moments. Share it with friends from here.',
    placement: 'bottom',
    onBeforeShow: () => {
      const tab = document.querySelector<HTMLButtonElement>('[data-tour-id="tab-overview"]')
      tab?.click()
    },
  },
  {
    id: 'edit-profile',
    target: '[data-tour-id="edit-profile-button"]',
    title: 'Edit your profile',
    description: 'Add your racket, play style, city, and social links so other players can find you.',
    placement: 'left',
  },
  {
    id: 'matches-tab',
    target: '[data-tour-id="tab-matches"]',
    title: 'Your matches',
    description: 'See upcoming game days and your recent match history. Tap any match to view details.',
    placement: 'bottom',
    onBeforeShow: () => {
      const tab = document.querySelector<HTMLButtonElement>('[data-tour-id="tab-matches"]')
      tab?.click()
    },
  },
  {
    id: 'clubs-tab',
    target: '[data-tour-id="tab-clubs"]',
    title: 'Your clubs',
    description: 'Browse clubs you have joined and discover new communities to play with.',
    placement: 'bottom',
    onBeforeShow: () => {
      const tab = document.querySelector<HTMLButtonElement>('[data-tour-id="tab-clubs"]')
      tab?.click()
    },
  },
  {
    id: 'joined-clubs',
    target: '[data-tour-id="joined-clubs-list"]',
    title: 'Clubs you joined',
    description: 'Jump into a club homepage to see announcements, events, leaderboards, and members.',
    placement: 'top',
  },
  {
    id: 'discover-clubs',
    target: '[data-tour-id="club-discovery-panel"]',
    title: 'Discover clubs',
    description: 'Find public clubs near you and request to join them.',
    placement: 'top',
  },
  {
    id: 'profile-completeness',
    target: '[data-tour-id="profile-completeness-banner"]',
    title: 'Complete your player card',
    description: 'A complete profile helps captains and club admins invite you to games and competitions.',
    placement: 'bottom',
    onBeforeShow: () => {
      const tab = document.querySelector<HTMLButtonElement>('[data-tour-id="tab-player-card"]')
      tab?.click()
    },
  },
  {
    id: 'navbar',
    target: '[data-tour-id="navbar"]',
    title: 'Quick navigation',
    description: 'Use the menu to jump between your dashboard, competitions, clubs, and profile anytime.',
    placement: 'bottom',
  },
  {
    id: 'done',
    target: '[data-tour-id="dashboard-header"]',
    title: 'You are all set',
    description: 'You can replay this tour anytime from your profile settings. Now go find a game!',
    placement: 'bottom',
  },
]

export const adminTourSteps: TourStep[] = [
  {
    id: 'admin-welcome',
    target: '[data-tour-id="club-header"]',
    title: 'Your club home',
    description: 'As a club admin or owner, this is your command center. Manage members, post announcements, schedule sessions, and record scores from here.',
    placement: 'bottom',
  },
  {
    id: 'admin-controls',
    target: '[data-tour-id="admin-controls"]',
    title: 'Admin quick actions',
    description: 'These shortcuts let you record match scores, copy invite links, and review join requests in one tap.',
    placement: 'top',
    onBeforeShow: () => {
      const tab = document.querySelector<HTMLButtonElement>('[data-tour-id="club-tab-overview"]')
      tab?.click()
    },
  },
  {
    id: 'record-score',
    target: '[data-tour-id="record-score-button"]',
    title: 'Record a score',
    description: 'Log singles or doubles match results here. Scores feed straight into the leaderboard and player ELO.',
    placement: 'top',
  },
  {
    id: 'copy-invite',
    target: '[data-tour-id="copy-invite-button"]',
    title: 'Invite members',
    description: 'Copy and share this link so new players can request to join your club.',
    placement: 'top',
  },
  {
    id: 'join-requests',
    target: '[data-tour-id="join-requests-button"]',
    title: 'Review join requests',
    description: 'Approve or reject pending member requests from here. Email verification is required before approval.',
    placement: 'top',
  },
  {
    id: 'members-tab',
    target: '[data-tour-id="club-tab-members"]',
    title: 'Manage your roster',
    description: 'Open the Members tab to view your roster, assign admin roles, and track member activity.',
    placement: 'bottom',
  },
  {
    id: 'noticeboard-tab',
    target: '[data-tour-id="club-tab-noticeboard"]',
    title: 'Post announcements',
    description: 'Use the Notice Board to pin updates, session reminders, and club news for your members.',
    placement: 'bottom',
  },
  {
    id: 'admin-done',
    target: '[data-tour-id="club-header"]',
    title: 'Ready to run your club',
    description: 'You can replay this tour anytime from your profile settings. Start by inviting members and recording your first match!',
    placement: 'bottom',
    onBeforeShow: () => {
      const tab = document.querySelector<HTMLButtonElement>('[data-tour-id="club-tab-overview"]')
      tab?.click()
    },
  },
]
