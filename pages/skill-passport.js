import { useSession, signIn } from "next-auth/react"
import { useCallback, useEffect, useState } from "react"
import Layout from "../components/layout"

export default function SkillPassport() {
  const { data: session, status } = useSession()
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchSkills = useCallback(async () => {
    if (status === "loading") return
    if (status === "unauthenticated" || !session) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [studentRes, evidenceRes, skillsRes] = await Promise.all([
        fetch('/api/students/me'),
        fetch('/api/skill-evidence?studentId=' + session.user.id),
        fetch('/api/skills'),
      ])

      if (studentRes.ok) {
        await studentRes.json().catch(() => null)
      }
      if (!skillsRes.ok) throw new Error("Failed to fetch skills")

      const evidenceData = evidenceRes.ok ? await evidenceRes.json() : { evidence: [] }
      const evidence = Array.isArray(evidenceData) ? evidenceData : (evidenceData.evidence || [])

      const skillsData = await skillsRes.json()
      const allSkills = Array.isArray(skillsData) ? skillsData : (skillsData.skills || [])

      // Group evidence by skill
      const evidenceBySkill = {}
      evidence.forEach((e) => {
        if (!evidenceBySkill[e.skillId]) {
          evidenceBySkill[e.skillId] = []
        }
        evidenceBySkill[e.skillId].push(e)
      })

      // Build skills array with evidence
      const skillsWithEvidence = allSkills.map((skill) => ({
        ...skill,
        evidence: evidenceBySkill[skill.id] || [],
      }))

      setSkills(skillsWithEvidence)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [session, status])

  useEffect(() => {
    Promise.resolve().then(() => fetchSkills())
  }, [fetchSkills, session, status])

  if (status === "loading") {
    return <Layout><p>Loading...</p></Layout>
  }

  if (!session) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600 mb-8">Please sign in to view your skill passport</p>
          <button onClick={() => signIn()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Sign in
          </button>
        </div>
      </Layout>
    )
  }

  if (loading) return <Layout><p>Loading skill passport...</p></Layout>

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Your Skill Passport</h1>
        {skills.length === 0 ? (
          <p className="text-center text-gray-500">No skill evidence yet. Start a challenge to begin building your skills.</p>
        ) : (
          <div className="space-y-6">
            {skills.map((skill) => (
              <div key={skill.id} className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">{skill.name}</h2>
                <p className="text-gray-600 mb-4">{skill.description}</p>
                {skill.evidence.length === 0 ? (
                  <p className="text-gray-500">No evidence yet for this skill.</p>
                ) : (
                  <div className="space-y-4">
                    {skill.evidence.map((ev, index) => (
                      <div key={index} className="border-l-4 border-blue-500 pl-4">
                        <p className="text-gray-700">{ev.details}</p>
                        {ev.project && (
                          <p className="text-sm text-gray-500 mt-2">
                            From project: {ev.project.title}
                          </p>
                        )}
                        <p className="text-sm text-gray-500 mt-1">
                          Verification: {ev.verificationStatus} | Level: {ev.level}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(ev.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}