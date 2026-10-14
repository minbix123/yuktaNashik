const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^\+?[0-9][0-9\s().-]{6,19}$/

export const ROLES = [
  "STUDENT",
  "TEACHER",
  "SCHOOL_ADMIN",
  "PLATFORM_ADMIN",
  "MENTOR",
  "PARENT",
]

export const validationMessages = {
  required: {
    en: "This field is required.",
    mr: "हे क्षेत्र आवश्यक आहे.",
  },
  invalidEmail: {
    en: "Enter a valid email address.",
    mr: "कृपया वैध ईमेल पत्ता प्रविष्ट करा.",
  },
  invalidPhone: {
    en: "Enter a valid phone number.",
    mr: "कृपया वैध दूरध्वनी क्रमांक प्रविष्ट करा.",
  },
  invalidNumber: {
    en: "Enter a valid number.",
    mr: "कृपया वैध संख्या प्रविष्ट करा.",
  },
  invalidInteger: {
    en: "Enter a whole number.",
    mr: "कृपया पूर्ण संख्या प्रविष्ट करा.",
  },
  invalidChoice: {
    en: "Select a valid option.",
    mr: "कृपया वैध पर्याय निवडा.",
  },
  invalidId: {
    en: "Select a valid record.",
    mr: "कृपया वैध नोंद निवडा.",
  },
  invalidArray: {
    en: "Provide at least one item.",
    mr: "कृपया किमान एक घटक द्या.",
  },
  tooShort: (min) => ({
    en: `Enter at least ${min} characters.`,
    mr: `किमान ${min} अक्षरे प्रविष्ट करा.`,
  }),
  tooLong: (max) => ({
    en: `Use ${max} characters or fewer.`,
    mr: `${max} किंवा त्यापेक्षा कमी अक्षरे वापरा.`,
  }),
  outOfRange: (min, max) => ({
    en: `Enter a value between ${min} and ${max}.`,
    mr: `${min} ते ${max} दरम्यान मूल्य प्रविष्ट करा.`,
  }),
  password: {
    en: "Password must be 8–128 characters and include a letter and a number.",
    mr: "पासवर्ड ८–१२८ अक्षरांचा असून त्यात किमान एक अक्षर आणि एक संख्या असावी.",
  },
  duplicate: {
    en: "This record already exists.",
    mr: "ही नोंद आधीपासून अस्तित्वात आहे.",
  },
}

const isBlank = (value) => value === undefined || value === null || (typeof value === "string" && value.trim() === "")
const textRule = (options = {}) => ({
  ...options,
  type: "text",
})

const numberRule = (options = {}) => ({
  ...options,
  type: "number",
})

const idRule = (options = {}) => ({
  ...options,
  type: "id",
})

export const validationSchemas = {
  challenge: {
    title: textRule({ required: true, min: 3, max: 120 }),
    description: textRule({ required: true, min: 10, max: 5000 }),
    grade: numberRule({ required: true, min: 1, max: 12, integer: true }),
    subject: textRule({ required: true, min: 2, max: 100 }),
    classId: { required: false, type: "string" },
  },
  school: {
    name: textRule({ required: true, min: 2, max: 150 }),
    address: textRule({ max: 500 }),
    contactEmail: textRule({ email: true, max: 254 }),
    contactPhone: textRule({ phone: true, max: 20 }),
  },
  user: {
    name: textRule({ required: true, min: 2, max: 100 }),
    email: textRule({ required: true, email: true, max: 254 }),
    role: textRule({ required: true, enum: ROLES }),
    password: textRule({ password: true, max: 128 }),
    schoolId: idRule({ required: false }),
  },
  userCreate: {
    name: textRule({ required: true, min: 2, max: 100 }),
    email: textRule({ required: true, email: true, max: 254 }),
    role: textRule({ required: true, enum: ROLES }),
    password: textRule({ required: true, password: true, max: 128 }),
    schoolId: idRule({ required: false }),
  },
  class: {
    name: textRule({ required: true, min: 2, max: 100 }),
    grade: numberRule({ required: true, min: 1, max: 12, integer: true }),
    schoolId: idRule({ required: true }),
    teacherId: idRule({}),
  },
  enrollment: {
    studentId: idRule({ required: true }),
    classId: idRule({ required: true }),
  },
  bulkEnrollment: {
    classId: idRule({ required: true }),
    studentIds: {
      required: true,
      type: "array",
      min: 1,
      max: 100,
      item: idRule({ required: true }),
    },
  },
  profile: {
    name: textRule({ required: true, min: 2, max: 100 }),
    email: textRule({ required: true, email: true, max: 254 }),
    phoneNumber: textRule({ phone: true, max: 20 }),
    address: textRule({ max: 500 }),
  },
  teacherProfile: {
    name: textRule({ min: 2, max: 100 }),
    email: textRule({ email: true, max: 254 }),
    bio: textRule({ max: 2000 }),
    subjectSpecialization: textRule({ max: 200 }),
    phoneNumber: textRule({ phone: true, max: 20 }),
    address: textRule({ max: 500 }),
  },
  mentorProfile: {
    name: textRule({ min: 2, max: 100 }),
    email: textRule({ email: true, max: 254 }),
    bio: textRule({ max: 2000 }),
    expertiseAreas: {
      type: "array",
      max: 20,
      item: textRule({ min: 2, max: 100 }),
    },
    availability: { type: "object" },
  },
  studentProfile: {
    name: textRule({ required: true, min: 2, max: 100 }),
    email: textRule({ required: true, email: true, max: 254 }),
    grade: numberRule({ min: 1, max: 12, integer: true }),
  },
  project: {
    challengeId: idRule({ required: true }),
    studentId: idRule({ required: true }),
  },
  projectUpdate: {
    status: textRule({ enum: ["LEARN", "INVESTIGATE", "DESIGN", "BUILD", "TEST", "FAIL", "IMPROVE", "EXPLAIN", "REFLECT", "EARN_SKILL_EVIDENCE"] }),
    reflection: textRule({ max: 5000 }),
    evidenceDetails: textRule({ max: 5000 }),
  },
  skillEvidence: {
    studentId: idRule({ required: true }),
    skillId: idRule({ required: true }),
    details: textRule({ required: true, min: 2, max: 5000 }),
    projectId: idRule({}),
    reflectionId: idRule({}),
  },
  skillEvidenceUpdate: {
    id: idRule({ required: false }),
    details: textRule({ max: 5000 }),
    verificationStatus: textRule({ enum: ["PENDING", "APPROVED", "REJECTED"] }),
    level: textRule({ enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] }),
  },
  suggestion: {
    challengeId: idRule({ required: true }),
    studentId: idRule({ required: true }),
    message: textRule({ max: 1000 }),
  },
  suggestionUpdate: {
    id: idRule({ required: true }),
    status: textRule({ enum: ["PENDING", "ACCEPTED", "REJECTED", "EXPIRED"] }),
  },
}

