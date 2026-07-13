export interface User {
  id: number
  name: string
  student_id: string
  email: string
  generation: number
  part: string
  role: 'MEMBER' | 'ADMIN'
  is_active: boolean
  created_at: string
}

export interface BoardCategory {
  id: number
  key: string
  name: string
  admin_only: boolean
  order: number
}

export interface UploadResult {
  url: string
  filename: string
  content_type: string
  size: number
}

export interface Attachment extends UploadResult {
  id: number
}

export interface Post {
  id: number
  title: string
  content: string
  board_type: string
  view_count: number
  is_closed: boolean
  created_at: string
  updated_at: string
  author: User
  comment_count?: number
  attachments?: Attachment[]
}

export interface Comment {
  id: number
  post_id: number
  content: string
  is_adopted: boolean
  created_at: string
  author: User
}

export interface Event {
  id: number
  title: string
  description: string | null
  event_date: string
  location: string | null
  created_at: string
  creator: User
}

export interface Attendance {
  id: number
  event_id: number
  checked_at: string
  user: User
}

export interface AttendanceStats {
  total_events: number
  attended_events: number
  attendance_rate: number
}

export interface ProjectMember {
  user: User
  role: string | null
}

export interface Project {
  id: number
  title: string
  description: string | null
  generation: number | null
  tech_stack: string | null
  github_url: string | null
  demo_url: string | null
  thumbnail_url: string | null
  created_at: string
  updated_at: string
  members: ProjectMember[]
}

export interface AssignmentFile extends UploadResult {
  id: number
}

export interface AssignmentListItem {
  id: number
  title: string
  start_at: string
  end_at: string
  created_at: string
  author: User
}

export interface Assignment extends AssignmentListItem {
  content: string
  updated_at: string
  files: AssignmentFile[]
}

export type Grade = 'PASS' | 'FAIL'

export interface SubmissionListItem {
  id: number
  assignment_id: number
  title: string
  is_final: boolean
  grade: Grade | null
  submitted_at: string | null
  created_at: string
  comment_count: number
  user: User
}

export interface Submission extends SubmissionListItem {
  content: string
  attachment_url: string | null
  attachment_filename: string | null
  attachment_content_type: string | null
  attachment_size: number | null
  updated_at: string
}

export interface SubmissionComment {
  id: number
  submission_id: number
  content: string
  attachment_url: string | null
  attachment_filename: string | null
  attachment_content_type: string | null
  attachment_size: number | null
  created_at: string
  author: User
}

export interface AssignmentQuestionListItem {
  id: number
  assignment_id: number
  title: string
  is_answered: boolean
  comment_count: number
  created_at: string
  author: User
}

export interface AssignmentQuestion extends AssignmentQuestionListItem {
  content: string
}

export interface AssignmentQuestionComment {
  id: number
  question_id: number
  content: string
  created_at: string
  author: User
}

export interface CalendarItem {
  id: number
  title: string
  memo: string | null
  item_date: string
  is_done: boolean
  created_at: string
  author: User
}
