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

export interface TermPaymentsNotifications {
  pendingCount: number;
}

export interface TermPurchasePaymentNotifications {
  paidCount: number;
}

export interface CommercialPaymentNotifications {
  directorPendingCount: number;
  bankPendingCount: number;
  purchaseApprovedCount: number;
  purchaseReturnedCount: number;
}

export interface NotificationsPayload {
  birthdays: BirthdaysNotifications;
  contracts: ContractsNotifications;
  termPayments: TermPaymentsNotifications;
  termPurchasePayments: TermPurchasePaymentNotifications;
  commercialPayments: CommercialPaymentNotifications;
}

export interface AuthBootstrapPayload {
  permissions: string[];
}

export interface AppBootstrapResponse {
  notifications: NotificationsPayload;
  auth: AuthBootstrapPayload;
}
