const fs = require('fs')
const path = require('path')
const { createClient } = require('@libsql/client')
const bcrypt = require('bcryptjs')

async function main() {
  const dbPath = path.resolve(__dirname, '..', 'dev.db')
  const dbUrl = process.env.DATABASE_URL || `file:${dbPath}`
  const client = createClient({ url: dbUrl })

  try {
    await client.executeMultiple(
      'PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = ON;'
    )
  } catch {
    // Ignore pragma errors
  }

  // Ensure schema tables exist in dev.db
  const migrationPath = path.resolve(
    __dirname,
    'migrations',
    '20260924171556_init',
    'migration.sql'
  )
  if (fs.existsSync(migrationPath)) {
    const rawSql = fs
      .readFileSync(migrationPath, 'utf8')
      .replace(/CREATE TABLE /g, 'CREATE TABLE IF NOT EXISTS ')
      .replace(/CREATE UNIQUE INDEX /g, 'CREATE UNIQUE INDEX IF NOT EXISTS ')
      .replace(/CREATE INDEX /g, 'CREATE INDEX IF NOT EXISTS ')
    await client.executeMultiple(rawSql)
  }

  const now = new Date().toISOString()
  const passwordHash = await bcrypt.hash('password123', 10)

  // 1. Seed 2 Schools
  const schools = [
    {
      id: 'school-nps-1',
      name: 'Nashik Public School',
      address: 'College Road, Nashik, Maharashtra 422005',
      contactEmail: 'info@nashikpublicschool.edu.in',
      contactPhone: '+91-253-2345678',
    },
    {
      id: 'school-gvm-2',
      name: 'Godavari Vidya Mandir',
      address: 'Panchavati, Nashik, Maharashtra 422003',
      contactEmail: 'contact@godavarividyamandir.edu.in',
      contactPhone: '+91-253-2456789',
    },
  ]

  for (const s of schools) {
    const existing = await client.execute({
      sql: 'SELECT id FROM "School" WHERE name = ? LIMIT 1',
      args: [s.name],
    })
    if (existing.rows.length > 0) {
      s.id = existing.rows[0].id
    } else {
      await client.execute({
        sql: 'INSERT INTO "School" (id, name, address, contactEmail, contactPhone, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [s.id, s.name, s.address, s.contactEmail, s.contactPhone, now, now],
      })
    }
  }

  const npsSchoolId = schools[0].id
  const gvmSchoolId = schools[1].id

  // 2. Seed 6 Users
  const users = [
    {
      id: 'user-admin-1',
      email: 'admin@yuktanashik.org',
      name: 'Rajesh Deshmukh (Platform Admin)',
      role: 'PLATFORM_ADMIN',
      schoolId: null,
    },
    {
      id: 'user-schooladmin-1',
      email: 'schooladmin@yuktanashik.org',
      name: 'Sunita Kulkarni (School Admin)',
      role: 'SCHOOL_ADMIN',
      schoolId: npsSchoolId,
    },
    {
      id: 'user-teacher-1',
      email: 'teacher@yuktanashik.org',
      name: 'Anjali Patil (Teacher)',
      role: 'TEACHER',
      schoolId: npsSchoolId,
    },
    {
      id: 'user-student-1',
      email: 'student@yuktanashik.org',
      name: 'Aarav Joshi (Student)',
      role: 'STUDENT',
      schoolId: npsSchoolId,
    },
    {
      id: 'user-mentor-1',
      email: 'mentor@yuktanashik.org',
      name: 'Dr. Vikram Sawant (Mentor)',
      role: 'MENTOR',
      schoolId: null,
    },
    {
      id: 'user-parent-1',
      email: 'parent@yuktanashik.org',
      name: 'Mahesh Joshi (Parent)',
      role: 'PARENT',
      schoolId: null,
    },
  ]

  for (const u of users) {
    const existing = await client.execute({
      sql: 'SELECT id FROM "User" WHERE email = ? LIMIT 1',
      args: [u.email],
    })
    if (existing.rows.length > 0) {
      u.id = existing.rows[0].id
      await client.execute({
        sql: 'UPDATE "User" SET name = ?, passwordHash = ?, role = ?, schoolId = ?, updatedAt = ? WHERE id = ?',
        args: [u.name, passwordHash, u.role, u.schoolId, now, u.id],
      })
    } else {
      await client.execute({
        sql: 'INSERT INTO "User" (id, email, name, passwordHash, role, schoolId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        args: [u.id, u.email, u.name, passwordHash, u.role, u.schoolId, now, now],
      })
    }
  }

  const teacherUserId = users.find((u) => u.role === 'TEACHER').id
  const studentUserId = users.find((u) => u.role === 'STUDENT').id
  const mentorUserId = users.find((u) => u.role === 'MENTOR').id

  // 3. TeacherProfile & StudentProfile
  let teacherProfileId = 'teacher-profile-1'
  const existingTeacherProfile = await client.execute({
    sql: 'SELECT id FROM "TeacherProfile" WHERE userId = ? LIMIT 1',
    args: [teacherUserId],
  })
  if (existingTeacherProfile.rows.length > 0) {
    teacherProfileId = existingTeacherProfile.rows[0].id
  } else {
    await client.execute({
      sql: 'INSERT INTO "TeacherProfile" (id, userId, schoolId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
      args: [teacherProfileId, teacherUserId, npsSchoolId, now, now],
    })
  }

  let studentProfileId = 'student-profile-1'
  const existingStudentProfile = await client.execute({
    sql: 'SELECT id FROM "StudentProfile" WHERE userId = ? LIMIT 1',
    args: [studentUserId],
  })
  if (existingStudentProfile.rows.length > 0) {
    studentProfileId = existingStudentProfile.rows[0].id
  } else {
    await client.execute({
      sql: 'INSERT INTO "StudentProfile" (id, userId, grade, schoolId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
      args: [studentProfileId, studentUserId, 8, npsSchoolId, now, now],
    })
  }

  // 4. Seed 2 Classes & Enrollment
  const classes = [
    {
      id: 'class-8a-1',
      name: 'Grade 8 Section A',
      grade: 8,
      schoolId: npsSchoolId,
      teacherId: teacherProfileId,
    },
    {
      id: 'class-9b-2',
      name: 'Grade 9 Section B',
      grade: 9,
      schoolId: gvmSchoolId,
      teacherId: teacherProfileId,
    },
  ]

  for (const c of classes) {
    const existing = await client.execute({
      sql: 'SELECT id FROM "Class" WHERE name = ? AND schoolId = ? LIMIT 1',
      args: [c.name, c.schoolId],
    })
    if (existing.rows.length > 0) {
      c.id = existing.rows[0].id
    } else {
      await client.execute({
        sql: 'INSERT INTO "Class" (id, name, grade, schoolId, teacherId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [c.id, c.name, c.grade, c.schoolId, c.teacherId, now, now],
      })
    }
  }

  const class8AId = classes[0].id

  const existingEnrollment = await client.execute({
    sql: 'SELECT id FROM "Enrollment" WHERE studentId = ? AND classId = ? LIMIT 1',
    args: [studentProfileId, class8AId],
  })
  if (existingEnrollment.rows.length === 0) {
    await client.execute({
      sql: 'INSERT INTO "Enrollment" (id, studentId, classId, enrolledAt) VALUES (?, ?, ?, ?)',
      args: ['enrollment-1', studentProfileId, class8AId, now],
    })
  }

  // 5. Seed 6 Skills
  const skills = [
    {
      id: 'skill-problem-solving',
      name: 'Problem Solving',
      description: 'Analyzing complex local community problems and designing actionable solutions.',
    },
    {
      id: 'skill-critical-thinking',
      name: 'Critical Thinking',
      description: 'Evaluating evidence, data, and observations systematically.',
    },
    {
      id: 'skill-creative-design',
      name: 'Creative Design',
      description: 'Prototyping innovative and sustainable engineering or design artifacts.',
    },
    {
      id: 'skill-systems-thinking',
      name: 'Systems Thinking',
      description: 'Understanding how environmental, social, and technical systems interact.',
    },
    {
      id: 'skill-collaboration',
      name: 'Collaboration',
      description: 'Working effectively with peers, mentors, and community stakeholders.',
    },
    {
      id: 'skill-communication',
      name: 'Communication',
      description: 'Presenting findings, reflections, and solutions clearly in English and Marathi.',
    },
  ]

  for (const sk of skills) {
    const existing = await client.execute({
      sql: 'SELECT id FROM "Skill" WHERE name = ? LIMIT 1',
      args: [sk.name],
    })
    if (existing.rows.length > 0) {
      sk.id = existing.rows[0].id
    } else {
      await client.execute({
        sql: 'INSERT INTO "Skill" (id, name, description) VALUES (?, ?, ?)',
        args: [sk.id, sk.name, sk.description],
      })
    }
  }

  // 6. Seed 4 Challenges
  const challenges = [
    {
      id: 'challenge-godavari-1',
      title: 'Godavari River Water Quality Monitor',
      description:
        'Design and build a low-cost sensor prototype to measure pH, turbidity, and dissolved oxygen levels along the Godavari river ghats in Nashik.',
      grade: 8,
      subject: 'Environmental Science',
      classId: class8AId,
      teacherId: teacherProfileId,
      skillIds: [skills[0].id, skills[1].id, skills[3].id],
    },
    {
      id: 'challenge-drip-2',
      title: 'Nashik Smart Drip Irrigation',
      description:
        'Create a soil-moisture triggered drip irrigation controller to help Nashik grape and onion farmers conserve groundwater during dry months.',
      grade: 8,
      subject: 'Agricultural Technology',
      classId: class8AId,
      teacherId: teacherProfileId,
      skillIds: [skills[0].id, skills[2].id, skills[3].id],
    },
    {
      id: 'challenge-solar-3',
      title: 'Solar Powered Cold Storage for Grapes',
      description:
        'Design a passive and solar-assisted cooling chamber model to reduce post-harvest spoilage for small-scale vineyard farmers in Nashik.',
      grade: 9,
      subject: 'Physics & Renewable Energy',
      classId: classes[1].id,
      teacherId: teacherProfileId,
      skillIds: [skills[1].id, skills[2].id, skills[4].id],
    },
    {
      id: 'challenge-waste-4',
      title: 'School Waste Segregation System',
      description:
        'Develop a behavioral and mechanical waste segregation workflow for school campuses and track wet-waste composting output.',
      grade: 8,
      subject: 'Civic Sustainability',
      classId: class8AId,
      teacherId: teacherProfileId,
      skillIds: [skills[3].id, skills[4].id, skills[5].id],
    },
  ]

  for (const ch of challenges) {
    const existing = await client.execute({
      sql: 'SELECT id FROM "Challenge" WHERE title = ? LIMIT 1',
      args: [ch.title],
    })
    if (existing.rows.length > 0) {
      ch.id = existing.rows[0].id
    } else {
      await client.execute({
        sql: 'INSERT INTO "Challenge" (id, title, description, grade, subject, classId, teacherId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [
          ch.id,
          ch.title,
          ch.description,
          ch.grade,
          ch.subject,
          ch.classId,
          ch.teacherId,
          now,
          now,
        ],
      })
    }

    for (const skillId of ch.skillIds) {
      await client.execute({
        sql: 'INSERT OR IGNORE INTO "_ChallengeSkills" ("A", "B") VALUES (?, ?)',
        args: [ch.id, skillId],
      })
    }
  }

  // 7. Seed 2 Projects for the student
  const projects = [
    {
      id: 'project-godavari-1',
      title: 'Godavari Water Sensor Prototype',
      description:
        'Arduino-based turbidity and temperature logger tested near Ramkund and Tapovan on the Godavari river.',
      studentId: studentProfileId,
      challengeId: challenges[0].id,
      status: 'BUILD',
    },
    {
      id: 'project-drip-2',
      title: 'Smart Drip Controller',
      description:
        'Capacitive soil moisture sensor paired with a relay valve tested on a Nashik grapevine test bed.',
      studentId: studentProfileId,
      challengeId: challenges[1].id,
      status: 'REFLECT',
    },
  ]

  for (const p of projects) {
    const existing = await client.execute({
      sql: 'SELECT id FROM "Project" WHERE title = ? AND studentId = ? LIMIT 1',
      args: [p.title, p.studentId],
    })
    if (existing.rows.length > 0) {
      p.id = existing.rows[0].id
    } else {
      await client.execute({
        sql: 'INSERT INTO "Project" (id, title, description, studentId, challengeId, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        args: [
          p.id,
          p.title,
          p.description,
          p.studentId,
          p.challengeId,
          p.status,
          now,
          now,
        ],
      })
    }
  }

  // 8. Seed ProjectIteration, Reflection, SkillEvidence, and Suggestion
  const existingIter = await client.execute({
    sql: 'SELECT id FROM "ProjectIteration" WHERE projectId = ? LIMIT 1',
    args: [projects[0].id],
  })
  if (existingIter.rows.length === 0) {
    await client.execute({
      sql: 'INSERT INTO "ProjectIteration" (id, projectId, details, createdAt) VALUES (?, ?, ?, ?)',
      args: [
        'iteration-1',
        projects[0].id,
        'Iteration 1: Calibrated optical turbidity sensor using water samples collected after monsoon rainfall.',
        now,
      ],
    })
  }

  const existingRefl = await client.execute({
    sql: 'SELECT id FROM "Reflection" WHERE projectId = ? LIMIT 1',
    args: [projects[1].id],
  })
  if (existingRefl.rows.length === 0) {
    await client.execute({
      sql: 'INSERT INTO "Reflection" (id, projectId, content, createdAt) VALUES (?, ?, ?, ?)',
      args: [
        'reflection-1',
        projects[1].id,
        'Switching from resistive to capacitive soil moisture probes prevented corrosion and reduced water usage by 28%.',
        now,
      ],
    })
  }

  const existingEvidence = await client.execute({
    sql: 'SELECT id FROM "SkillEvidence" WHERE studentId = ? LIMIT 1',
    args: [studentProfileId],
  })
  if (existingEvidence.rows.length === 0) {
    await client.execute({
      sql: 'INSERT INTO "SkillEvidence" (id, studentId, skillId, projectId, details, verificationStatus, level, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      args: [
        'evidence-approved-1',
        studentProfileId,
        skills[0].id,
        projects[1].id,
        'Built and field-tested a moisture-controlled drip valve that reduced irrigation waste by 28%.',
        'APPROVED',
        'INTERMEDIATE',
        now,
      ],
    })
    await client.execute({
      sql: 'INSERT INTO "SkillEvidence" (id, studentId, skillId, projectId, details, verificationStatus, level, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      args: [
        'evidence-pending-2',
        studentProfileId,
        skills[1].id,
        projects[0].id,
        'Collected and analyzed 5-day turbidity readings across 3 locations on the Godavari river.',
        'PENDING',
        'BEGINNER',
        now,
      ],
    })
  }

  const existingSuggestion = await client.execute({
    sql: 'SELECT id FROM "Suggestion" WHERE mentorId = ? AND challengeId = ? LIMIT 1',
    args: [mentorUserId, challenges[2].id],
  })
  if (existingSuggestion.rows.length === 0) {
    await client.execute({
      sql: 'INSERT INTO "Suggestion" (id, mentorId, studentId, challengeId, message, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      args: [
        'suggestion-1',
        mentorUserId,
        studentUserId,
        challenges[2].id,
        'Since your Smart Drip Controller went so well, try applying your sensor skills to the Solar Powered Cold Storage challenge next!',
        'PENDING',
        now,
        now,
      ],
    })
  }

  console.log('Seed completed successfully!')
  client.close()
}

main().catch((err) => {
  console.error('Error seeding database:', err)
  process.exit(1)
})
