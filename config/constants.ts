import { ProjectData, DayPresets } from '../types/index.ts';

// ============================================================================
// SLACK WEBHOOK URLS
// ============================================================================

export const SLACK_ADD_MERGE_REQUEST_WEBHOOK_URL = 'https://hooks.slack.com/triggers/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';
export const SLACK_BULK_REMINDER_WEBHOOK_URL = 'https://hooks.slack.com/triggers/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';
export const SLACK_UPDATE_MERGE_REQUEST_STATUS_WEBHOOK_URL = 'https://hooks.slack.com/triggers/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';

// ============================================================================
// USER EMAIL MAPPINGS
// ============================================================================

export const USERS_EMAILS: Record<string, string> = {
  "mmojica": "mmojica@fullstacklabs.co",
  "pford": "pford@paciolan.com",
  "maiquel.mojica": "mmojica@fullstacklabs.co",
  "adodge": "adodge@paciolan.com",
  "aakhribi": "aakhribi@paciolan.com",
  "cchen": "cchen@paciolan.com",
  "cwong": "cwong@paciolan.com",
  "msaito": "msaito@fullstacklabs.co",
  "esutil": "esutil@fullstacklabs.co",
  "fmagagnin": "fmagagnin@fullstacklabs.co",
};

// ============================================================================
// PROJECT CONFIGURATIONS
// ============================================================================
// 
// Each project can have its own reminder schedule configuration.
// See src/types/reminder.types.ts for full documentation on schedule options.
//
// Available schedule types:
// - 'interval'       : Every X minutes (e.g., every 60 minutes)
// - 'hourly'         : At a specific minute each hour (e.g., at :00)
// - 'daily'          : Once per day at a specific time (e.g., 9:00 AM)
// - 'specific_times' : At specific times each day (e.g., 9:00, 13:00, 17:00)
//
// ============================================================================

export const PROJECTS_DATA: Record<string, ProjectData> = {
  "Slack webooks": {
    enabled: true,
    listId: "F0A40H8F2TC",
    teamId: "T1DMCHP33",
    notificationUserId: "UJT70DFJ6",
    defaultBranch: "master",
    reminderSchedule: {
      enabled: true,
      type: 'hourly',
      timezone: 'America/Los_Angeles',
      activeDays: DayPresets.WEEKDAYS,
      activeWindow: {
        from: '08:00',
        to: '17:00'
      },
      minuteOfHour: 0
    }
  },
  "MauricioMojica-NET-coding-interview": {
    enabled: false,
    listId: "F0A40H8F2TC",
    teamId: "T1DMCHP33",
    notificationUserId: "UJT70DFJ6",
    defaultBranch: "master",
    reminderSchedule: {
      enabled: false,
      type: 'hourly',
      timezone: 'America/Los_Angeles',
      activeDays: DayPresets.WEEKDAYS,
      activeWindow: {
        from: '08:00',
        to: '17:00'
      },
      minuteOfHour: 0
    }
  },
  "usi-module": {
    enabled: true,
    listId: "F0A40H8F2TC",
    teamId: "T1DMCHP33",
    notificationUserId: "UJT70DFJ6",
    defaultBranch: "master",
    reminderSchedule: {
      enabled: true,
      type: 'hourly',
      intervalHours: 4,
      timezone: 'America/Los_Angeles',
      activeDays: DayPresets.WEEKDAYS,
      activeWindow: {
        from: '08:00',
        to: '17:00'
      },
      minuteOfHour: 0
    },
    defaultReviewerEmails: ['mmojica@fullstacklabs.co', 'pford@paciolan.com', 'adodge@paciolan.com', 'aakhribi@paciolan.com']
  }
};

// ============================================================================
// EXAMPLE CONFIGURATIONS (for reference)
// ============================================================================
// 
// Uncomment and modify these to add more projects:
//
// --- EVERY 30 MINUTES ---
// "Project-Interval": {
//   listId: "...",
//   teamId: "...",
//   notificationUserId: "...",
//   defaultBranch: "master",
//   reminderSchedule: {
//     enabled: true,
//     type: 'interval',
//     timezone: 'America/New_York',
//     activeDays: DayPresets.WEEKDAYS,
//     activeWindow: { from: '09:00', to: '18:00' },
//     intervalMinutes: 30
//   }
// },
//
// --- ONCE A DAY ---
// "Project-Daily": {
//   listId: "...",
//   teamId: "...",
//   notificationUserId: "...",
//   defaultBranch: "master",
//   reminderSchedule: {
//     enabled: true,
//     type: 'daily',
//     timezone: 'America/New_York',
//     activeDays: DayPresets.WEEKDAYS,
//     dailyTime: '09:00'
//   }
// },
//
// --- THREE TIMES A DAY ---
// "Project-ThreeTimes": {
//   listId: "...",
//   teamId: "...",
//   notificationUserId: "...",
//   defaultBranch: "master",
//   reminderSchedule: {
//     enabled: true,
//     type: 'specific_times',
//     timezone: 'America/New_York',
//     activeDays: DayPresets.WEEKDAYS,
//     times: ['09:00', '13:00', '17:00']
//   }
// }
// ============================================================================
