import { prisma } from "@/lib/prisma";
import { AdminPanel } from "./admin-panel";
import { PageHeader } from "@/components/dashboard/page-header";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Admin Panel | Vihaan ID Print",
  description: "Manage and print ID cards for all schools.",
};

export default async function AdminDashboardPage() {
  const schools = await prisma.school.findMany({
    orderBy: { schoolName: "asc" }
  });

  return (
    <div className="space-y-8 pb-12">
      <PageHeader 
        title="Admin Print Center" 
        description="Select a school to view and print student ID cards in bulk or individually."
      />
      
      <AdminPanel schools={schools} />
    </div>
  );
}
