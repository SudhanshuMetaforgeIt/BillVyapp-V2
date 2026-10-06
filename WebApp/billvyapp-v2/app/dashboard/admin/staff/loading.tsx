import { TablePageSkeleton } from '@/components/skeletons';

export default function AdminStaffLoading() {
  return (
    <TablePageSkeleton
      title="Staff Directory"
      subtitle="Manage team members, roles, permissions, and branch assignments"
    />
  );
}
