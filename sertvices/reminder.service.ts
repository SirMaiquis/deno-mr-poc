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
/** Project name → timestamp (ms) of last reminder run. Used to enforce "enough time passed" for hourly/daily/specific_times. */
const lastRunByProject = new Map<string, number>();
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
 * Triggers at the specified minute of each hour, respecting intervalHours.
 * Uses last run time per project: runs only if enough time (intervalHours) has passed since last run.
 */
function shouldTriggerHourly(
  projectName: string,
  zonedDate: Date,
  schedule: HourlyScheduleConfig
): boolean {
  const currentMinute = zonedDate.getMinutes();
  const targetMinute = schedule.minuteOfHour;
  const currentHour = zonedDate.getHours();
  const intervalHours = schedule.intervalHours ?? 1;

  if (currentMinute !== targetMinute) {
    console.log(`  Hourly: Current minute ${currentMinute} ≠ target minute ${targetMinute}`);
    return false;
  }

  // Only at interval boundaries (e.g. intervalHours 2 → 0:xx, 2:xx, 4:xx)
  if (currentHour % intervalHours !== 0) {
    console.log(`  Hourly: Hour ${currentHour} is not on interval boundary (every ${intervalHours}h)`);
    return false;
  }

  const now = Date.now();
  const lastRun = lastRunByProject.get(projectName);
  const intervalMs = intervalHours * 60 * 60 * 1000;

  if (lastRun !== undefined && (now - lastRun) < intervalMs) {
    const minutesSince = (now - lastRun) / 1000 / 60;
    console.log(`  Hourly: Last run ${minutesSince.toFixed(0)} min ago, need ${intervalHours}h`);
    return false;
  }

  console.log(`  Hourly: Triggering at ${currentHour}:${String(targetMinute).padStart(2, '0')} (interval ${intervalHours}h)`);
  return true;
}

/**
 * Checks if a DAILY schedule should trigger
 * Triggers once per day at the specified time. Uses last run date per project.
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

  const todayStr = getDateString(zonedDate);
  const lastRun = lastRunByProject.get(projectName);
  if (lastRun !== undefined) {
    const lastRunZoned = getZonedTime(new Date(lastRun), schedule.timezone);
    if (getDateString(lastRunZoned) === todayStr) {
      console.log(`  Daily: Already sent today`);
      return false;
    }
  }

  console.log(`  Daily: Triggering at ${schedule.dailyTime}`);
  return true;
}

/**
 * Checks if a SPECIFIC_TIMES schedule should trigger
 * Triggers at each specified time once per day. Uses last run per project to avoid duplicate sends for the same slot.
 */
function shouldTriggerSpecificTimes(
  projectName: string,
  zonedDate: Date,
  schedule: SpecificTimesScheduleConfig
): boolean {
  const currentMinutes = getMinutesSinceMidnight(zonedDate);
  const todayStr = getDateString(zonedDate);
  const lastRun = lastRunByProject.get(projectName);

  for (const time of schedule.times) {
    const targetMinutes = parseTimeToMinutes(time);

    if (Math.abs(currentMinutes - targetMinutes) <= 0) {
      if (lastRun !== undefined) {
        const lastRunZoned = getZonedTime(new Date(lastRun), schedule.timezone);
        const sameDay = getDateString(lastRunZoned) === todayStr;
        const sameSlot =
          lastRunZoned.getHours() === zonedDate.getHours() &&
          lastRunZoned.getMinutes() === zonedDate.getMinutes();
        if (sameDay && sameSlot) {
          console.log(`  Specific: Already sent for ${time} today`);
          continue;
        }
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
 * Records that a reminder was sent for tracking purposes (last run time per project).
 */
function recordReminderSent(projectName: string, schedule: ReminderScheduleConfig): void {
  if (schedule.type === 'interval') {
    lastReminderTime.set(projectName, Date.now());
    return;
  }
  lastRunByProject.set(projectName, Date.now());
}

/**
 * Logs when the date changes (last run times are kept per project for "enough time passed" checks).
 */
function resetDailyTrackingIfNeeded(): void {
  const today = new Date().toISOString().split('T')[0];
  if (lastCheckDate !== today) {
    console.log(`New day detected (${today})`);
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
