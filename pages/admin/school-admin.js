import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]";
import prisma from "../../lib/prisma";
import Head from "next/head";
import Link from "next/link";

export default function SchoolAdminDashboard({ school, stats }) {
  return (
    <div>
      <Head>
        <title>School Admin Dashboard - Yukta Nashik</title>
      </Head>
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">School Admin Dashboard</h1>
        {school ? (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Managing School: {school.name}</h2>
            <p className="text-gray-600">{school.address}</p>
          </div>
        ) : (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6">
            <p className="font-bold">Error: School not found or not assigned</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-2">Total Students</h2>
            <p className="text-4xl font-bold">{stats.totalStudents}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-2">Total Teachers</h2>
            <p className="text-4xl font-bold">{stats.totalTeachers}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-2">Total Classes</h2>
            <p className="text-4xl font-bold">{stats.totalClasses}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-2">Total Projects</h2>
            <p className="text-4xl font-bold">{stats.totalProjects}</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="space-y-4">
          <Link href="/admin/schools/edit" className="btn btn-primary w-full text-left">
            Edit School Details
          </Link>
          <Link href="/admin/users" className="btn btn-primary w-full text-left">
            Manage Users in School
          </Link>
          <Link href="/admin/classes" className="btn btn-primary w-full text-left">
            Manage Classes
          </Link>
        </div>
      </main>
    </div>
  );
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);

  // Check if user is school admin
  if (!session || session.user.role !== "SCHOOL_ADMIN") {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  try {
    // We assume that the school admin has a schoolId in their user record
    // We will need to add schoolId to the User model for school admins
    const schoolId = session.user.schoolId; // This will be undefined until we add the field

    if (!schoolId) {
      return {
        props: {
          school: null,
          stats: {
            totalStudents: 0,
            totalTeachers: 0,
            totalClasses: 0,
            totalProjects: 0,
          },
        },
      };
    }

    const [school, totalStudents, totalTeachers, totalClasses, totalProjects] = await Promise.all([
      prisma.school.findUnique({
        where: { id: schoolId },
      }),
      prisma.studentProfile.count({ where: { schoolId } }),
      prisma.teacherProfile.count({ where: { schoolId } }),
      prisma.class.count({ where: { schoolId } }),
      // For total projects, we need to count projects of students in this school
      prisma.project.count({
        where: {
          student: {
            schoolId,
          },
        },
      }),
    ]);

    const stats = {
      totalStudents: totalStudents || 0,
      totalTeachers: totalTeachers || 0,
      totalClasses: totalClasses || 0,
      totalProjects: totalProjects || 0,
    };

    return {
      props: {
        school: school ? JSON.parse(JSON.stringify(school)) : null,
        stats: JSON.parse(JSON.stringify(stats)),
      },
    };
  } catch (error) {
    console.error("Error fetching school admin stats:", error);
    return {
      props: {
        school: null,
        stats: {
          totalStudents: 0,
          totalTeachers: 0,
          totalClasses: 0,
          totalProjects: 0,
        },
      },
    };
  }
}