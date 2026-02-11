/**
 * ============================================================================
 * REMINDER SCHEDULE CONFIGURATION
 * ============================================================================
 * 
 * This module defines the types for configuring reminder schedules.
 * The system supports multiple scheduling strategies to accommodate
 * different team needs.
 * 
 * SCHEDULE TYPES:
 * ---------------
 * 
 * 1. INTERVAL - Send reminders at regular intervals (e.g., every 30 minutes)
 *    Best for: Teams wanting frequent, regular check-ins
 *    Example: Every 60 minutes during work hours
 * 
 * 2. HOURLY - Send reminders at a specific minute each hour (e.g., at :00 or :30)
 *    Best for: Teams wanting predictable hourly reminders
 *    Example: At the top of every hour (9:00, 10:00, 11:00...)
 * 
 * 3. DAILY - Send one reminder per day at a specific time
 *    Best for: Teams wanting a single daily reminder
 *    Example: Every day at 9:00 AM
 * 
 * 4. SPECIFIC_TIMES - Send reminders at specific times each day
 *    Best for: Teams wanting reminders at key moments (standup, after lunch, EOD)
 *    Example: At 9:00, 13:00, and 17:00
 * 
 * TIME CONSTRAINTS:
 * -----------------
 * All schedule types support:
 * - activeDays: Which days of the week to send reminders (1=Mon to 7=Sun)
 * - activeWindow: Time window during which reminders are allowed
 * - timezone: All times are interpreted in this timezone
 * 
 * ============================================================================
 */

/**
 * Available schedule types for reminder configuration
 */
export type ScheduleType = 'interval' | 'hourly' | 'daily' | 'specific_times';

/**
 * Days of the week constants for better readability
 */
export const DaysOfWeek = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 7,
} as const;

/**
 * Common day presets for convenience
 */
export const DayPresets = {
  /** Monday through Friday */
  WEEKDAYS: [1, 2, 3, 4, 5],
  /** Saturday and Sunday */
  WEEKENDS: [6, 7],
  /** All days */
  EVERY_DAY: [1, 2, 3, 4, 5, 6, 7],
} as const;

/**
 * Time window configuration
 * Defines the hours during which reminders can be sent
 */
export interface TimeWindow {
  /** 
   * Start time in "HH:mm" format (24-hour)
   * @example "08:00" for 8:00 AM
   * @example "14:30" for 2:30 PM
   */
  from: string;
  
  /** 
   * End time in "HH:mm" format (24-hour)
   * @example "17:00" for 5:00 PM
   * @example "23:59" for end of day
   */
  to: string;
}

/**
 * Base configuration shared by all schedule types
 */
export interface BaseScheduleConfig {
  /** Whether this schedule is active */
  enabled: boolean;
  
  /** 
   * The type of schedule
   * @see ScheduleType for available options
   */
  type: ScheduleType;
  
  /** 
   * IANA timezone identifier
   * @example "America/New_York"
   * @example "Europe/London"
   * @example "Asia/Tokyo"
   * @see https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
   */
  timezone: string;
  
  /**
   * Days of the week when reminders are active
   * Uses ISO weekday numbers: 1=Monday, 2=Tuesday, ..., 7=Sunday
   * @example [1, 2, 3, 4, 5] for Monday-Friday
   * @example [1, 3, 5] for Monday, Wednesday, Friday only
   */
  activeDays: readonly number[] | number[];
  
  /**
   * Optional time window constraint
   * When set, reminders will only be sent during this time window
   * If not set, reminders can be sent at any time on active days
   */
  activeWindow?: TimeWindow;
}

/**
 * INTERVAL Schedule Configuration
 * 
 * Sends reminders at regular intervals (every X minutes).
 * The interval timer resets after each reminder is sent.
 * 
 * @example
 * // Send reminder every 60 minutes, Mon-Fri, 8AM-5PM
 * {
 *   enabled: true,
 *   type: 'interval',
 *   timezone: 'America/New_York',
 *   activeDays: [1, 2, 3, 4, 5],
 *   activeWindow: { from: '08:00', to: '17:00' },
 *   intervalMinutes: 60
 * }
 */
export interface IntervalScheduleConfig extends BaseScheduleConfig {
  type: 'interval';
  
  /**
   * Number of minutes between reminders
   * @example 30 for every 30 minutes
   * @example 60 for every hour
   * @example 120 for every 2 hours
   */
  intervalMinutes: number;
}

/**
 * HOURLY Schedule Configuration
 * 
 * Sends reminders at a specific minute each hour.
 * Useful for predictable hourly reminders.
 * 
 * @example
 * // Send reminder at the top of every hour, Mon-Fri, 9AM-5PM
 * {
 *   enabled: true,
 *   type: 'hourly',
 *   timezone: 'America/New_York',
 *   activeDays: [1, 2, 3, 4, 5],
 *   activeWindow: { from: '09:00', to: '17:00' },
 *   minuteOfHour: 0
 * }
 * 
 * @example
 * // Send reminder at :30 every hour
 * {
 *   enabled: true,
 *   type: 'hourly',
 *   timezone: 'America/New_York',
 *   activeDays: [1, 2, 3, 4, 5],
 *   minuteOfHour: 30
 * }
 */
export interface HourlyScheduleConfig extends BaseScheduleConfig {
  type: 'hourly';
  
