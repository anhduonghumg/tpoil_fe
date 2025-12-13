export type EmploymentStatus =
  | "active"
  | "inactive"
  | "suspended"
  | "probation"
  | "terminated";
export type IdentityDocType = "CCCD" | "CMND" | "PASSPORT";

export type Address = {
  province?: string;
  district?: string;
  ward?: string;
  street?: string;
};

export type EmergencyContact = {
  name: string;
  relation?: string;
  phone: string;
};

export type CitizenDoc = {
  type: IdentityDocType;
  number: string;
  issuedDate?: string;
  issuedPlace?: string;
  expiryDate?: string;
  frontImageUrl?: string;
  backImageUrl?: string;
};

export type Banking = {
  bankName?: string;
  branch?: string;
  accountNumber?: string;
  accountHolder?: string;
};

export type InsuranceTax = {
  pitCode?: string;
  siNumber?: string;
  hiNumber?: string;
};

export type User = {
  id: string;
  code?: string;
  fullName: string;
  gender?: "male" | "female" | "other";
  dob: string;
  nationality?: string;
  maritalStatus?: "single" | "married" | "divorced" | "widowed";
  avatarUrl?: string;

  citizen?: CitizenDoc;

  workEmail: string;
  personalEmail?: string;
  phone: string;
  addressPermanent?: Address;
  addressTemp?: Address;
  emergency?: EmergencyContact;

  departmentId?: string;
  departmentName?: string;
  title?: string;
  grade?: string;
  status: EmploymentStatus;
  joinedAt: string;
  leftAt?: string;
  managerId?: string;
  managerName?: string;

  siteId?: string;
  floor?: string;
  area?: string;
  desk?: string;
  accessCard?: string;

  tax?: InsuranceTax;
  banking?: Banking;

  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
};

export type Employee = User & {
  memberships: Array<{
    departmentId: string;
    departmentName: string;
  }>;
};

export type Birthday = {
  count: number;
  items: BirthdayItem[];
  month: number;
};
export type BirthdayItem = {
  id: string;
  fullName: string;
  dob: string;
};

export type Paged<T> = { items: T[]; total: number };
