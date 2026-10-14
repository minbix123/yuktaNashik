import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]";
import prisma from "../../lib/prisma";
import Head from "next/head";
import Link from "next/link";

export default function PlatformAdminDashboard({ stats }) {
  return (
    <div>
      <Head>
        <title>Platform Admin Dashboard - Yukta Nashik</title>
      </Head>
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Platform Admin Dashboard</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-2">Total Schools</h2>
            <p className="text-4xl font-bold">{stats.totalSchools}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-2">Total Users</h2>
            <p className="text-4xl font-bold">{stats.totalUsers}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-2">Total Students</h2>
            <p className="text-4xl font-bold">{stats.totalStudents}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-2">Total Teachers</h2>
            <p className="text-4xl font-bold">{stats.totalTeachers}</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="space-y-4">
          <Link href="/admin/schools" className="btn btn-primary w-full text-left">
            Manage Schools
          </Link>
          <Link href="/admin/users" className="btn btn-primary w-full text-left">
            Manage Users
          </Link>
          <Link href="/admin/challenges" className="btn btn-primary w-full text-left">
            Manage Challenges
          </Link>
        </div>
      </main>
    </div>
  );
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);

  // Check if user is platform admin
  if (!session || session.user.role !== "PLATFORM_ADMIN") {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  try {
    // Fetch statistics
    const [totalSchools, totalUsers, totalStudents, totalTeachers] = await Promise.all([
      prisma.school.count(),
      prisma.user.count(),
      prisma.studentProfile.count(),
      prisma.teacherProfile.count(),
    ]);

    const stats = {
      totalSchools,
      totalUsers,
      totalStudents,
      totalTeachers,
    };

    return {
      props: {
        stats: JSON.parse(JSON.stringify(stats)),
      },
    };
  } catch (error) {
    console.error("Error fetching platform admin stats:", error);
    return {
      props: {
        stats: {
          totalSchools: 0,
          totalUsers: 0,
          totalStudents: 0,
          totalTeachers: 0,
        },
      },
    };
  }
}