  /**
   * Minute of the hour to send reminder (0-59)
   * @example 0 for top of the hour (9:00, 10:00, 11:00...)
   * @example 30 for half past (9:30, 10:30, 11:30...)
   * @example 15 for quarter past (9:15, 10:15, 11:15...)
   */
  minuteOfHour: number;
   
  /**
   * Number of hours between reminders
   * @example 1 for every hour
   * @example 2 for every 2 hours
   * @example 3 for every 3 hours
   */
  intervalHours?: number;
}

/**
 * DAILY Schedule Configuration
 * 
 * Sends one reminder per day at a specific time.
 * 
 * @example
 * // Send reminder every weekday at 9:00 AM
 * {
 *   enabled: true,
 *   type: 'daily',
 *   timezone: 'America/New_York',
 *   activeDays: [1, 2, 3, 4, 5],
 *   dailyTime: '09:00'
 * }
 * 
 * @example
 * // Send reminder every day at 6:00 PM
 * {
 *   enabled: true,
 *   type: 'daily',
 *   timezone: 'Europe/London',
 *   activeDays: [1, 2, 3, 4, 5, 6, 7],
 *   dailyTime: '18:00'
 * }
 */
export interface DailyScheduleConfig extends BaseScheduleConfig {
  type: 'daily';
  
  /**
   * Time to send the daily reminder in "HH:mm" format (24-hour)
   * @example "09:00" for 9:00 AM
   * @example "14:00" for 2:00 PM
   * @example "17:30" for 5:30 PM
   */
  dailyTime: string;
}

/**
 * SPECIFIC_TIMES Schedule Configuration
 * 
 * Sends reminders at specific times each day.
 * Useful for teams with specific reminder needs (standup, after lunch, EOD).
 * 
 * @example
 * // Send reminders at standup, after lunch, and end of day
 * {
 *   enabled: true,
 *   type: 'specific_times',
 *   timezone: 'America/New_York',
 *   activeDays: [1, 2, 3, 4, 5],
 *   times: ['09:00', '13:00', '17:00']
 * }
 * 
 * @example
 * // Send reminders twice a day
 * {
 *   enabled: true,
 *   type: 'specific_times',
 *   timezone: 'Asia/Tokyo',
 *   activeDays: [1, 2, 3, 4, 5],
 *   times: ['10:00', '15:00']
 * }
 */
export interface SpecificTimesScheduleConfig extends BaseScheduleConfig {
  type: 'specific_times';
  
  /**
   * Array of times to send reminders in "HH:mm" format (24-hour)
   * Times should be in chronological order for best results
   * @example ['09:00', '13:00', '17:00']
   * @example ['10:00', '14:00']
   */
  times: string[];
}

/**
 * Union type of all schedule configurations
 */
export type ReminderScheduleConfig = 
  | IntervalScheduleConfig 
  | HourlyScheduleConfig 
  | DailyScheduleConfig 
  | SpecificTimesScheduleConfig;

/**
 * Project data configuration including reminder schedule
 */
export interface ProjectData {
  /** Whether the project is enabled */
  enabled: boolean;
  
  /** Slack list ID for the project */
  listId: string;
  
  /** Slack team/workspace ID */
  teamId: string;
  
  /** User ID to notify */
  notificationUserId: string;
  
  /** Default branch for MR tracking */
  defaultBranch: string;
  
  /** Reminder schedule configuration */
  reminderSchedule: ReminderScheduleConfig;

  //** Default reviewer emails */
  defaultReviewerEmails?: string[];
}

/**
 * ============================================================================
 * CONFIGURATION EXAMPLES
 * ============================================================================
 * 
 * Here are some common configuration patterns:
 * 
 * --- EVERY HOUR DURING WORK HOURS (Mon-Fri, 8-5) ---
 * {
 *   enabled: true,
 *   type: 'hourly',
 *   timezone: 'America/New_York',
 *   activeDays: [1, 2, 3, 4, 5],
 *   activeWindow: { from: '08:00', to: '17:00' },
 *   minuteOfHour: 0
 * }
 * 
 * --- ONCE A DAY AT 9 AM ---
 * {
 *   enabled: true,
 *   type: 'daily',
 *   timezone: 'America/New_York',
 *   activeDays: [1, 2, 3, 4, 5],
 *   dailyTime: '09:00'
 * }
 * 
 * --- EVERY 30 MINUTES ---
 * {
 *   enabled: true,
 *   type: 'interval',
 *   timezone: 'America/New_York',
 *   activeDays: [1, 2, 3, 4, 5],
 *   activeWindow: { from: '09:00', to: '18:00' },
 *   intervalMinutes: 30
 * }
 * 
 * --- THREE TIMES A DAY (standup, after lunch, EOD) ---
 * {
 *   enabled: true,
 *   type: 'specific_times',
 *   timezone: 'America/New_York',
 *   activeDays: [1, 2, 3, 4, 5],
 *   times: ['09:00', '13:00', '17:00']
 * }
 * 
 * --- EVERY 2 HOURS ON WEEKENDS ---
 * {
 *   enabled: true,
 *   type: 'interval',
 *   timezone: 'America/Los_Angeles',
 *   activeDays: [6, 7],
 *   activeWindow: { from: '10:00', to: '18:00' },
 *   intervalMinutes: 120
 * }
 * 
 * ============================================================================
 */

// Legacy type alias for backwards compatibility
/** @deprecated Use ReminderScheduleConfig instead */
export type ReminderSchedule = ReminderScheduleConfig;
