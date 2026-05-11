export interface ReminderNotifier {
  sendReminder(userId: string, text: string): Promise<void>;
}
