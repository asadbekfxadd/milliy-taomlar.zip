import { pageUser } from '@/lib/auth';
import { listEmployees } from '@/lib/employees';
import Employees from '@/components/panel/Employees';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const u = await pageUser('employees', '/admin/employees');
  return <Employees initial={await listEmployees(true)} me={{ id: u.id, role: u.role }} />;
}
