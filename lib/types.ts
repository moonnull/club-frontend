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

export interface Post {
  id: number
  title: string
  content: string
  board_type: 'NOTICE' | 'FREE' | 'QNA' | 'RECRUIT'
  view_count: number
  is_closed: boolean
  created_at: string
  updated_at: string
  author: User
  comment_count?: number
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
