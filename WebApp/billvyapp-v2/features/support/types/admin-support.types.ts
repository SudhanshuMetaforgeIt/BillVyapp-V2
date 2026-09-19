export type AdminTicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';

export interface AdminSupportTicket {
  id: string;
  ticketNumber: string; // e.g. '#TKT-1024'
  subject: string;
  fullName: string;
  email: string;
  message: string;
  status: AdminTicketStatus;
  createdAt: string;
  lastUpdated: string;
}

export interface ContactSupportPayload {
  fullName: string;
  email: string;
  subject: string;
  message: string;
}