function validateRule(value, rule, partial) {
  const empty = isBlank(value) || (rule.type === "array" && (!Array.isArray(value) || value.length === 0))

  if (empty) {
    if (rule.required && !partial) return validationMessages.required
    return null
  }

  if (rule.type === "text" || rule.type === "id" || rule.type === "string") {
    if (typeof value !== "string") return validationMessages.invalidId
    const text = value.trim()
    if (rule.type === "id" && text.length === 0) return validationMessages.invalidId
    if (rule.min && text.length < rule.min) return validationMessages.tooShort(rule.min)
    if (rule.max && text.length > rule.max) return validationMessages.tooLong(rule.max)
    if (rule.email && !EMAIL_PATTERN.test(text)) return validationMessages.invalidEmail
    if (rule.phone && !PHONE_PATTERN.test(text)) return validationMessages.invalidPhone
    if (rule.password && !/^(?=.*[A-Za-z])(?=.*\d).{8,128}$/.test(text)) return validationMessages.password
    if (rule.enum && !rule.enum.includes(text)) return validationMessages.invalidChoice
    return null
  }

  if (rule.type === "number") {
    const number = typeof value === "number" ? value : Number(String(value).trim())
    if (!Number.isFinite(number)) return validationMessages.invalidNumber
    if (rule.integer && !Number.isInteger(number)) return validationMessages.invalidInteger
    if (rule.min !== undefined && (number < rule.min || number > rule.max)) {
      return validationMessages.outOfRange(rule.min, rule.max)
    }
    return null
  }

  if (rule.type === "array") {
    if (!Array.isArray(value)) return validationMessages.invalidArray
    if (rule.min && value.length < rule.min) return validationMessages.invalidArray
    if (rule.max && value.length > rule.max) return validationMessages.tooLong(rule.max)
    if (rule.item) {
      for (const item of value) {
        const itemError = validateRule(item, rule.item, false)
        if (itemError) return itemError
      }
    }
    return null
  }

  if (rule.type === "object" && (typeof value !== "object" || Array.isArray(value))) {
    return validationMessages.invalidChoice
  }

  return null
}

/**
 * Validate a payload with one of the shared schemas. The same function is safe
 * to call from browser forms and API routes so client and server rules cannot drift.
 */
export function validateForm(values = {}, schema, options = {}) {
  const partial = options.partial === true
  const errors = {}
  const data = {}

  Object.keys(schema).forEach((field) => {
    const value = values[field]
    const error = validateRule(value, schema[field], partial)
    if (error) {
      errors[field] = error
      return
    }

    if (typeof value === "string") data[field] = value.trim()
    else if (schema[field].type === "number" && !isBlank(value)) data[field] = Number(value)
    else if (schema[field].type === "array" && Array.isArray(value)) data[field] = value.map((item) => (typeof item === "string" ? item.trim() : item))
    else if (value !== undefined) data[field] = value
  })

  if (values && typeof values === "object") {
    Object.keys(values).forEach((key) => {
      if (!(key in schema) && values[key] !== undefined) {
        data[key] = typeof values[key] === "string" ? values[key].trim() : values[key]
      }
    })
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    data,
  }
}

export function validateSchema(values, schemaName, options = {}) {
  const schema = validationSchemas[schemaName]
  if (!schema) throw new Error(`Unknown validation schema: ${schemaName}`)
  return validateForm(values, schema, options)
}

export function sendValidationError(res, errors) {
  return res.status(400).json({
    error: "Validation failed",
    message: {
      en: "Please correct the highlighted fields and try again.",
      mr: "कृपया दाखवलेली क्षेत्रे दुरुस्त करून पुन्हा प्रयत्न करा.",
    },
    errors,
  })
}

export function firstValidationMessage(error) {
  if (!error) return ""
  if (typeof error === "string") return error
  return `${error.en} ${error.mr}`
}

export function getErrorMessage(payload, fallback = "Something went wrong. / काहीतरी चूक झाली.") {
  if (!payload) return fallback
  if (typeof payload.error === "string" && payload.error !== "Validation failed") return payload.error
  if (payload.message && typeof payload.message === "object") return `${payload.message.en} ${payload.message.mr}`
  return fallback
}
