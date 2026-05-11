export interface ReminderNotifier {
  sendReminder(dto: SendReminderDto): Promise<void>;
}

export interface SendReminderDto {
  userId: string;
  text: string;
}
