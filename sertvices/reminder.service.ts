import { 
  ReminderScheduleConfig, 
  IntervalScheduleConfig,
  HourlyScheduleConfig,
  DailyScheduleConfig,
  SpecificTimesScheduleConfig,
  TimeWindow,
  BulkReminderPayload 
} from '../types/index.ts';
import { PROJECTS_DATA } from '../config/constants.ts';
import { TriggerTypes } from "deno-slack-api/mod.ts";

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const lastReminderTime = new Map<string, number>();
const sentTimesToday = new Map<string, Set<string>>();
let lastCheckDate: string | null = null;

// ============================================================================
// TIME UTILITIES
// ============================================================================

/**
 * Converts a Date to the specified timezone
 */
function getZonedTime(date: Date, timezone: string): Date {
  return new Date(date.toLocaleString('en-US', { timeZone: timezone }));
}

/**
 * Gets the current time in minutes since midnight
 */
function getMinutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Parses a time string "HH:mm" to minutes since midnight
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Gets the ISO weekday (1=Monday to 7=Sunday) from a Date
 */
function getISOWeekday(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day; // Convert Sunday from 0 to 7
}

/**
 * Formats current time for logging
 */
function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * Gets the date string (YYYY-MM-DD) for a zoned date
 */
function getDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Checks if the current day is an active day
 */
function isActiveDay(zonedDate: Date, activeDays: number[]): boolean {
  const weekday = getISOWeekday(zonedDate);
  const isActive = activeDays.includes(weekday);
  
  if (!isActive) {
    const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    console.log(`  Day check: ${dayNames[weekday]} is not in active days [${activeDays.join(', ')}]`);
  }
  
  return isActive;
}

/**
 * Checks if the current time is within the active window
 */
function isWithinActiveWindow(zonedDate: Date, window?: TimeWindow): boolean {
  if (!window) {
    return true; // No window restriction
  }
  
  const currentMinutes = getMinutesSinceMidnight(zonedDate);
  const fromMinutes = parseTimeToMinutes(window.from);
  const toMinutes = parseTimeToMinutes(window.to);
  
  const isWithin = currentMinutes >= fromMinutes && currentMinutes <= toMinutes;
  
  if (!isWithin) {
    console.log(`  Window check: ${formatTime(zonedDate)} is outside ${window.from}-${window.to}`);
  }
  
  return isWithin;
}

/**
 * Validates base schedule conditions (active day and window)
 */
function validateBaseConditions(zonedDate: Date, schedule: ReminderScheduleConfig): boolean {
  if (!isActiveDay(zonedDate, Array.from(schedule.activeDays))) {
    return false;
  }
  
  if (!isWithinActiveWindow(zonedDate, schedule.activeWindow)) {
    return false;
  }
  
  return true;
}

// ============================================================================
// SCHEDULE TYPE HANDLERS
// ============================================================================

/**
 * Checks if an INTERVAL schedule should trigger
 * Triggers if enough time has passed since the last reminder
 */
function shouldTriggerInterval(
  projectName: string, 
  schedule: IntervalScheduleConfig
): boolean {
  const now = Date.now();
  const lastTime = lastReminderTime.get(projectName);
  
  if (!lastTime) {
    console.log(`  Interval: First reminder for ${projectName}`);
    return true;
  }
  
  const minutesSinceLast = (now - lastTime) / 1000 / 60;
  
  if (minutesSinceLast >= schedule.intervalMinutes) {
    console.log(`  Interval: ${minutesSinceLast.toFixed(1)} minutes passed (threshold: ${schedule.intervalMinutes})`);
    return true;
  }
  
  const remaining = (schedule.intervalMinutes - minutesSinceLast).toFixed(1);
  console.log(`  Interval: ${remaining} minutes until next reminder`);
  return false;
}

/**
 * Checks if an HOURLY schedule should trigger
 * Triggers at the specified minute of each hour
 */
