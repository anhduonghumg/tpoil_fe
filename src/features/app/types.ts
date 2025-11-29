export interface BirthdayItem {
  id: string;
  fullName: string;
  dob: string;
}

export interface BirthdaysNotifications {
  month: number;
  count: number;
  items: BirthdayItem[];
}

export interface ContractsNotifications {
  expiringCount: number;
  expiredCount: number;
}

export interface NotificationsPayload {
  birthdays: BirthdaysNotifications;
  contracts: ContractsNotifications;
}

export interface AppBootstrapResponse {
  notifications: NotificationsPayload;
}
