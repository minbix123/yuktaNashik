import { useSession, signIn } from "next-auth/react"
import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/router"
import Layout from "../../../components/layout"

const STAGES = ["LEARN", "INVESTIGATE", "DESIGN", "BUILD", "TEST", "FAIL", "IMPROVE", "EXPLAIN", "REFLECT", "EARN_SKILL_EVIDENCE"];

const STAGE_INFO = {
  LEARN: { description: "Understand the challenge and gather initial knowledge.", resources: [] },
  INVESTIGATE: { description: "Research and explore possible solutions.", resources: [] },
  DESIGN: { description: "Plan your approach and design your solution.", resources: [] },
  BUILD: { description: "Create a prototype or build your solution.", resources: [] },
  TEST: { description: "Test your solution and gather feedback.", resources: [] },
  FAIL: { description: "Analyze what didn't work and learn from failures.", resources: [] },
  IMPROVE: { description: "Iterate and improve based on test results and feedback.", resources: [] },
  EXPLAIN: { description: "Document and explain your solution and learning process.", resources: [] },
  REFLECT: { description: "Reflect on the overall experience and outcomes.", resources: [] },
  EARN_SKILL_EVIDENCE: { description: "Submit your work to earn skill evidence.", resources: [] },
};

export default function ProjectWorkflow() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const { id: projectId } = router.query
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState("LEARN")

  const fetchProject = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}`)
      if (!res.ok) throw new Error("Failed to fetch project")
      const data = await res.json()
      setProject(data)
      setStatus(data.status || "LEARN")
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    Promise.resolve().then(() => fetchProject())
  }, [fetchProject])

  async function handleStatusChange() {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error("Failed to update status")
      const updatedProject = await res.json()
      setProject(updatedProject)
    } catch (error) {
      console.error(error)
      alert("Failed to update status")
    }
  }

  if (sessionStatus === "loading") return <Layout><p>Loading...</p></Layout>
  if (!session) return (
    <Layout>
      <div className="text-center py-12">
        <p className="text-gray-600 mb-8">Please sign in to access this page</p>
        <button onClick={() => signIn()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Sign in
        </button>
      </div>
    </Layout>
  )
  if (loading || !project) return <Layout><p>Loading project...</p></Layout>

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">{project.title}</h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Project Stages</h2>
          <p className="text-gray-600">Current status: {status}</p>
          <div className="mb-4">
            <label htmlFor="project-stage" className="block text-sm font-medium text-gray-700 mb-2">Stage</label>
            <select
              id="project-stage"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">About this stage:</h3>
            <p className="text-gray-600">{(STAGE_INFO[status] || STAGE_INFO.LEARN).description}</p>
          </div>
          <button
            onClick={handleStatusChange}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Update Stage
          </button>
        </div>
      </div>
    </Layout>
  )
}