function shouldTriggerHourly(
  projectName: string,
  zonedDate: Date, 
  schedule: HourlyScheduleConfig
): boolean {
  const currentMinute = zonedDate.getMinutes();
  const targetMinute = schedule.minuteOfHour;
  
  if (currentMinute !== targetMinute) {
    console.log(`  Hourly: Current minute ${currentMinute} ≠ target minute ${targetMinute}`);
    return false;
  }
  
  const hourKey = `${projectName}:hourly:${zonedDate.getHours()}`;
  const dateStr = getDateString(zonedDate);
  const sentTimes = sentTimesToday.get(dateStr) || new Set();
  
  if (sentTimes.has(hourKey)) {
    console.log(`  Hourly: Already sent for hour ${zonedDate.getHours()}`);
    return false;
  }
  
  console.log(`  Hourly: Triggering at :${String(targetMinute).padStart(2, '0')}`);
  return true;
}

/**
 * Checks if a DAILY schedule should trigger
 * Triggers once per day at the specified time
 */
function shouldTriggerDaily(
  projectName: string,
  zonedDate: Date, 
  schedule: DailyScheduleConfig
): boolean {
  const currentMinutes = getMinutesSinceMidnight(zonedDate);
  const targetMinutes = parseTimeToMinutes(schedule.dailyTime);
  
  if (Math.abs(currentMinutes - targetMinutes) > 0) {
    const currentTime = formatTime(zonedDate);
    console.log(`  Daily: Current time ${currentTime} ≠ target time ${schedule.dailyTime}`);
    return false;
  }
  
  const dateStr = getDateString(zonedDate);
  const dailyKey = `${projectName}:daily`;
  const sentTimes = sentTimesToday.get(dateStr) || new Set();
  
  if (sentTimes.has(dailyKey)) {
    console.log(`  Daily: Already sent today`);
    return false;
  }
  
  console.log(`  Daily: Triggering at ${schedule.dailyTime}`);
  return true;
}

/**
 * Checks if a SPECIFIC_TIMES schedule should trigger
 * Triggers at each specified time once per day
 */
function shouldTriggerSpecificTimes(
  projectName: string,
  zonedDate: Date, 
  schedule: SpecificTimesScheduleConfig
): boolean {
  const currentMinutes = getMinutesSinceMidnight(zonedDate);
  const dateStr = getDateString(zonedDate);
  const sentTimes = sentTimesToday.get(dateStr) || new Set();
  
  for (const time of schedule.times) {
    const targetMinutes = parseTimeToMinutes(time);
    
    if (Math.abs(currentMinutes - targetMinutes) <= 0) {
      const timeKey = `${projectName}:specific:${time}`;
      
      if (sentTimes.has(timeKey)) {
        console.log(`  Specific: Already sent for ${time} today`);
        continue;
      }
      
      console.log(`  Specific: Triggering at ${time}`);
      return true;
    }
  }
  
  const currentTime = formatTime(zonedDate);
  console.log(`  Specific: Current time ${currentTime} doesn't match any of [${schedule.times.join(', ')}]`);
  return false;
}

// ============================================================================
// MAIN SCHEDULE CHECKER
// ============================================================================

/**
 * Determines if a reminder should be sent based on the schedule configuration
 * @param projectName - Name of the project (for state tracking)
 * @param schedule - The schedule configuration
 * @returns Whether a reminder should be sent
 */
export function shouldSendReminder(projectName: string, schedule: ReminderScheduleConfig): boolean {
  try {
    const now = new Date();
    const zonedDate = getZonedTime(now, schedule.timezone);
    
    console.log(`Checking schedule for ${projectName} (${schedule.type})`);
    console.log(`  Current time: ${formatTime(zonedDate)} ${schedule.timezone}`);
    
    if (!validateBaseConditions(zonedDate, schedule)) {
      return false;
    }
    
    switch (schedule.type) {
      case 'interval':
        return shouldTriggerInterval(projectName, schedule);
      
      case 'hourly':
        return shouldTriggerHourly(projectName, zonedDate, schedule);
      
      case 'daily':
        return shouldTriggerDaily(projectName, zonedDate, schedule);
      
      case 'specific_times':
        return shouldTriggerSpecificTimes(projectName, zonedDate, schedule);
      
      default:
        console.error(`  Unknown schedule type: ${(schedule as any).type}`);
        return false;
    }
  } catch (error) {
    console.error(`Error checking reminder schedule for ${projectName}:`, error);
    return false;
  }
}

/**
 * Records that a reminder was sent for tracking purposes
 */
function recordReminderSent(projectName: string, schedule: ReminderScheduleConfig): void {
  const now = new Date();
  const zonedDate = getZonedTime(now, schedule.timezone);
  const dateStr = getDateString(zonedDate);
  
  if (schedule.type === 'interval') {
    lastReminderTime.set(projectName, Date.now());
    return;
  }
  
  let sentTimes = sentTimesToday.get(dateStr);
  if (!sentTimes) {
    sentTimes = new Set();
    sentTimesToday.set(dateStr, sentTimes);
  }
  
  switch (schedule.type) {
    case 'hourly':
      sentTimes.add(`${projectName}:hourly:${zonedDate.getHours()}`);
      break;
    
    case 'daily':
      sentTimes.add(`${projectName}:daily`);
      break;
    
    case 'specific_times': {
      const currentTime = formatTime(zonedDate);
      for (const time of schedule.times) {
        const currentMinutes = getMinutesSinceMidnight(zonedDate);
        const targetMinutes = parseTimeToMinutes(time);
        if (Math.abs(currentMinutes - targetMinutes) <= 0) {
          sentTimes.add(`${projectName}:specific:${time}`);
          break;
        }
      }
      break;
    }
  }
}

/**
 * Resets daily tracking when the date changes
 */
function resetDailyTrackingIfNeeded(): void {
  const today = new Date().toISOString().split('T')[0];
  
  if (lastCheckDate !== today) {
    console.log(`New day detected (${today}), resetting daily tracking`);
    sentTimesToday.clear();
    lastCheckDate = today;
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Checks all projects and sends reminders if needed
 */
export async function checkAndSendReminders(slackClient: any): Promise<void> {
  console.log('\n========================================');
  console.log('Checking reminder schedules...');
  console.log('========================================');
  
  resetDailyTrackingIfNeeded();
  
  for (const [projectName, projectData] of Object.entries(PROJECTS_DATA)) {
    if (!projectData.reminderSchedule.enabled) {
      console.log(`${projectName}: Disabled, skipping`);
      continue;
    }
    
    const schedule = projectData.reminderSchedule;
    
    if (!shouldSendReminder(projectName, schedule)) {
      console.log(`${projectName}: No reminder needed at this time\n`);
      continue;
    }
    
    console.log(`${projectName}: Sending bulk reminder...`);
    
    const bulkReminderPayload: BulkReminderPayload = {
      list_id: projectData.listId,
      team_id: projectData.teamId
    };
    
    try {
      await sendBulkReminderToSlack(slackClient, bulkReminderPayload);
      recordReminderSent(projectName, schedule);
      console.log(`${projectName}: ✓ Reminder sent successfully\n`);
    } catch (error) {
      console.error(`${projectName}: ✗ Failed to send reminder`, error);
    }
  }
  
  console.log('========================================\n');
}

  /**
 * Sends a bulk reminder to Slack
 */
async function sendBulkReminderToSlack(slackClient: any, bulkReminderPayload: BulkReminderPayload): Promise<void> {
  const scheduleDate = new Date();
  scheduleDate.setSeconds(scheduleDate.getSeconds() + 10);
  const randomString = Math.random().toString(36).substring(2, 15);
  const scheduledTrigger = await slackClient.workflows.triggers.create({
    name: `Bulk Post MR List Reminders ${randomString}`,
    type: TriggerTypes.Scheduled,
    workflow: `#/workflows/mr_list_bulk_post_reminders_workflow`,
    inputs: {
      list_id: { value: bulkReminderPayload.list_id },
      team_id: { value: bulkReminderPayload.team_id },
    },
    schedule: {
      start_time: scheduleDate.toISOString(),
      timezone: "America/Los_Angeles",
      frequency: {
        type: "once",
      },
    },
  });
  if (!scheduledTrigger || !scheduledTrigger.ok) {
    throw new Error('Failed to create scheduled trigger');
  }
  console.log('Successfully created scheduled trigger', scheduledTrigger);
}
